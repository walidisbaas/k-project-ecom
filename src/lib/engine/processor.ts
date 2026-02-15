/**
 * Email Processor — Main orchestrator for the Kenso AI reply engine.
 *
 * Receives a Nylas message reference (IDs only, no content) and runs the
 * full processing pipeline. Email bodies are fetched from Nylas and
 * NEVER written to the database (GDPR requirement).
 *
 * Pipeline:
 * 1.  Deduplication check
 * 2.  Load store (must be live)
 * 3.  Fetch email from Nylas (never stored)
 * 4.  Loop detection
 * 5.  Acknowledgment check
 * 6.  Thread rate limit
 * 7.  Shared inbox guard (pre-generation)
 * 8.  Intent classification
 * 9.  Order number extraction + Shopify lookup
 * 10. Email quota check
 * 11. Load store config (FAQs, rules)
 * 12. Build prompts + generate AI reply
 * 13. Quality check (retry with gpt-4o if needed)
 * 14. Shared inbox guard (post-generation re-check)
 * 15. Auto-send OFF → review queue + acknowledgment
 * 16. Send reply via Nylas
 * 17. Mark replied in Redis + increment usage counter
 * 18. Log to email_logs (metadata only, no PII)
 */

import { supabaseAdmin } from "@/lib/supabase/admin";
import { nylas } from "@/lib/nylas/client";
import { openai } from "@/lib/openai/client";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/openai/prompts";
import { findOrderByNumber } from "@/lib/shopify/client";
import {
  isDuplicateNotification,
  alreadyReplied,
  markReplied,
  threadRateLimitHit,
  dailyLimitHit,
} from "./deduplicator";
import { shouldReply } from "./loop-detector";
import { isAcknowledgment } from "./acknowledgment";
import { classifyIntent, extractOrderNumber } from "./intent-classifier";
import { checkQuality } from "./quality-checker";
import { humanAlreadyReplied } from "./shared-inbox-guard";
import type { ProcessingResult, Store, StoreFaq, StoreRule } from "@/types";

const ORDER_RELATED_INTENTS = [
  "WISMO",
  "RETURN",
  "EXCHANGE",
  "CANCEL",
  "ORDER_PROBLEM",
];

