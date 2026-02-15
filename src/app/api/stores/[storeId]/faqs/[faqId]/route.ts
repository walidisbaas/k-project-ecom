import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { updateFaqSchema } from "@/lib/validation";

type Params = { params: Promise<{ storeId: string; faqId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { storeId, faqId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify ownership via store
  const { data: faq } = await supabase
    .from("store_faqs")
    .select("id, store_id")
    .eq("id", faqId)
    .eq("store_id", storeId)
    .single();
  if (!faq) return NextResponse.json({ error: "FAQ not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = updateFaqSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
  }

  const { data: updated, error } = await supabaseAdmin
    .from("store_faqs")
    .update({ ...parsed.data, updated_at: new Date().toISOString() })
    .eq("id", faqId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { storeId, faqId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: faq } = await supabase
    .from("store_faqs")
    .select("id")
    .eq("id", faqId)
    .eq("store_id", storeId)
    .single();
  if (!faq) return NextResponse.json({ error: "FAQ not found" }, { status: 404 });

  const { error } = await supabaseAdmin
    .from("store_faqs")
    .delete()
    .eq("id", faqId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
