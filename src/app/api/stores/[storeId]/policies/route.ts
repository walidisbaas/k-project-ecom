import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { storePoliciesSchema } from "@/lib/validation";
import type { Json } from "@/types";

type Params = { params: Promise<{ storeId: string }> };

/**
 * PATCH: Save store policies configured during onboarding.
 */
export async function PATCH(req: NextRequest, { params }: Params) {
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
    .select("id, onboarding_step")
    .eq("id", storeId)
    .eq("merchant_id", user.id)
    .single();

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Separate advance_step flag from policies data before validation
  const { advance_step, ...policiesBody } = body as Record<string, unknown>;

  const parsed = storePoliciesSchema.safeParse(policiesBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    store_policies: parsed.data as unknown as Json,
    updated_at: new Date().toISOString(),
  };

  // Only advance onboarding step on explicit "Continue" click
  if (advance_step === true && (store.onboarding_step ?? 0) < 3) {
    updates.onboarding_step = 3;
  }

  const { data: updated, error } = await supabaseAdmin
    .from("stores")
    .update(updates)
    .eq("id", storeId)
    .select("store_policies")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: updated?.store_policies });
}
