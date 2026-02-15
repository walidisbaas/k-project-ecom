import { NextRequest, NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { scrapeAndSaveToStore } from "@/lib/scraper/scrape-and-save";

export const maxDuration = 120;

type Params = { params: Promise<{ storeId: string }> };

/** POST: trigger website scrape for a store */
export async function POST(req: NextRequest, { params }: Params) {
  const { storeId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id, website_url, merchant_id")
    .eq("id", storeId)
    .eq("merchant_id", user.id)
    .single();

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  if (!store.website_url) {
    return NextResponse.json(
      { error: "No website URL configured for this store" },
      { status: 400 }
    );
  }

  // Reset status before scheduling background scrape
  await supabaseAdmin
    .from("stores")
    .update({ scrape_status: "pending" })
    .eq("id", storeId);

  after(async () => {
    try {
      await scrapeAndSaveToStore(storeId, store.website_url!);
    } catch (err) {
      console.error("[stores/scrape/POST] Background scrape failed:", {
        storeId,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  });

  return NextResponse.json({ started: true });
}

/** GET: check scrape status */
export async function GET(_req: NextRequest, { params }: Params) {
  const { storeId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: store } = await supabase
    .from("stores")
    .select("scrape_status, scrape_data")
    .eq("id", storeId)
    .eq("merchant_id", user.id)
    .single();

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  return NextResponse.json({
    status: store.scrape_status,
    data: store.scrape_data,
  });
}
