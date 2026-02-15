import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Params = { params: Promise<{ storeId: string; ruleId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { storeId, ruleId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: rule } = await supabase
    .from("store_rules")
    .select("id, store_id")
    .eq("id", ruleId)
    .eq("store_id", storeId)
    .single();
  if (!rule) return NextResponse.json({ error: "Rule not found" }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("store_rules")
    .delete()
    .eq("id", ruleId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
