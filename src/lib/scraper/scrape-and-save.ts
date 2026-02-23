import { captureScreenshot } from "@/lib/scraper/extract";
import { firecrawl } from "@/lib/firecrawl/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { openrouter, PREVIEW_MODEL } from "@/lib/openrouter/client";
import { buildTemplateGenerationPrompt } from "@/lib/openrouter/prompts";
import * as cheerio from "cheerio";
import type { Json, WebsitePage } from "@/types";

/**
 * Three-level pipeline — each level saves to DB as soon as it finishes.
 *
 * Level 1: Screenshot        (~3-5s)  — awaited, runs in parallel with Level 2
 * Level 2: Landing + templates (~5-10s) — awaited, saves website_pages + scrape_data.templates
 * Level 3: Footer + products  (~15-30s) — fire-and-forget, best-effort enrichment
 *
 * Called inside after() from the scrape route, so Vercel keeps the function alive.
 * Only Level 1 + 2 must complete; Level 3 is optional.
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
    const [screenshotResult, landingResult] = await Promise.allSettled([
      captureScreenshot(websiteUrl),
      firecrawl.scrape(baseUrl, { formats: ["markdown", "rawHtml"] }),
    ]);

    // ── Level 1: Save screenshot ─────────────────────────────
    const screenshotUrl =
      screenshotResult.status === "fulfilled" ? screenshotResult.value : null;

    await supabaseAdmin
      .from("stores")
      .update({
        scrape_status: "complete",
        scrape_data: { screenshot_url: screenshotUrl } as unknown as Json,
        onboarding_step: 2,
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
      // Save landing page to DB immediately
      await supabaseAdmin
        .from("stores")
        .update({ website_pages: [landingPage] as unknown as Json })
        .eq("id", storeId);

      // Generate templates — must complete before function exits
      await generateAndCacheTemplates(storeId, [landingPage]);
    }

    // ── Level 3: Footer + products — fire-and-forget ─────────
    if (landingPage && footerHtml) {
      scrapeExtraPages(storeId, baseUrl, footerHtml).catch((err) => {
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
  footerHtml: string
): Promise<void> {
  const extraPages: WebsitePage[] = [];
  const footerLinks = extractFooterLinks(footerHtml, baseUrl);

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
 * Generate 3 personalized template chips from website content and cache them.
 */
async function generateAndCacheTemplates(
  storeId: string,
  pages: WebsitePage[]
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

    const prompt = buildTemplateGenerationPrompt(store.store_name, pages);

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
