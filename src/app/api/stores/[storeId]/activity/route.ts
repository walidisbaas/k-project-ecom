import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ storeId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { storeId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const perPage = Math.min(parseInt(searchParams.get("per_page") ?? "25", 10), 100);
  const offset = (page - 1) * perPage;

  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("id", storeId)
    .eq("merchant_id", user.id)
    .single();

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const { data: logs, count } = await supabase
    .from("email_logs")
    .select(
      "id, thread_id, nylas_message_id, intent, order_number, auto_sent, escalated, escalation_reason, response_time_ms, merchant_rating, created_at",
      { count: "exact" }
    )
    .eq("store_id", storeId)
    .order("created_at", { ascending: false })
    .range(offset, offset + perPage - 1);

  return NextResponse.json({
    data: logs ?? [],
    total: count ?? 0,
    page,
    per_page: perPage,
    has_more: (count ?? 0) > offset + perPage,
  });
}
