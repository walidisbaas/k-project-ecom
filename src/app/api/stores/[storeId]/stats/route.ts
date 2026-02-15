import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { DashboardStats, IntentCount } from "@/types";

type Params = { params: Promise<{ storeId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { storeId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify ownership
  const { data: store } = await supabase
    .from("stores")
    .select("id, merchant_id")
    .eq("id", storeId)
    .eq("merchant_id", user.id)
    .single();

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Fetch logs for the month
  const { data: monthLogs } = await supabase
    .from("email_logs")
    .select("auto_sent, escalated, intent, response_time_ms, created_at")
    .eq("store_id", storeId)
    .gte("created_at", monthStart);

  const logs = monthLogs ?? [];
  const todayLogs = logs.filter((l) => l.created_at >= todayStart);
  const weekLogs = logs.filter((l) => l.created_at >= weekStart);

  const autoSentCount = logs.filter((l) => l.auto_sent).length;
  const autoResolveRate = logs.length > 0 ? autoSentCount / logs.length : 0;

  const responseTimes = logs
    .filter((l) => l.response_time_ms != null)
    .map((l) => l.response_time_ms as number);
  const avgResponseTimeMs =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

  // Intent breakdown
  const intentCounts: Record<string, number> = {};
  for (const log of logs) {
    if (log.intent) {
      intentCounts[log.intent] = (intentCounts[log.intent] ?? 0) + 1;
    }
  }
  const topIntents: IntentCount[] = Object.entries(intentCounts)
    .map(([intent, count]) => ({ intent, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  // Get merchant quota
  const { data: merchant } = await supabase
    .from("merchants")
    .select("emails_limit, emails_used_this_month")
    .eq("id", user.id)
    .single();

  // Pending review queue
  const { count: reviewQueueCount } = await supabase
    .from("review_queue")
    .select("id", { count: "exact", head: true })
    .eq("store_id", storeId)
    .eq("status", "pending");

  const stats: DashboardStats = {
    emails_today: todayLogs.length,
    emails_this_week: weekLogs.length,
    emails_this_month: logs.length,
    auto_resolve_rate: autoResolveRate,
    avg_response_time_ms: Math.round(avgResponseTimeMs),
    top_intents: topIntents,
    emails_limit: merchant?.emails_limit ?? 0,
    emails_used: merchant?.emails_used_this_month ?? 0,
  };

  return NextResponse.json({ data: stats });
}
