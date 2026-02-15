import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createStoreSchema } from "@/lib/validation";
import { scrapeAndSaveToStore } from "@/lib/scraper/scrape-and-save";

export const maxDuration = 120;

/** GET: list all stores for the authenticated merchant */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: stores, error } = await supabase
    .from("stores")
    .select(`
      *,
      email_connections ( email_address, connection_status ),
      shopify_connections ( shop_domain )
    `)
    .eq("merchant_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: stores ?? [] });
}

/** POST: create a new store */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createStoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { store_name, website_url } = parsed.data;

  const { data: store, error } = await supabaseAdmin
    .from("stores")
    .insert({
      merchant_id: user.id,
      store_name,
      website_url: website_url ?? null,
      onboarding_step: 1,
      is_active: true,
      is_live: false,
      auto_send: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Trigger website scrape in background after response is sent
  if (website_url && store) {
    after(async () => {
      try {
        await scrapeAndSaveToStore(store.id, website_url);
      } catch (err) {
        console.error("[stores/POST] Background scrape failed:", {
          storeId: store.id,
          error: err instanceof Error ? err.message : "unknown",
        });
      }
    });
  }

  return NextResponse.json({ data: store }, { status: 201 });
}
