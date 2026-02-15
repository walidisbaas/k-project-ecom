import { inngest } from "@/lib/inngest/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resend, FROM_EMAIL } from "@/lib/resend/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://senro.co";

/**
 * Inngest function: send the magic link email after scraping completes.
 */
export const sendMagicLinkFn = inngest.createFunction(
  {
    id: "send-magic-link",
    name: "Send Magic Link Email",
    retries: 3,
  },
  { event: "lead/send-magic-link" },
  async ({ event, step }) => {
    const { lead_id, email } = event.data;

    // Fetch lead from DB to get token + scrape data
    const lead = await step.run("fetch-lead", async () => {
      const { data } = await supabaseAdmin
        .from("leads")
        .select("*")
        .eq("id", lead_id)
        .single();
      return data;
    });

    if (!lead || !lead.magic_link_token) {
      return { error: "Lead or token not found" };
    }

    const scrapeData = lead.scrape_data as {
      company_summary?: string | null;
      brand_voice?: string | null;
      shipping_policy?: string | null;
      return_policy?: string | null;
      faqs?: Array<{ question: string; answer: string }>;
    } | null;

    const faqCount = scrapeData?.faqs?.length ?? 0;
    const magicLink = `${APP_URL}/magic-link?token=${lead.magic_link_token}`;

    await step.run("send-email", async () => {
      await resend.emails.send({
        from: `Kenso AI <${FROM_EMAIL}>`,
        to: email,
        subject: `Your AI support preview is ready`,
        html: buildMagicLinkEmail({
          magicLink,
          faqCount,
          brandVoice: scrapeData?.brand_voice ?? null,
          shippingSummary: scrapeData?.shipping_policy ?? null,
          returnSummary: scrapeData?.return_policy ?? null,
        }),
      });
    });

    return { sent: true, lead_id };
  }
);

/**
 * Inngest cron: send weekly performance email to all active merchants.
 * Runs every Monday at 9am UTC.
 */
export const weeklyReportFn = inngest.createFunction(
  {
    id: "weekly-performance-report",
    name: "Weekly Performance Report",
  },
  { cron: "0 9 * * 1" }, // Monday 9am UTC
  async ({ step }) => {
    const merchants = await step.run("fetch-merchants", async () => {
      const { data } = await supabaseAdmin
        .from("merchants")
        .select("id, email, name")
        .in("plan", ["starter", "growth"]);
      return data ?? [];
    });

    let sent = 0;
    for (const merchant of merchants) {
      await step.run(`send-report-${merchant.id}`, async () => {
        // Get stats for this merchant's stores this week
        const weekAgo = new Date(
          Date.now() - 7 * 24 * 60 * 60 * 1000
        ).toISOString();

        const { data: logs } = await supabaseAdmin
          .from("email_logs")
          .select("auto_sent, escalated")
          .gte("created_at", weekAgo)
          .in(
            "store_id",
            (
              await supabaseAdmin
                .from("stores")
                .select("id")
                .eq("merchant_id", merchant.id)
            ).data?.map((s: { id: string }) => s.id) ?? []
          );

        if (!logs || logs.length === 0) return;

        const total = logs.length;
        const autoSent = logs.filter((l: { auto_sent: boolean }) => l.auto_sent).length;
        const autoRate = total > 0 ? Math.round((autoSent / total) * 100) : 0;
        const hoursSaved = Math.round((total * 3) / 60); // 3 min per email

        await resend.emails.send({
          from: `Kenso AI <${FROM_EMAIL}>`,
          to: merchant.email,
          subject: `Your Kenso weekly summary — ${total} emails handled`,
          html: buildWeeklyReportEmail({
            name: merchant.name ?? "there",
            total,
            autoRate,
            hoursSaved,
            dashboardUrl: `${APP_URL}/dashboard`,
          }),
        });

        sent++;
      });
    }

    return { merchants_emailed: sent };
  }
);

// ── Email Templates ───────────────────────────────────────

function buildMagicLinkEmail({
  magicLink,
  faqCount,
  brandVoice,
  shippingSummary,
  returnSummary,
}: {
  magicLink: string;
  faqCount: number;
  brandVoice: string | null;
  shippingSummary: string | null;
  returnSummary: string | null;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 580px; margin: 0 auto; padding: 40px 20px; color: #111827; background: #fff;">
  <h1 style="font-size: 24px; font-weight: 700; margin-bottom: 8px;">Your AI support preview is ready 🎉</h1>
  <p style="color: #6B7280; margin-bottom: 32px;">We've analyzed your website. Here's what Kenso learned:</p>

  ${brandVoice ? `<div style="background: #F9FAFB; border-left: 3px solid #2563EB; padding: 16px; margin-bottom: 16px; border-radius: 4px;">
    <p style="font-weight: 600; margin: 0 0 4px;">Brand voice detected</p>
    <p style="color: #374151; margin: 0; font-size: 14px;">${brandVoice}</p>
  </div>` : ""}

  ${shippingSummary ? `<div style="background: #F9FAFB; border-left: 3px solid #10B981; padding: 16px; margin-bottom: 16px; border-radius: 4px;">
    <p style="font-weight: 600; margin: 0 0 4px;">Shipping policy</p>
    <p style="color: #374151; margin: 0; font-size: 14px;">${shippingSummary.slice(0, 200)}...</p>
  </div>` : ""}

  ${faqCount > 0 ? `<p style="margin-bottom: 24px;"><strong>${faqCount} FAQs</strong> found — Kenso will use these to answer customer questions automatically.</p>` : ""}

  <a href="${magicLink}" style="display: inline-block; background: #2563EB; color: #fff; font-weight: 600; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; margin-bottom: 32px;">Complete setup →</a>

  <p style="color: #9CA3AF; font-size: 12px;">This link expires in 7 days. If you didn't request this, ignore this email.</p>
</body>
</html>`;
}

function buildWeeklyReportEmail({
  name,
  total,
  autoRate,
  hoursSaved,
  dashboardUrl,
}: {
  name: string;
  total: number;
  autoRate: number;
  hoursSaved: number;
  dashboardUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 580px; margin: 0 auto; padding: 40px 20px; color: #111827; background: #fff;">
  <h1 style="font-size: 22px; font-weight: 700; margin-bottom: 8px;">Your weekly summary</h1>
  <p style="color: #6B7280;">Hi ${name}, here's how Kenso performed this week:</p>

  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0;">
    <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; text-align: center;">
      <div style="font-size: 32px; font-weight: 700; color: #2563EB;">${total}</div>
      <div style="color: #6B7280; font-size: 14px;">emails handled</div>
    </div>
    <div style="background: #F9FAFB; padding: 20px; border-radius: 8px; text-align: center;">
      <div style="font-size: 32px; font-weight: 700; color: #10B981;">${autoRate}%</div>
      <div style="color: #6B7280; font-size: 14px;">auto-resolved</div>
    </div>
  </div>

  <p style="margin-bottom: 24px;">You saved approximately <strong>${hoursSaved} hours</strong> this week by letting Kenso handle customer support.</p>

  <a href="${dashboardUrl}" style="display: inline-block; background: #2563EB; color: #fff; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 15px;">View dashboard →</a>

  <p style="color: #9CA3AF; font-size: 12px; margin-top: 32px;">You're receiving this because you have an active Kenso subscription.</p>
</body>
</html>`;
}
