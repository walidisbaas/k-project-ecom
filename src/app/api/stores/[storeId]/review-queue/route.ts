import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { inngest } from "@/lib/inngest/client";
import { reviewQueueEditSchema } from "@/lib/validation";

type Params = { params: Promise<{ storeId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { storeId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status") ?? "pending";

  const { data: items, error } = await supabase
    .from("review_queue")
    .select("*")
    .eq("store_id", storeId)
    .eq("status", status)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: items ?? [] });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { storeId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const itemId = searchParams.get("id");
  const action = searchParams.get("action"); // "approve" | "edit-send" | "dismiss"

  if (!itemId || !action) {
    return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
  }

  // Verify ownership
  const { data: item } = await supabase
    .from("review_queue")
    .select("*, store:stores(merchant_id, email_connections(nylas_grant_id))")
    .eq("id", itemId)
    .eq("store_id", storeId)
    .eq("status", "pending")
    .single();

  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  if (action === "dismiss") {
    await supabaseAdmin
      .from("review_queue")
      .update({ status: "dismissed", reviewed_at: new Date().toISOString() })
      .eq("id", itemId);
    return NextResponse.json({ success: true });
  }

  if (action === "approve" || action === "edit-send") {
    let replyText: string | null = item.draft_reply;

    if (action === "edit-send") {
      const body = await req.json().catch(() => null);
      const parsed = reviewQueueEditSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
      }
      replyText = parsed.data.edited_reply;
    }

    if (!replyText) {
      return NextResponse.json({ error: "No reply text available" }, { status: 400 });
    }

    // Get grant ID
    const store = Array.isArray(item.store) ? item.store[0] : item.store;
    const emailConn = Array.isArray(store?.email_connections)
      ? store.email_connections[0]
      : store?.email_connections;
    const grantId = emailConn?.nylas_grant_id;

    if (!grantId) {
      return NextResponse.json({ error: "No email connection" }, { status: 400 });
    }

    // Send via Inngest for durability
    await inngest.send({
      name: "email/send-reply",
      data: {
        store_id: storeId,
        grant_id: grantId,
        thread_id: item.thread_id ?? "",
        message_id: item.nylas_message_id ?? "",
        reply_text: replyText,
        review_queue_id: itemId,
      },
    });

    await supabaseAdmin
      .from("review_queue")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .eq("id", itemId);

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
