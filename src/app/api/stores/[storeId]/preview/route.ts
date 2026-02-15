import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { nylas } from "@/lib/nylas/client";
import { classifyIntent } from "@/lib/engine/intent-classifier";
import { shouldReply } from "@/lib/engine/loop-detector";
import { findOrderByNumber } from "@/lib/shopify/client";
import { openai } from "@/lib/openai/client";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/openai/prompts";
import type { StoreFaq, StoreRule, EmailPreview } from "@/types";

type Params = { params: Promise<{ storeId: string }> };

/**
 * GET: Generate AI reply previews from the store's real inbox.
 * Fetches up to 5 customer emails, runs them through the AI pipeline
 * (without sending), and returns the results.
 *
 * GDPR: email content is fetched from Nylas, processed, and discarded.
 * Nothing is stored.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { storeId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load store + connections
  const { data: store } = await supabaseAdmin
    .from("stores")
    .select(`
      *,
      email_connections ( email_address, nylas_grant_id, connection_status ),
      shopify_connections ( shop_domain, access_token )
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

  if (!emailConn || !emailConn.nylas_grant_id) {
    return NextResponse.json(
      { error: "No email connection found. Connect your inbox first." },
      { status: 400 }
    );
  }

  const grantId = emailConn.nylas_grant_id as string;
  const storeEmail = emailConn.email_address as string;

  // Fetch recent inbox messages from Nylas
  const messagesResponse = await nylas.messages.list({
    identifier: grantId,
    queryParams: {
      limit: 20,
      in: ["INBOX"],
    },
  });

  const messages = messagesResponse.data ?? [];

  // Filter to customer emails only (exclude no-reply, store's own email, etc.)
  const customerMessages = messages
    .filter((msg) => {
      const from = msg.from?.[0]?.email ?? "";
      const subject = msg.subject ?? "";
      const body = msg.body ?? "";
      const headers: Record<string, string> = {};
      if (msg.headers) {
        for (const h of msg.headers) {
          if (h.name && h.value) headers[h.name.toLowerCase()] = h.value;
        }
      }
      const check = shouldReply({ from, subject, body, headers, storeEmail });
      return check.safe;
    })
    .slice(0, 5);

  // Load FAQs and rules for the AI
  const [faqsResult, rulesResult] = await Promise.all([
    supabaseAdmin
      .from("store_faqs")
      .select("*")
      .eq("store_id", storeId)
      .eq("enabled", true),
    supabaseAdmin.from("store_rules").select("*").eq("store_id", storeId),
  ]);

  const faqs = (faqsResult.data ?? []) as StoreFaq[];
  const rules = (rulesResult.data ?? []) as StoreRule[];
  const systemPrompt = buildSystemPrompt(store, faqs, rules);

  const shopifyConn = Array.isArray(store.shopify_connections)
    ? store.shopify_connections[0]
    : store.shopify_connections;

  // Process each message
  const previews: EmailPreview[] = await Promise.all(
    customerMessages.map(async (msg): Promise<EmailPreview> => {
      const from = msg.from?.[0]?.email ?? "";
      const subject = msg.subject ?? "";
      const body = msg.body ?? "";
      const date = msg.date
        ? new Date(msg.date * 1000).toISOString()
        : new Date().toISOString();

      try {
        const classification = await classifyIntent(subject, body);

        // Shopify lookup
        let orderData = null;
        if (
          classification.extracted_order_number &&
          shopifyConn
        ) {
          orderData = await findOrderByNumber(
            storeId,
            shopifyConn.shop_domain as string,
            shopifyConn.access_token as string,
            classification.extracted_order_number
          ).catch(() => null);
        }

        const userPrompt = buildUserPrompt(
          classification.intent,
          msg.from?.[0]?.name ?? null,
          body,
          orderData
        );

        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
          max_tokens: 500,
        });

        const aiReply = response.choices[0]?.message.content ?? null;

        return {
          original: {
            from,
            subject,
            snippet: body.slice(0, 200),
            date,
          },
          intent: classification.intent,
          ai_reply: aiReply,
          order_found: orderData !== null,
          error: null,
        };
      } catch (err) {
        return {
          original: {
            from: from,
            subject,
            snippet: body.slice(0, 200),
            date,
          },
          intent: null,
          ai_reply: null,
          order_found: false,
          error: err instanceof Error ? err.message : "Processing failed",
        };
      }
    })
  );

  return NextResponse.json({ data: previews });
}
