import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createFaqSchema } from "@/lib/validation";

type Params = { params: Promise<{ storeId: string }> };

async function verifyOwnership(storeId: string, userId: string) {
  const { data } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .eq("merchant_id", userId)
    .single();
  return data;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { storeId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: faqs, error } = await supabase
    .from("store_faqs")
    .select("*")
    .eq("store_id", storeId)
    .order("sort_order");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: faqs ?? [] });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { storeId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!(await verifyOwnership(storeId, user.id))) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createFaqSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
  }

  // Get current max sort_order
  const { data: existing } = await supabaseAdmin
    .from("store_faqs")
    .select("sort_order")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = ((existing?.[0]?.sort_order ?? -1) as number) + 1;

  const { data: faq, error } = await supabaseAdmin
    .from("store_faqs")
    .insert({
      store_id: storeId,
      question: parsed.data.question,
      answer: parsed.data.answer,
      enabled: true,
      source: "manual",
      sort_order: nextOrder,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: faq }, { status: 201 });
}
