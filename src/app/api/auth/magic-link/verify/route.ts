import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * GET: Verify a magic link token from the leads table.
 * If valid: creates merchant account (if not exists), creates store from lead data,
 * signs them in, redirects to onboarding.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  // Look up the token
  const { data: lead } = await supabaseAdmin
    .from("leads")
    .select("*")
    .eq("magic_link_token", token)
    .single();

  if (!lead) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  // Check expiry
  if (
    lead.magic_link_expires_at &&
    new Date(lead.magic_link_expires_at) < new Date()
  ) {
    return NextResponse.json({ expired: true }, { status: 400 });
  }

  try {
    // Get or create merchant
    let merchantId: string;
    const { data: existingMerchant } = await supabaseAdmin
      .from("merchants")
      .select("id")
      .eq("email", lead.email)
      .single();

    if (existingMerchant) {
      merchantId = existingMerchant.id;
    } else {
      // Create Supabase Auth user
      const { data: authData, error: authError } =
        await supabaseAdmin.auth.admin.createUser({
          email: lead.email,
          email_confirm: true,
          password: crypto.randomUUID(), // random password — they use magic links
        });
      if (authError || !authData.user) throw authError;
      merchantId = authData.user.id;
    }

    // Extract scrape data
    const scrapeData = lead.scrape_data as {
      brand_voice?: string | null;
      company_summary?: string | null;
      shipping_policy?: string | null;
      return_policy?: string | null;
      faqs?: Array<{ question: string; answer: string }>;
      language?: string;
    } | null;

    // Create store with scraped data
    const { data: store } = await supabaseAdmin
      .from("stores")
      .insert({
        merchant_id: merchantId,
        store_name:
          lead.website_url
            ? new URL(lead.website_url).hostname.replace("www.", "")
            : "My Store",
        website_url: lead.website_url,
        brand_voice: scrapeData?.brand_voice ?? null,
        company_summary: scrapeData?.company_summary ?? null,
        shipping_policy: scrapeData?.shipping_policy ?? null,
        return_policy: scrapeData?.return_policy ?? null,
        primary_language: scrapeData?.language ?? "en",
        scrape_status: "complete",
        scrape_data: lead.scrape_data,
        onboarding_step: 2,
      })
      .select("id")
      .single();

    if (!store) throw new Error("Failed to create store");

    // Create FAQs from scrape data
    if (scrapeData?.faqs && scrapeData.faqs.length > 0) {
      await supabaseAdmin.from("store_faqs").insert(
        scrapeData.faqs.slice(0, 15).map((faq, index) => ({
          store_id: store.id,
          question: faq.question,
          answer: faq.answer,
          enabled: true,
          source: "scraped" as const,
          sort_order: index,
        }))
      );
    }

    // Mark lead as converted
    await supabaseAdmin
      .from("leads")
      .update({
        magic_link_clicked: true,
        converted_to_merchant_id: merchantId,
      })
      .eq("id", lead.id);

    // Redirect to login with email pre-filled — user will sign in via magic link
    // The auth session is handled by Supabase's built-in auth flow
    return NextResponse.json({ success: true, store_id: store.id, email: lead.email });
  } catch (err) {
    console.error("[magic-link-verify] Failed:", {
      error: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
