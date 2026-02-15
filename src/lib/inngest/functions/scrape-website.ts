import { inngest } from "@/lib/inngest/client";
import { scrapeAndSaveToStore } from "@/lib/scraper/scrape-and-save";
import { scrapeAndExtract } from "@/lib/scraper/extract";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Inngest function: scrape a store's website and populate the store record
 * with brand voice, policies, and FAQs extracted by GPT-4o-mini.
 *
 * Delegates to scrapeAndSaveToStore for the core logic.
 * onFailure ensures scrape_status is set to "failed" when all retries are exhausted.
 */
export const scrapeWebsiteFn = inngest.createFunction(
  {
    id: "scrape-website",
    name: "Scrape Store Website",
    retries: 2,
    onFailure: async ({ event }) => {
      const storeId = event.data.event.data.store_id as string | undefined;
      if (storeId) {
        await supabaseAdmin
          .from("stores")
          .update({ scrape_status: "failed" })
          .eq("id", storeId);
      }
    },
  },
  { event: "store/scrape-website" },
  async ({ event }) => {
    const { store_id, website_url } = event.data;
    await scrapeAndSaveToStore(store_id, website_url);
    return { store_id };
  }
);

/**
 * Inngest function: scrape website for a lead (before signup).
 * Saves scrape data to leads table and sends magic link email.
 */
export const scrapeLeadWebsiteFn = inngest.createFunction(
  {
    id: "scrape-lead-website",
    name: "Scrape Lead Website",
    retries: 2,
  },
  { event: "lead/scrape-website" },
  async ({ event, step }) => {
    const { lead_id, email, website_url } = event.data;

    // Step 1: Update scrape status
    await step.run("set-scraping-status", async () => {
      await supabaseAdmin
        .from("leads")
        .update({ scrape_status: "scraping" })
        .eq("id", lead_id);
    });

    // Step 2: Scrape + extract
    const extracted = await step.run("scrape-and-extract", () =>
      scrapeAndExtract(website_url)
    );

    // Step 3: Save to lead record
    await step.run("save-to-lead", async () => {
      await supabaseAdmin
        .from("leads")
        .update({
          scrape_status: "complete",
          scrape_data: extracted as unknown as import("@/types").Json,
        })
        .eq("id", lead_id);
    });

    // Step 4: Fire magic link email event
    await step.sendEvent("send-magic-link", {
      name: "lead/send-magic-link",
      data: {
        lead_id,
        email,
        token: "", // Will be read from DB
        website_url,
      },
    });

    return { lead_id, faqs_found: extracted.faqs.length };
  }
);
