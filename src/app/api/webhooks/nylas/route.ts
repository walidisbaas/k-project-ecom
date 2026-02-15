import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { inngest } from "@/lib/inngest/client";
import { verifyNylasWebhook } from "@/lib/nylas/client";
import { resend, FROM_EMAIL } from "@/lib/resend/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

/**
 * GET: Nylas webhook URL verification.
 * Nylas sends a GET with a `challenge` query param.
 * Must return the challenge string as plain text.
 */
export async function GET(req: NextRequest) {
  const challenge = req.nextUrl.searchParams.get("challenge");
  if (challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }
  return new Response("OK", { status: 200 });
}

/**
 * POST: Handle Nylas webhook events.
 *
 * CRITICAL: Return 200 IMMEDIATELY before any async processing.
 * Nylas times out at ~10 seconds. Processing is offloaded to Inngest.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-nylas-signature") ?? "";

  // Verify signature
  if (!verifyNylasWebhook(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Acknowledge immediately — Nylas requires 200 within 10 seconds
  const acknowledgeResponse = NextResponse.json({ received: true });

  // Parse and process asynchronously (fire-and-forget)
  void handleWebhook(rawBody);

  return acknowledgeResponse;
}

async function handleWebhook(rawBody: string): Promise<void> {
  try {
    const payload = JSON.parse(rawBody) as {
      specversion?: string;
      type?: string;
      data?: {
        object?: {
          grant_id?: string;
          id?: string;
          thread_id?: string;
        };
      };
    };

    const eventType = payload.type ?? "";

    // Handle grant.expired / grant.revoked
    if (
      eventType === "grant.expired" ||
      eventType === "grant.revoked"
    ) {
      const grantId = payload.data?.object?.grant_id;
      if (!grantId) return;

      await handleBrokenConnection(grantId, eventType);
      return;
    }

    // Only process message.created events
    if (eventType !== "message.created") return;

    const grantId = payload.data?.object?.grant_id;
    const messageId = payload.data?.object?.id;
    const threadId = payload.data?.object?.thread_id;

    if (!grantId || !messageId || !threadId) return;

    // Look up which store this grant belongs to
    const { data: emailConn } = await supabaseAdmin
      .from("email_connections")
      .select("store_id")
      .eq("nylas_grant_id", grantId)
      .eq("connection_status", "active")
      .single();

    if (!emailConn) return; // Unknown grant — ignore

    // Fire Inngest event for durable processing
    await inngest.send({
      name: "email/received",
      data: {
        grant_id: grantId,
        message_id: messageId,
        thread_id: threadId,
        store_id: emailConn.store_id,
      },
    });
  } catch (err) {
    console.error("[nylas-webhook] Processing failed:", {
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}

async function handleBrokenConnection(
  grantId: string,
  eventType: string
): Promise<void> {
  try {
    // Mark connection as broken
    await supabaseAdmin
      .from("email_connections")
      .update({ connection_status: "broken", last_error: eventType })
      .eq("nylas_grant_id", grantId);

    // Get the store and pause it
    const { data: conn } = await supabaseAdmin
      .from("email_connections")
      .select("store_id, stores(merchant_id, store_name)")
      .eq("nylas_grant_id", grantId)
      .single();

    if (!conn) return;

    const storeId = conn.store_id;
    await supabaseAdmin
      .from("stores")
      .update({ is_live: false, has_broken_connection: true })
      .eq("id", storeId);

    // Get merchant email for alert
    const store = Array.isArray(conn.stores) ? conn.stores[0] : conn.stores;
    const { data: merchant } = await supabaseAdmin
      .from("merchants")
      .select("email, name")
      .eq("id", store?.merchant_id)
      .single();

    if (merchant) {
      await resend.emails.send({
        from: `Kenso AI <${FROM_EMAIL}>`,
        to: merchant.email,
        subject: "Action required: Your email connection needs to be reconnected",
        html: `
<p>Hi ${merchant.name ?? "there"},</p>
<p>Your email connection for <strong>${store?.store_name ?? "your store"}</strong> has been disconnected (${eventType}).</p>
<p>Kenso has paused auto-replies for this store. Please reconnect your email to resume.</p>
<p><a href="${APP_URL}/settings">Reconnect now →</a></p>
`,
      });
    }
  } catch (err) {
    console.error("[nylas-webhook] handleBrokenConnection failed:", {
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}
