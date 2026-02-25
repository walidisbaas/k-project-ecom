import { captureScreenshot } from "@/lib/scraper/extract";
import { firecrawl } from "@/lib/firecrawl/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { openrouter, PREVIEW_MODEL } from "@/lib/openrouter/client";
import { buildTemplateGenerationPrompt } from "@/lib/openrouter/prompts";
import * as cheerio from "cheerio";
import type { Json, WebsitePage, StorePolicies } from "@/types";

const SUPPORTED_LANGUAGES = ["en", "nl", "de", "fr", "es"] as const;

/**
 * Detect the primary language of a page from its headline/opening text.
 * Uses a lightweight LLM call on the first ~500 chars.
 */
async function detectLanguage(markdown: string): Promise<string> {
  const snippet = markdown.slice(0, 500);
  try {
    const response = await openrouter.chat.completions.create({
      model: PREVIEW_MODEL,
      messages: [
        {
          role: "user",
          content: `What language is this text written in? Reply with ONLY the language code: en, nl, de, fr, or es.\n\n${snippet}`,
        },
      ],
      temperature: 0,
      max_tokens: 5,
    });
    const code = (response.choices[0]?.message.content ?? "en").trim().toLowerCase();
    return SUPPORTED_LANGUAGES.includes(code as typeof SUPPORTED_LANGUAGES[number]) ? code : "en";
  } catch {
    return "en";
  }
}

const POLICY_KEYWORDS = [
  "shipping", "return", "refund", "policy", "faq",
  "trade", "warranty", "guarantee", "exchange",
];

function isPolicyUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return POLICY_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Four-level pipeline — each level saves to DB as soon as it finishes.
 *
 * Level 1:   Screenshot + favicon  (~3-5s) — awaited, saved immediately
 * Level 2:   Landing + templates   (~5-10s) — awaited, saves website_pages + scrape_data.templates
 * Level 2.5: Policy footer links + AI policy extraction (~5-12s) — awaited with 12s timeout
 * Level 3:   Remaining footer + products (~15-30s) — fire-and-forget, best-effort enrichment
 *
 * Called inside after() from the scrape route, so Vercel keeps the function alive.
 * scrape_status is set to "complete" only after Level 2.5 finishes (or times out).
 */
