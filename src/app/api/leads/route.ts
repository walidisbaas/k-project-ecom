import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { inngest } from "@/lib/inngest/client";
import { leadCaptureSchema } from "@/lib/validation";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = leadCaptureSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, website_url, source, utm_campaign, utm_source, utm_medium } =
    parsed.data;

  // Generate magic link token
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  // Upsert lead
  const { data: lead, error } = await supabaseAdmin
    .from("leads")
    .upsert(
      {
        email,
        website_url: website_url ?? null,
        source: source ?? null,
        utm_campaign: utm_campaign ?? null,
        utm_source: utm_source ?? null,
        utm_medium: utm_medium ?? null,
        magic_link_token: token,
        magic_link_expires_at: expiresAt,
        magic_link_clicked: false,
        scrape_status: "pending",
      },
      { onConflict: "email", ignoreDuplicates: false }
    )
    .select("id")
    .single();

  if (error || !lead) {
    console.error("[leads] Upsert failed:", { error: error?.message });
    return NextResponse.json({ error: "Failed to save lead" }, { status: 500 });
  }

  // Trigger scrape in background (if website URL provided)
  if (website_url) {
    await inngest
      .send({
        name: "lead/scrape-website",
        data: {
          lead_id: lead.id,
          email,
          website_url,
        },
      })
      .catch((err) => {
        console.error("[leads] Failed to trigger scrape:", {
          error: err instanceof Error ? err.message : "unknown",
        });
      });
  } else {
    // No website — send magic link directly
    await inngest
      .send({
        name: "lead/send-magic-link",
        data: {
          lead_id: lead.id,
          email,
          token,
          website_url: null,
        },
      })
      .catch(() => {});
  }

  return NextResponse.json({ success: true });
}
