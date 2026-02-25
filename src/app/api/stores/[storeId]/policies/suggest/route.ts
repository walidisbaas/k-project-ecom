import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { openrouter, PREVIEW_MODEL } from "@/lib/openrouter/client";
import type { StorePolicies, WebsitePage } from "@/types";

type Params = { params: Promise<{ storeId: string }> };

const DEFAULT_POLICIES: StorePolicies = {
  shipping_days: 7,
  response_interval_hours: 4,
  trade_ins_enabled: false,
  receive_old_items: false,
  average_cogs: 10,
  prevent_refunds: false,
  offer_vouchers: false,
  offer_partial_refunds: false,
  partial_refund_percentage: 20,
};

/**
 * GET: Suggest store policies based on scraped website content.
 * Returns existing store_policies if already configured,
 * otherwise uses AI to extract suggestions from scraped data.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { storeId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: store, error } = await supabaseAdmin
    .from("stores")
    .select(
      "id, store_policies, shipping_policy, return_policy, website_pages"
    )
    .eq("id", storeId)
    .eq("merchant_id", user.id)
    .single();

  if (error || !store) {
    console.error("[policies/suggest] Store query failed:", {
      storeId,
      userId: user.id,
      error: error?.message,
    });
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  // If already configured, return saved policies
  if (store.store_policies) {
    return NextResponse.json({ data: store.store_policies as StorePolicies });
  }

  // Build context from existing scraped data
  const shippingPolicy = store.shipping_policy ?? "";
  const returnPolicy = store.return_policy ?? "";
  const pages = (store.website_pages ?? []) as WebsitePage[];

  // Collect policy-related page content (shipping, returns, FAQ pages)
  const policyPages = pages
    .filter((p) => {
      const url = p.url.toLowerCase();
      const title = p.title.toLowerCase();
      return (
        url.includes("shipping") ||
        url.includes("return") ||
        url.includes("refund") ||
        url.includes("policy") ||
        url.includes("faq") ||
        url.includes("trade") ||
        title.includes("shipping") ||
        title.includes("return") ||
        title.includes("refund") ||
        title.includes("policy") ||
        title.includes("faq") ||
        title.includes("trade")
      );
    })
    .map((p) => p.markdown)
    .join("\n\n---\n\n")
    .slice(0, 15000);

  const context = [
    shippingPolicy ? `SHIPPING POLICY:\n${shippingPolicy}` : "",
    returnPolicy ? `RETURN POLICY:\n${returnPolicy}` : "",
    policyPages ? `ADDITIONAL POLICY PAGES:\n${policyPages}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  // No content to analyze — return defaults
  if (!context.trim()) {
    return NextResponse.json({ data: DEFAULT_POLICIES });
  }

  try {
    const response = await openrouter.chat.completions.create({
      model: PREVIEW_MODEL,
      messages: [
        {
          role: "system",
          content: `You analyze ecommerce store policies and extract structured configuration data. Return ONLY valid JSON, no markdown or explanation.`,
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
    if (!content) {
      return NextResponse.json({ data: DEFAULT_POLICIES });
    }

    const parsed = JSON.parse(content) as Partial<StorePolicies>;

    // Validate and clamp to allowed values
    const SHIPPING_OPTIONS = [1, 2, 7, 14];
    const RESPONSE_OPTIONS = [1, 2, 4, 8];
    const REFUND_OPTIONS = [10, 20, 30];

    const closest = (val: number | undefined, opts: number[], def: number) => {
      if (val === undefined) return def;
      return opts.reduce((a, b) =>
        Math.abs(b - val) < Math.abs(a - val) ? b : a
      );
    };

    const suggested: StorePolicies = {
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

    return NextResponse.json({ data: suggested });
  } catch (err) {
    console.error("[policies/suggest] AI extraction failed:", {
      storeId,
      error: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.json({ data: DEFAULT_POLICIES });
  }
}