export async function scrapeAndSaveToStore(
  storeId: string,
  websiteUrl: string
): Promise<void> {
  const baseUrl = websiteUrl.replace(/\/$/, "");

  await supabaseAdmin
    .from("stores")
    .update({ scrape_status: "scraping" })
    .eq("id", storeId);

  try {
    // ── Level 1 + Level 2: run in parallel ───────────────────
    const [screenshotResult, landingResult, faviconResult] = await Promise.allSettled([
      captureScreenshot(websiteUrl),
      firecrawl.scrape(baseUrl, { formats: ["markdown", "rawHtml"] }),
      fetchFavicon(baseUrl),
    ]);

    // ── Level 1: Save screenshot + favicon (keep scraping) ───
    const screenshotUrl =
      screenshotResult.status === "fulfilled" ? screenshotResult.value : null;
    const faviconUrl =
      faviconResult.status === "fulfilled" ? faviconResult.value : null;

    await supabaseAdmin
      .from("stores")
      .update({
        scrape_data: { screenshot_url: screenshotUrl, favicon_url: faviconUrl } as unknown as Json,
      })
      .eq("id", storeId);

    // ── Level 2: Save landing page + generate templates ──────
    let landingPage: WebsitePage | null = null;
    let footerHtml = "";

    if (landingResult.status === "fulfilled") {
      const result = landingResult.value;
      const md = (result.markdown ?? "").slice(0, 15000);

      if (md.length > 0) {
        landingPage = {
          url: result.metadata?.sourceURL ?? baseUrl,
          title: result.metadata?.title ?? "",
          markdown: md,
        };
      }
      footerHtml = result.rawHtml ?? "";
    } else {
      console.error("[crawl] Landing page scrape failed:", {
        error:
          landingResult.reason instanceof Error
            ? landingResult.reason.message
            : "unknown",
      });
    }

    if (landingPage) {
      // Detect language from landing page headline
      const language = await detectLanguage(landingPage.markdown);

      // Save landing page + language to DB immediately
      await supabaseAdmin
        .from("stores")
        .update({
          website_pages: [landingPage] as unknown as Json,
          primary_language: language,
        })
        .eq("id", storeId);

      // Generate templates — must complete before function exits
      await generateAndCacheTemplates(storeId, [landingPage], language);
    }

    // ── Level 2.5: Policy footer links + AI extraction (12s timeout) ──
    const policyLinksScraped = new Set<string>();

    if (landingPage && footerHtml) {
      const footerLinks = extractFooterLinks(footerHtml, baseUrl);
      const policyLinks = footerLinks.filter(isPolicyUrl);
      policyLinks.forEach((url) => policyLinksScraped.add(url));

      if (policyLinks.length > 0) {
        const extractWithTimeout = async () => {
          // Scrape policy pages
          const policyPages: WebsitePage[] = [];
          const results = await Promise.allSettled(
            policyLinks.map(async (url) => {
              const result = await firecrawl.scrape(url, { formats: ["markdown"] });
              const md = (result.markdown ?? "").slice(0, 15000);
              if (md.length === 0) return null;
              return {
                url: result.metadata?.sourceURL ?? url,
                title: result.metadata?.title ?? "",
                markdown: md,
              } satisfies WebsitePage;
            })
          );
          for (const r of results) {
            if (r.status === "fulfilled" && r.value) policyPages.push(r.value);
          }

          // Merge policy pages into website_pages
          if (policyPages.length > 0) {
            const { data: current } = await supabaseAdmin
              .from("stores")
              .select("website_pages")
              .eq("id", storeId)
              .single();

            const existing = (current?.website_pages ?? []) as WebsitePage[];
            const merged = [...existing, ...policyPages];

            await supabaseAdmin
              .from("stores")
              .update({ website_pages: merged as unknown as Json })
              .eq("id", storeId);
          }

          // Extract policies via AI
          const allPages = [landingPage!, ...policyPages];
          const storePolicies = await extractPoliciesFromPages(allPages);

          if (storePolicies) {
            await supabaseAdmin
              .from("stores")
              .update({ store_policies: storePolicies as unknown as Json })
              .eq("id", storeId);
          }
        };

        try {
          await Promise.race([
            extractWithTimeout(),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("policy-extraction-timeout")), 12_000)
            ),
          ]);
        } catch (err) {
          console.error("[scrapeAndSaveToStore] Policy extraction timed out or failed:", {
            storeId,
            error: err instanceof Error ? err.message : "unknown",
          });
        }
      }
    }

    // ── Mark scrape as complete ──────────────────────────────
    await supabaseAdmin
      .from("stores")
      .update({ scrape_status: "complete", onboarding_step: 2 })
      .eq("id", storeId);

    // ── Level 3: Remaining footer + products — fire-and-forget ──
    if (landingPage && footerHtml) {
      scrapeExtraPages(storeId, baseUrl, footerHtml, policyLinksScraped).catch((err) => {
        console.error("[scrapeAndSaveToStore] Extra page scrape failed:", {
          storeId,
          error: err instanceof Error ? err.message : "unknown",
        });
      });
    }
  } catch (error) {
    console.error("[scrapeAndSaveToStore] Failed:", {
      storeId,
      websiteUrl,
      error: error instanceof Error ? error.message : "unknown",
    });

    await supabaseAdmin
      .from("stores")
      .update({ scrape_status: "failed" })
      .eq("id", storeId);

    throw error;
  }
}

/**
 * Level 3: Scrape footer links + products.json, append to website_pages.
 * Best-effort — if Vercel kills the function, Level 1+2 data is already saved.
 */
async function scrapeExtraPages(
  storeId: string,
  baseUrl: string,
  footerHtml: string,
  skipUrls?: Set<string>
): Promise<void> {
  const extraPages: WebsitePage[] = [];
  const footerLinks = extractFooterLinks(footerHtml, baseUrl)
    .filter((url) => !skipUrls?.has(url));

  // Scrape footer links + fetch products.json in parallel
  const [footerResults] = await Promise.allSettled([
    footerLinks.length > 0
      ? Promise.allSettled(
          footerLinks.map(async (url) => {
            const result = await firecrawl.scrape(url, {
              formats: ["markdown"],
            });
            const md = (result.markdown ?? "").slice(0, 15000);
            if (md.length === 0) return null;
            return {
              url: result.metadata?.sourceURL ?? url,
              title: result.metadata?.title ?? "",
              markdown: md,
            } satisfies WebsitePage;
          })
        )
      : Promise.resolve([]),
    fetchProductsJson(baseUrl).then((page) => {
      if (page) extraPages.push(page);
    }),
  ]);

  if (footerResults.status === "fulfilled" && Array.isArray(footerResults.value)) {
    for (const r of footerResults.value) {
      if (r.status === "fulfilled" && r.value) {
        extraPages.push(r.value);
      }
    }
  }

  // Append extra pages to website_pages (read-merge-write)
  if (extraPages.length > 0) {
    const { data: current } = await supabaseAdmin
      .from("stores")
      .select("website_pages")
      .eq("id", storeId)
      .single();

    const existing = (current?.website_pages ?? []) as WebsitePage[];
    const merged = [...existing, ...extraPages];

    await supabaseAdmin
      .from("stores")
      .update({ website_pages: merged as unknown as Json })
      .eq("id", storeId);
  }
}

