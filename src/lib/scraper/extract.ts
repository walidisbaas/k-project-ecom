import { firecrawl } from "@/lib/firecrawl/client";
import { openai } from "@/lib/openai/client";
import { buildScrapingExtractionPrompt } from "@/lib/openai/prompts";
import type { ScrapeExtractResult } from "@/types";

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    brand_voice: {
      type: "string",
      description:
        "2-3 sentence description of the brand's tone and communication style",
    },
    company_summary: {
      type: "string",
      description: "1-2 sentences about what they sell and who they are",
    },
    shipping_policy: {
      type: "string",
      description: "Summary of shipping information, costs, timelines",
    },
    return_policy: {
      type: "string",
      description: "Summary of return/refund policy",
    },
    faqs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
        },
        required: ["question", "answer"],
      },
      description: "Up to 15 FAQ items extracted from the website",
    },
    product_categories: {
      type: "array",
      items: { type: "string" },
      description: "List of product categories sold",
    },
    language: {
      type: "string",
      description: "Primary language code (en, nl, de, fr, es)",
    },
  },
  required: [
    "brand_voice",
    "company_summary",
    "shipping_policy",
    "return_policy",
    "faqs",
    "product_categories",
    "language",
  ],
};

const EXTRACT_PROMPT = `Analyze this ecommerce website and extract:
- Brand voice: the tone and communication style (2-3 sentences)
- Company summary: what they sell and who they are (1-2 sentences)
- Shipping policy: shipping costs, methods, and delivery times
- Return policy: return/refund conditions and process
- FAQs: up to 15 frequently asked questions with answers. If no FAQ page exists, generate common ecommerce questions based on the business type.
- Product categories: list of product categories
- Language: the primary language code (en, nl, de, fr, es)

If any information is not found on the website, return null for that field.`;

/**
 * Scrape a website with Firecrawl and extract structured data.
 *
 * Strategy:
 * 1. Primary: Use Firecrawl's built-in extract (LLM extraction in one API call)
 * 2. Fallback: Crawl with Firecrawl + extract with OpenAI GPT-4o-mini
 * 3. Last resort: Basic fetch + OpenAI extraction
 *
 * Screenshot is always captured separately.
 */
export async function scrapeAndExtract(
  websiteUrl: string
): Promise<ScrapeExtractResult> {
  let screenshotUrl: string | null = null;

  // Capture homepage screenshot (runs independently)
  const screenshotPromise = captureScreenshot(websiteUrl);

  // Strategy 1: Firecrawl extract (single API call for crawl + LLM extraction)
  try {
    const extractResult = await firecrawl.extract({
      urls: [websiteUrl],
      prompt: EXTRACT_PROMPT,
      schema: EXTRACT_SCHEMA,
      enableWebSearch: false,
    });

    if (extractResult.success && extractResult.data) {
      const data = extractResult.data as Partial<ScrapeExtractResult>;
      screenshotUrl = await screenshotPromise;

      return {
        brand_voice: data.brand_voice ?? null,
        company_summary: data.company_summary ?? null,
        shipping_policy: data.shipping_policy ?? null,
        return_policy: data.return_policy ?? null,
        faqs: Array.isArray(data.faqs) ? data.faqs.slice(0, 15) : [],
        product_categories: Array.isArray(data.product_categories)
          ? data.product_categories
          : [],
        language: data.language ?? "en",
        screenshot_url: screenshotUrl,
      };
    }
  } catch (err) {
    console.error("[scraper] Firecrawl extract failed, falling back to crawl+OpenAI:", {
      error: err instanceof Error ? err.message : "unknown",
    });
  }

  // Strategy 2: Crawl with Firecrawl + extract with OpenAI
  let rawContent = "";

  try {
    const crawlResult = await firecrawl.crawl(websiteUrl, {
      limit: 20,
      scrapeOptions: {
        formats: ["markdown"],
      },
    });

    if (
      crawlResult.status === "completed" &&
      crawlResult.data &&
      crawlResult.data.length > 0
    ) {
      rawContent = crawlResult.data
        .map((page) => page.markdown ?? "")
        .filter(Boolean)
        .join("\n\n---\n\n");
    }
  } catch (err) {
    console.error("[scraper] Firecrawl crawl failed, falling back to fetch:", {
      error: err instanceof Error ? err.message : "unknown",
    });
  }

  // Strategy 3: Basic fetch fallback
  if (!rawContent) {
    rawContent = await basicFetch(websiteUrl);
  }

  screenshotUrl = await screenshotPromise;

  if (!rawContent) {
    return { ...getDefaultResult(), screenshot_url: screenshotUrl };
  }

  // Extract with OpenAI GPT-4o-mini
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: buildScrapingExtractionPrompt(rawContent),
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 4096,
    });

    const content = response.choices[0]?.message.content;
    if (!content) return { ...getDefaultResult(), screenshot_url: screenshotUrl };

    const extracted = JSON.parse(content) as Partial<ScrapeExtractResult>;
    return {
      brand_voice: extracted.brand_voice ?? null,
      company_summary: extracted.company_summary ?? null,
      shipping_policy: extracted.shipping_policy ?? null,
      return_policy: extracted.return_policy ?? null,
      faqs: Array.isArray(extracted.faqs) ? extracted.faqs : [],
      product_categories: Array.isArray(extracted.product_categories)
        ? extracted.product_categories
        : [],
      language: extracted.language ?? "en",
      screenshot_url: screenshotUrl,
    };
  } catch (err) {
    console.error("[scraper] OpenAI extraction failed:", {
      error: err instanceof Error ? err.message : "unknown",
    });
    return { ...getDefaultResult(), screenshot_url: screenshotUrl };
  }
}

/**
 * Capture a homepage screenshot via Firecrawl scrape.
 */
export async function captureScreenshot(websiteUrl: string): Promise<string | null> {
  try {
    const scrapeResult = await firecrawl.scrape(websiteUrl, {
      formats: ["screenshot"],
    });
    return scrapeResult.screenshot ?? null;
  } catch (err) {
    console.error("[scraper] Screenshot capture failed:", {
      error: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}

/**
 * Basic HTML fetch fallback — tries homepage and common pages.
 */
async function basicFetch(baseUrl: string): Promise<string> {
  const paths = ["", "/about", "/faq", "/shipping", "/returns", "/policies"];
  const contents: string[] = [];

  for (const path of paths) {
    try {
      const url = baseUrl.replace(/\/$/, "") + path;
      const response = await fetch(url, {
        headers: { "User-Agent": "Kenso-AI/1.0 (website scraper)" },
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const html = await response.text();
        // Strip HTML tags — very basic
        const text = html
          .replace(new RegExp("<script[^>]*>.*?</script>", "gis"), "")
          .replace(new RegExp("<style[^>]*>.*?</style>", "gis"), "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        contents.push(text.slice(0, 5000)); // 5k chars per page
      }
    } catch {
      // Skip failed pages
    }
  }

  return contents.join("\n\n---\n\n");
}

function getDefaultResult(): ScrapeExtractResult {
  return {
    brand_voice: null,
    company_summary: null,
    shipping_policy: null,
    return_policy: null,
    faqs: [],
    product_categories: [],
    language: "en",
    screenshot_url: null,
  };
}
