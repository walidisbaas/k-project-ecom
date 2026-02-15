import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { updateStoreSchema } from "@/lib/validation";

type Params = { params: Promise<{ storeId: string }> };

/** Verify authenticated user owns the store and return storeId */
async function verifyOwnership(
  storeId: string
): Promise<{ userId: string } | NextResponse> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .eq("merchant_id", user.id)
    .single();

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  return { userId: user.id };
}

/** GET: fetch a single store with all related data */
export async function GET(_req: NextRequest, { params }: Params) {
  const { storeId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: store, error } = await supabase
    .from("stores")
    .select(`
      *,
      email_connections ( id, email_address, connection_status, last_error ),
      shopify_connections ( id, shop_domain, scopes )
    `)
    .eq("id", storeId)
    .eq("merchant_id", user.id)
    .single();

  if (error || !store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  return NextResponse.json({ data: store });
}

/** PUT/PATCH: update store data */
export async function PATCH(req: NextRequest, { params }: Params) {
  const { storeId } = await params;
  const ownership = await verifyOwnership(storeId);
  if (ownership instanceof NextResponse) return ownership;

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateStoreSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: updated, error } = await supabaseAdmin
    .from("stores")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", storeId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: updated });
}

/** DELETE: soft-delete by setting is_active = false */
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { storeId } = await params;
  const ownership = await verifyOwnership(storeId);
  if (ownership instanceof NextResponse) return ownership;

  const { error } = await supabaseAdmin
    .from("stores")
    .update({ is_active: false, is_live: false })
    .eq("id", storeId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