/**
 * Fetch /products.json (Shopify stores) and return as a WebsitePage.
 */
async function fetchProductsJson(baseUrl: string): Promise<WebsitePage | null> {
  try {
    const res = await fetch(`${baseUrl}/products.json`, {
      headers: { "User-Agent": "Kenso-AI/1.0" },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as {
      products?: Array<{
        title?: string;
        body_html?: string;
        product_type?: string;
        variants?: Array<{ title?: string; price?: string }>;
      }>;
    };

    if (!data.products || data.products.length === 0) return null;

    const md = data.products
      .slice(0, 50)
      .map((p) => {
        const desc = (p.body_html ?? "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const variants = (p.variants ?? [])
          .map((v) => `${v.title ?? "Default"}: ${v.price ?? "N/A"}`)
          .join(", ");
        return `### ${p.title ?? "Untitled"}\n${desc}${p.product_type ? `\nCategory: ${p.product_type}` : ""}${variants ? `\nPrices: ${variants}` : ""}`;
      })
      .join("\n\n");

    if (md.length === 0) return null;

    return {
      url: `${baseUrl}/products.json`,
      title: "Product Catalog",
      markdown: md.slice(0, 15000),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch the site's favicon URL. Tries common paths and <link> tag parsing.
 * Returns an absolute URL string, or null if none found.
 */
async function fetchFavicon(baseUrl: string): Promise<string | null> {
  // 1. Try fetching the homepage HTML and parsing <link rel="icon"> tags
  try {
    const res = await fetch(baseUrl, {
      headers: { "User-Agent": "Kenso-AI/1.0" },
      signal: AbortSignal.timeout(5000),
      redirect: "follow",
    });

    if (res.ok) {
      const html = await res.text();
      const $ = cheerio.load(html);

      // Look for link tags with icon rels
      const iconLink = $('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').first();
      const href = iconLink.attr("href");

      if (href) {
        try {
          const absolute = new URL(href, baseUrl).href;
          // Verify it's reachable
          const check = await fetch(absolute, {
            method: "HEAD",
            signal: AbortSignal.timeout(3000),
            redirect: "follow",
          });
          if (check.ok) return absolute;
        } catch {
          // fall through to /favicon.ico
        }
      }
    }
  } catch {
    // fall through
  }

  // 2. Fallback: try /favicon.ico directly
  try {
    const faviconUrl = `${baseUrl}/favicon.ico`;
    const res = await fetch(faviconUrl, {
      method: "HEAD",
      headers: { "User-Agent": "Kenso-AI/1.0" },
      signal: AbortSignal.timeout(3000),
      redirect: "follow",
    });
    if (res.ok) return faviconUrl;
  } catch {
    // no favicon found
  }

  return null;
}

/**
 * Generate 3 personalized template chips from website content and cache them.
 */
async function generateAndCacheTemplates(
  storeId: string,
  pages: WebsitePage[],
  language = "en"
): Promise<void> {
  try {
    const { data: store } = await supabaseAdmin
      .from("stores")
      .select("store_name, scrape_data")
      .eq("id", storeId)
      .single();

    if (!store) return;

    // Already cached — skip
    const scrapeData = (store.scrape_data ?? {}) as Record<string, unknown>;
    if (Array.isArray(scrapeData.templates) && scrapeData.templates.length > 0) return;

    const prompt = buildTemplateGenerationPrompt(store.store_name, pages, language);

    const response = await openrouter.chat.completions.create({
      model: PREVIEW_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 800,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message.content;
    if (!content) return;

    let parsed: unknown;
    try { parsed = JSON.parse(content); } catch { return; }

    let templates: Array<{ label: string; email: string }>;
    if (Array.isArray(parsed)) {
      templates = parsed;
    } else if (typeof parsed === "object" && parsed !== null) {
      const arr = Object.values(parsed as Record<string, unknown>).find(Array.isArray);
      if (!arr) return;
      templates = arr as Array<{ label: string; email: string }>;
    } else {
      return;
    }

    templates = templates
      .filter((t) => typeof t.label === "string" && typeof t.email === "string" && t.label.length > 0 && t.email.length > 0)
      .slice(0, 3);

    if (templates.length === 0) return;

    await supabaseAdmin
      .from("stores")
      .update({
        scrape_data: { ...scrapeData, templates } as unknown as Json,
      })
      .eq("id", storeId);
  } catch (err) {
    console.error("[generateAndCacheTemplates] Failed:", {
      storeId,
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}

/**
 * Extract store policies from scraped pages using AI.
 * Returns null if no policy content is found.
 */
async function extractPoliciesFromPages(
  pages: WebsitePage[]
): Promise<StorePolicies | null> {
  const policyContent = pages
    .filter((p) => {
      const url = p.url.toLowerCase();
      const title = p.title.toLowerCase();
      return POLICY_KEYWORDS.some((kw) => url.includes(kw) || title.includes(kw));
    })
    .map((p) => p.markdown)
    .join("\n\n---\n\n")
    .slice(0, 15000);

  // Also include the landing page markdown as context even if it doesn't match keywords
  const landingMd = pages[0]?.markdown ?? "";
  const context = [
    policyContent ? `POLICY PAGES:\n${policyContent}` : "",
    landingMd && !policyContent.includes(landingMd)
      ? `LANDING PAGE:\n${landingMd.slice(0, 5000)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  if (!context.trim()) return null;

  try {
    const response = await openrouter.chat.completions.create({
      model: PREVIEW_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You analyze ecommerce store policies and extract structured configuration data. Return ONLY valid JSON, no markdown or explanation.",
        },
        {
          role: "user",
          content: `Analyze this store's policies and extract the following settings. Pick the CLOSEST matching option for each field.

STORE POLICY CONTENT:
${context}

Extract as JSON with these exact fields:
{
  "shipping_days": <closest match from [1, 2, 7, 14] based on their typical delivery timeframe>,
  "response_interval_hours": <closest match from [1, 2, 4, 8] based on their stated response time, default 4>,
  "trade_ins_enabled": <true if they accept trade-ins or old items, false otherwise>,
  "receive_old_items": <true if they receive old/used items back, false otherwise>,
  "average_cogs": <estimated cost of goods if mentioned, default 10>,
  "prevent_refunds": <true if they try to avoid giving refunds or have strict no-refund policy, false if they offer easy refunds>,
  "offer_vouchers": <true if they offer store credit/vouchers as refund alternative>,
  "offer_partial_refunds": <true if they offer partial refunds>,
  "partial_refund_percentage": <closest match from [10, 20, 30], default 20>
}

If you can't determine a value, use these defaults:
- shipping_days: 7
- response_interval_hours: 4
- trade_ins_enabled: false
- receive_old_items: false
- average_cogs: 10
- prevent_refunds: false
- offer_vouchers: false
- offer_partial_refunds: false
- partial_refund_percentage: 20`,
        },
      ],
      temperature: 0.2,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message.content;
    if (!content) return null;

    const parsed = JSON.parse(content) as Partial<StorePolicies>;

    const SHIPPING_OPTIONS = [1, 2, 7, 14];
    const RESPONSE_OPTIONS = [1, 2, 4, 8];
    const REFUND_OPTIONS = [10, 20, 30];

    const closest = (val: number | undefined, opts: number[], def: number) => {
      if (val === undefined) return def;
      return opts.reduce((a, b) =>
        Math.abs(b - val) < Math.abs(a - val) ? b : a
      );
    };

    return {
      shipping_days: closest(parsed.shipping_days, SHIPPING_OPTIONS, 7),
      response_interval_hours: closest(
        parsed.response_interval_hours,
        RESPONSE_OPTIONS,
        4
      ),
      trade_ins_enabled: parsed.trade_ins_enabled ?? false,
      receive_old_items: parsed.receive_old_items ?? false,
      average_cogs: Math.max(0, Math.min(100000, parsed.average_cogs ?? 10)),
      prevent_refunds: parsed.prevent_refunds ?? false,
      offer_vouchers: parsed.offer_vouchers ?? false,
      offer_partial_refunds: parsed.offer_partial_refunds ?? false,
      partial_refund_percentage: closest(
        parsed.partial_refund_percentage,
        REFUND_OPTIONS,
        20
      ),
    };
  } catch (err) {
    console.error("[extractPoliciesFromPages] AI extraction failed:", {
      error: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}

/**
 * Parse HTML to extract internal links from <footer>.
 */
function extractFooterLinks(html: string, baseUrl: string): string[] {
  if (!html) return [];

  const $ = cheerio.load(html);
  const hostname = new URL(baseUrl).hostname;
  const seen = new Set<string>();
  const links: string[] = [];

  $("footer a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    let absolute: string;
    try {
      absolute = new URL(href, baseUrl).href;
    } catch {
      return;
    }

    // Internal links only, skip anchors/mailto/tel
    const parsed = new URL(absolute);
    if (parsed.hostname !== hostname) return;
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return;

    // Skip landing page itself
    const clean = parsed.origin + parsed.pathname.replace(/\/$/, "");
    if (clean === baseUrl.replace(/\/$/, "")) return;

    if (!seen.has(clean)) {
      seen.add(clean);
      links.push(clean);
    }
  });

  return links.slice(0, 8);
}
