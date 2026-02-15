import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Params = { params: Promise<{ storeId: string }> };

/** POST: activate the store (set is_live = true) after payment is confirmed */
export async function POST(req: NextRequest, { params }: Params) {
  const { storeId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership and email connection
  const { data: store } = await supabaseAdmin
    .from("stores")
    .select(`
      id, merchant_id,
      email_connections ( nylas_grant_id, connection_status )
    `)
    .eq("id", storeId)
    .eq("merchant_id", user.id)
    .single();

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  // Check merchant has an active paid plan
  const { data: merchant } = await supabaseAdmin
    .from("merchants")
    .select("plan, emails_limit")
    .eq("id", user.id)
    .single();

  if (
    !merchant ||
    !["starter", "growth"].includes(merchant.plan)
  ) {
    return NextResponse.json(
      { error: "An active subscription is required to go live" },
      { status: 402 }
    );
  }

  const { data: updated, error } = await supabaseAdmin
    .from("stores")
    .update({
      is_live: true,
      onboarding_step: 5,
      updated_at: new Date().toISOString(),
    })
    .eq("id", storeId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: updated });
}