export async function processEmail(
  grantId: string,
  messageId: string,
  threadId: string,
  storeId: string
): Promise<ProcessingResult> {
  const startTime = Date.now();

  // ── 1. Deduplication ─────────────────────────────────
  try {
    if (await isDuplicateNotification(messageId)) {
      return { thread_id: threadId, action: "ignored", reason: "duplicate", reply_id: null };
    }
    if (await alreadyReplied(storeId, messageId)) {
      return { thread_id: threadId, action: "ignored", reason: "already_replied", reply_id: null };
    }
  } catch (err) {
    console.error("[processor] Dedup check failed:", { storeId, error: err });
    // Continue — safer to risk a duplicate than to silently drop emails
  }

  // ── 2. Load store ────────────────────────────────────
  let store: Store & { email_connections: Array<{ email_address: string; nylas_grant_id: string }>; shopify_connections: Array<{ shop_domain: string; access_token: string }>; merchant: { emails_limit: number; emails_used_this_month: number; plan: string } };
  try {
    const { data, error } = await supabaseAdmin
      .from("stores")
      .select(`
        *,
        email_connections ( email_address, nylas_grant_id ),
        shopify_connections ( shop_domain, access_token ),
        merchant:merchants ( emails_limit, emails_used_this_month, plan )
      `)
      .eq("id", storeId)
      .single();

    if (error || !data) {
      return { thread_id: threadId, action: "ignored", reason: "store_not_found", reply_id: null };
    }
    store = data as typeof store;
  } catch (err) {
    console.error("[processor] Store load failed:", { storeId, error: err });
    return { thread_id: threadId, action: "ignored", reason: "store_load_error", reply_id: null };
  }

  if (!store.is_live || !store.is_active) {
    return { thread_id: threadId, action: "ignored", reason: "store_not_live", reply_id: null };
  }

  // ── 3. Fetch email from Nylas ─────────────────────────
  let emailFrom = "";
  let emailSubject = "";
  let emailBody = "";
  let emailHeaders: Record<string, string> = {};
  let customerName: string | null = null;

  try {
    const msgResponse = await nylas.messages.find({
      identifier: grantId,
      messageId,
    });
    const msg = msgResponse.data;

    emailFrom = msg.from?.[0]?.email ?? "";
    customerName = msg.from?.[0]?.name ?? null;
    emailSubject = msg.subject ?? "";
    emailBody = msg.body ?? "";
    // Build a flat header map
    if (msg.headers) {
      for (const header of msg.headers) {
        if (header.name && header.value) {
          emailHeaders[header.name.toLowerCase()] = header.value;
        }
      }
    }
  } catch (err) {
    console.error("[processor] Nylas message fetch failed:", { messageId, error: err });
    return { thread_id: threadId, action: "ignored", reason: "nylas_fetch_error", reply_id: null };
  }

  const storeEmail =
    store.email_connections?.[0]?.email_address ?? "";

  // ── 4. Loop detection ────────────────────────────────
  const loopCheck = shouldReply({
    from: emailFrom,
    subject: emailSubject,
    body: emailBody,
    headers: emailHeaders,
    storeEmail,
  });
  if (!loopCheck.safe) {
    return { thread_id: threadId, action: "ignored", reason: loopCheck.reason ?? "loop_detected", reply_id: null };
  }

  // ── 5. Acknowledgment check ──────────────────────────
  if (isAcknowledgment(emailBody)) {
    return { thread_id: threadId, action: "ignored", reason: "acknowledgment", reply_id: null };
  }

  // ── 6. Thread rate limit ─────────────────────────────
  try {
    if (await threadRateLimitHit(storeId, threadId)) {
      return { thread_id: threadId, action: "blocked", reason: "thread_rate_limit", reply_id: null };
    }
  } catch (err) {
    console.error("[processor] Thread rate limit check failed:", { error: err });
  }

  // ── 7. Shared inbox guard (pre-generation) ───────────
  try {
    if (
      emailFrom &&
      storeEmail &&
      (await humanAlreadyReplied(grantId, threadId, emailFrom, storeEmail))
    ) {
      return { thread_id: threadId, action: "ignored", reason: "human_already_replied", reply_id: null };
    }
  } catch (err) {
    console.error("[processor] Shared inbox guard error:", { error: err });
  }

  // ── 8. Intent classification ─────────────────────────
  let intent: import("@/types").Intent = "GENERAL";
  let extractedOrderNumber: string | null = null;

  try {
    const classification = await classifyIntent(emailSubject, emailBody);
    intent = classification.intent;
    extractedOrderNumber =
      classification.extracted_order_number ??
      extractOrderNumber(emailSubject + " " + emailBody);
  } catch (err) {
    console.error("[processor] Intent classification failed:", { error: err });
  }

  // ── 9. Shopify order lookup ──────────────────────────
  let orderData: import("@/types").ShopifyOrder | null = null;

  if (
    ORDER_RELATED_INTENTS.includes(intent) &&
    extractedOrderNumber &&
    store.shopify_connections?.[0]
  ) {
    const conn = store.shopify_connections[0];
    try {
      orderData = await findOrderByNumber(
        storeId,
        conn.shop_domain,
        conn.access_token,
        extractedOrderNumber
      );
    } catch (err) {
      // Non-fatal: log and continue without order data
      console.error("[processor] Shopify lookup failed:", {
        storeId,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  // ── 10. Email quota check ────────────────────────────
  const merchantData = Array.isArray(store.merchant)
    ? store.merchant[0]
    : store.merchant;

  if (
    merchantData &&
    merchantData.emails_limit > 0 &&
    (await dailyLimitHit(storeId, merchantData.emails_limit))
  ) {
    await escalateToQueue(
      storeId,
      messageId,
      threadId,
      extractedOrderNumber,
      intent,
      "email_quota_exceeded",
      null
    );
    return { thread_id: threadId, action: "queued", reason: "email_quota_exceeded", reply_id: null };
  }

  // ── 11. Load FAQs and rules ──────────────────────────
  let faqs: StoreFaq[] = [];
  let rules: StoreRule[] = [];

  try {
    const [faqsResult, rulesResult] = await Promise.all([
      supabaseAdmin
        .from("store_faqs")
        .select("*")
        .eq("store_id", storeId)
        .eq("enabled", true)
        .order("sort_order"),
      supabaseAdmin.from("store_rules").select("*").eq("store_id", storeId),
    ]);
    faqs = (faqsResult.data ?? []) as StoreFaq[];
    rules = (rulesResult.data ?? []) as StoreRule[];
  } catch (err) {
    console.error("[processor] Failed to load FAQs/rules:", { storeId, error: err });
  }

  // ── 12. Generate AI reply ────────────────────────────
  const systemPrompt = buildSystemPrompt(store, faqs, rules);
  const userPrompt = buildUserPrompt(
    intent,
    customerName,
    emailBody,
    orderData
  );

  let replyText = "";

  const generateReply = async (model: string): Promise<string> => {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });
    return response.choices[0]?.message.content ?? "";
  };

  try {
    replyText = await generateReply("gpt-4o-mini");
  } catch (err) {
    console.error("[processor] OpenAI generation failed:", { error: err });
    await escalateToQueue(
      storeId,
      messageId,
      threadId,
      extractedOrderNumber,
      intent,
      "ai_generation_failed",
      null
    );
    return { thread_id: threadId, action: "escalated", reason: "ai_generation_failed", reply_id: null };
  }

  // ── 13. Quality check ────────────────────────────────
  let qualityResult = checkQuality(replyText, orderData !== null, intent);

  if (!qualityResult.pass) {
    // Retry once with gpt-4o (more capable)
    try {
      replyText = await generateReply("gpt-4o");
      qualityResult = checkQuality(replyText, orderData !== null, intent);
    } catch (err) {
      console.error("[processor] gpt-4o retry failed:", { error: err });
    }

    if (!qualityResult.pass) {
      await escalateToQueue(
        storeId,
        messageId,
        threadId,
        extractedOrderNumber,
        intent,
        `quality_check_failed: ${qualityResult.reason}`,
        replyText.slice(0, 500)
      );
      return { thread_id: threadId, action: "escalated", reason: qualityResult.reason ?? "quality_check_failed", reply_id: null };
    }
  }

  // ── 14. Shared inbox guard (post-generation re-check) ─
  try {
    if (
      emailFrom &&
      storeEmail &&
      (await humanAlreadyReplied(grantId, threadId, emailFrom, storeEmail))
    ) {
      return { thread_id: threadId, action: "ignored", reason: "human_replied_during_generation", reply_id: null };
    }
  } catch {
    // Non-fatal
  }

  // ── 15. Auto-send OFF → review queue ─────────────────
  if (!store.auto_send) {
    await escalateToQueue(
      storeId,
      messageId,
      threadId,
      extractedOrderNumber,
      intent,
      "auto_send_disabled",
      replyText.slice(0, 500)
    );
    return { thread_id: threadId, action: "queued", reason: "auto_send_disabled", reply_id: null };
  }

  // ── 16. Send reply via Nylas ─────────────────────────
  let replyId: string | null = null;

  try {
    const sentMessage = await nylas.messages.send({
      identifier: grantId,
      requestBody: {
        to: [], // Nylas auto-resolves recipients when replyToMessageId is set
        replyToMessageId: messageId,
        body: replyText,
      },
    });
    replyId = sentMessage.data.id ?? null;
  } catch (err) {
    console.error("[processor] Nylas send failed:", {
      storeId,
      error: err instanceof Error ? err.message : "unknown",
    });
    await escalateToQueue(
      storeId,
      messageId,
      threadId,
      extractedOrderNumber,
      intent,
      "send_failed",
      replyText.slice(0, 500)
    );
    return { thread_id: threadId, action: "escalated", reason: "send_failed", reply_id: null };
  }

  // ── 17. Mark replied + increment usage ───────────────
  try {
    await markReplied(storeId, messageId);
    await supabaseAdmin.rpc("increment_emails_used", { merchant_id: store.merchant_id });
  } catch (err) {
    console.error("[processor] Post-send tracking failed:", { error: err });
  }

  // ── 18. Log to email_logs (metadata only, no PII) ────
  try {
    await supabaseAdmin.from("email_logs").insert({
      store_id: storeId,
      thread_id: threadId,
      nylas_message_id: messageId,
      intent,
      order_number: extractedOrderNumber,
      auto_sent: true,
      escalated: false,
      response_time_ms: Date.now() - startTime,
      ai_model: "gpt-4o-mini",
      quality_warning:
        qualityResult.warnings.length > 0
          ? qualityResult.warnings[0]
          : null,
    });
  } catch (err) {
    console.error("[processor] Log insert failed:", { error: err });
  }

  return { thread_id: threadId, action: "replied", reason: intent, reply_id: replyId };
}

// ── Helper: Add to review queue ──────────────────────────
async function escalateToQueue(
  storeId: string,
  messageId: string,
  threadId: string,
  orderNumber: string | null,
  intent: string,
  reason: string,
  draftReply: string | null
): Promise<void> {
  try {
    await supabaseAdmin.from("review_queue").insert({
      store_id: storeId,
      nylas_message_id: messageId,
      thread_id: threadId,
      order_number: orderNumber,
      intent,
      escalation_reason: reason,
      draft_reply: draftReply,
      status: "pending",
    });

    await supabaseAdmin.from("email_logs").insert({
      store_id: storeId,
      thread_id: threadId,
      nylas_message_id: messageId,
      intent,
      order_number: orderNumber,
      auto_sent: false,
      escalated: true,
      escalation_reason: reason,
    });
  } catch (err) {
    console.error("[processor] Escalation insert failed:", {
      storeId,
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}
