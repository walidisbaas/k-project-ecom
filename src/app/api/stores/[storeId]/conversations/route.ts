import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { nylas } from "@/lib/nylas/client";

type Params = { params: Promise<{ storeId: string }> };

/**
 * GET: Fetch conversation thread from Nylas LIVE.
 * Email content is NOT stored — fetched on demand and discarded.
 * GDPR compliant: no PII persisted.
 */
export async function GET(req: NextRequest, { params }: Params) {
  const { storeId } = await params;
  const { searchParams } = req.nextUrl;
  const threadId = searchParams.get("threadId");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: store } = await supabaseAdmin
    .from("stores")
    .select(`
      id,
      email_connections ( nylas_grant_id, email_address )
    `)
    .eq("id", storeId)
    .eq("merchant_id", user.id)
    .single();

  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const emailConn = Array.isArray(store.email_connections)
    ? store.email_connections[0]
    : store.email_connections;

  if (!emailConn?.nylas_grant_id) {
    return NextResponse.json(
      { error: "No email connection" },
      { status: 400 }
    );
  }

  const grantId = emailConn.nylas_grant_id as string;

  // If threadId provided, fetch that specific thread
  if (threadId) {
    const messagesResponse = await nylas.messages.list({
      identifier: grantId,
      queryParams: { threadId, limit: 50 },
    });

    const messages = (messagesResponse.data ?? []).map((msg) => ({
      id: msg.id,
      subject: msg.subject,
      from: msg.from,
      to: msg.to,
      date: msg.date ? new Date(msg.date * 1000).toISOString() : null,
      snippet: msg.snippet,
      body: msg.body,
    }));

    // Get log metadata for this thread (intent, order number, rating)
    const { data: logData } = await supabase
      .from("email_logs")
      .select("intent, order_number, merchant_rating, auto_sent, escalated")
      .eq("store_id", storeId)
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(1);

    return NextResponse.json({
      data: {
        thread_id: threadId,
        messages,
        metadata: logData?.[0] ?? null,
      },
    });
  }

  // Otherwise list recent threads
  const threadsResponse = await nylas.threads.list({
    identifier: grantId,
    queryParams: { limit: 25, in: ["INBOX"] },
  });

  const threads = (threadsResponse.data ?? []).map((thread) => ({
    id: thread.id,
    subject: thread.subject,
    snippet: thread.snippet,
    message_ids: thread.messageIds,
    latest_message_received_date: thread.latestMessageReceivedDate
      ? new Date(thread.latestMessageReceivedDate * 1000).toISOString()
      : null,
    unread: thread.unread,
    participants: thread.participants,
  }));

  return NextResponse.json({ data: threads });
}
