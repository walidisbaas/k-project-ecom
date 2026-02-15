import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redis } from "@/lib/redis/client";

export async function GET() {
  const issues: string[] = [];

  // Check Supabase
  try {
    const { error } = await supabaseAdmin
      .from("merchants")
      .select("id")
      .limit(1);
    if (error) issues.push(`supabase: ${error.message}`);
  } catch {
    issues.push("supabase: connection failed");
  }

  // Check Redis
  try {
    await redis.ping();
  } catch {
    issues.push("redis: connection failed");
  }

  const status = issues.length === 0 ? "ok" : "degraded";

  return NextResponse.json(
    { status, timestamp: new Date().toISOString(), issues },
    { status: status === "ok" ? 200 : 503 }
  );
}
