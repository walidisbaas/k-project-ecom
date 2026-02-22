import { captureScreenshot } from "@/lib/scraper/extract";
import { firecrawl } from "@/lib/firecrawl/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Json, WebsitePage } from "@/types";

/**
 * Capture a screenshot of the store's website and save it.
 * The page crawl for AI context runs in the background — it does NOT
 * block the screenshot or the user's ability to proceed.
 *
 * Sets scrape_status to "scraping" → "complete" once the screenshot is done.
 */
export async function scrapeAndSaveToStore(
  storeId: string,
  websiteUrl: string
): Promise<void> {
  await supabaseAdmin
    .from("stores")
    .update({ scrape_status: "scraping" })
    .eq("id", storeId);

  try {
    // 1. Capture screenshot (this is what the user waits for)
    const screenshotUrl = await captureScreenshot(websiteUrl);

    await supabaseAdmin
      .from("stores")
      .update({
        scrape_status: "complete",
        scrape_data: { screenshot_url: screenshotUrl } as unknown as Json,
        onboarding_step: 2,
      })
      .eq("id", storeId);

    // 2. Crawl pages in the background — fire and forget
    //    User can already proceed; this data is used later in the preview step.
    crawlWebsitePages(websiteUrl).then(async (pages) => {
      if (pages.length > 0) {
        await supabaseAdmin
          .from("stores")
          .update({ website_pages: pages as unknown as Json })
          .eq("id", storeId);
      }
    }).catch((err) => {
      console.error("[scrapeAndSaveToStore] Background crawl failed:", {
        storeId,
        error: err instanceof Error ? err.message : "unknown",
      });
    });
  } catch (error) {
    console.error("[scrapeAndSaveToStore] Screenshot failed:", {
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
 * Crawl up to 6 pages (landing + 5 more) and return raw markdown.
 * Runs in the background after the screenshot is already saved.
 */
async function crawlWebsitePages(
  websiteUrl: string
): Promise<WebsitePage[]> {
  try {
    const crawlResult = await firecrawl.crawl(websiteUrl, {
      limit: 6,
      scrapeOptions: {
        formats: ["markdown"],
      },
    });

    if (
      crawlResult.status === "completed" &&
      crawlResult.data &&
      crawlResult.data.length > 0
    ) {
      return crawlResult.data
        .slice(0, 6)
        .map((page) => ({
          url: page.metadata?.sourceURL ?? page.metadata?.url ?? websiteUrl,
          title: page.metadata?.title ?? "",
          markdown: (page.markdown ?? "").slice(0, 15000),
        }))
        .filter((p) => p.markdown.length > 0);
    }

    return [];
  } catch (err) {
    console.error("[crawlWebsitePages] Firecrawl crawl failed:", {
      error: err instanceof Error ? err.message : "unknown",
    });
    return [];
  }
}
