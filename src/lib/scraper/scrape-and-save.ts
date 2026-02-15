import { captureScreenshot } from "@/lib/scraper/extract";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Json } from "@/types";

/**
 * Capture a screenshot of the store's website and save it to the database.
 * Used by both the `after()` callbacks in API routes and the Inngest function.
 *
 * Sets scrape_status to "scraping" at start, "complete" on success, "failed" on error.
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
    const screenshotUrl = await captureScreenshot(websiteUrl);

    await supabaseAdmin
      .from("stores")
      .update({
        scrape_status: "complete",
        scrape_data: { screenshot_url: screenshotUrl } as unknown as Json,
        onboarding_step: 2,
      })
      .eq("id", storeId);
  } catch (error) {
    console.error("[scrapeAndSaveToStore] Screenshot capture failed:", {
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
