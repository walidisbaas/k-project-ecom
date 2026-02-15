import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { processEmailFn } from "@/lib/inngest/functions/process-email";
import { scrapeWebsiteFn, scrapeLeadWebsiteFn } from "@/lib/inngest/functions/scrape-website";
import { sendReplyFn } from "@/lib/inngest/functions/send-reply";
import { sendMagicLinkFn, weeklyReportFn } from "@/lib/inngest/functions/send-magic-link";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processEmailFn,
    scrapeWebsiteFn,
    scrapeLeadWebsiteFn,
    sendReplyFn,
    sendMagicLinkFn,
    weeklyReportFn,
  ],
});
