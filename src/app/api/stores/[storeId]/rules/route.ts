import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createRuleSchema } from "@/lib/validation";

type Params = { params: Promise<{ storeId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { storeId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rules, error } = await supabase
    .from("store_rules")
    .select("*")
    .eq("store_id", storeId)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: rules ?? [] });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { storeId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .eq("merchant_id", user.id)
    .single();
  if (!store) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = createRuleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
  }

  const { data: rule, error } = await supabaseAdmin
    .from("store_rules")
    .insert({ store_id: storeId, type: parsed.data.type, rule: parsed.data.rule })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: rule }, { status: 201 });
}
