import type { ChatCompletionMessageParam } from "openai/resources";
import type { Intent, ShopifyOrder, StoreFaq, StorePolicies, StoreRule, Store } from "@/types";

/**
 * Prompt for intent classification.
 * Returns JSON: { intent, extracted_order_number }
 */
export function buildIntentClassificationPrompt(
  subject: string,
  body: string
): ChatCompletionMessageParam[] {
  return [
    {
      role: "system",
      content: `You are an intent classifier for a Shopify merchant's customer support inbox.

Classify the customer email into exactly one of these intents:
- WISMO: Customer asking where their order is / shipping status / delivery date
- RETURN: Customer wants to return a product or initiate a return
- EXCHANGE: Customer wants to exchange a product
- CANCEL: Customer wants to cancel an order
- ORDER_PROBLEM: Damaged item, wrong item, missing item, quality issue
- PRODUCT_QUESTION: Questions about a product (sizing, availability, features, etc.)
- GENERAL: Everything else (complaints, compliments, general inquiries)

Also extract the order number if mentioned (e.g. "#1234", "order 1234", "bestelling 5678").

Respond with ONLY valid JSON matching this schema:
{
  "intent": "WISMO" | "RETURN" | "EXCHANGE" | "CANCEL" | "ORDER_PROBLEM" | "PRODUCT_QUESTION" | "GENERAL",
  "extracted_order_number": string | null
}`,
    },
    {
      role: "user",
      content: `Subject: ${subject}\n\n${body}`,
    },
  ];
}

/**
 * System prompt for AI reply generation.
 */
export function buildSystemPrompt(
  store: Pick<
    Store,
    | "company_summary"
    | "brand_voice"
    | "shipping_policy"
    | "return_policy"
    | "sign_off"
    | "store_policies"
  >,
  faqs: StoreFaq[],
  rules: StoreRule[]
): string {
  const doRules = rules
    .filter((r) => r.type === "do")
    .map((r) => `- ${r.rule}`)
    .join("\n");

  const dontRules = rules
    .filter((r) => r.type === "dont")
    .map((r) => `- ${r.rule}`)
    .join("\n");

  const faqSection = faqs
    .filter((f) => f.enabled)
    .map((f) => `Q: ${f.question}\nA: ${f.answer}`)
    .join("\n\n");

  const policies = store.store_policies as StorePolicies | null;
  let policySection = "";
  if (policies) {
    const lines: string[] = [
      "STORE POLICIES — HARD RULES:",
      `- Average shipping time: ${policies.shipping_days} day${policies.shipping_days !== 1 ? "s" : ""}`,
      `- Target response interval: ${policies.response_interval_hours} hour${policies.response_interval_hours !== 1 ? "s" : ""}`,
    ];

    if (policies.trade_ins_enabled) {
      lines.push("- Trade-ins: accepted");
      lines.push(
        policies.receive_old_items
          ? "- Receive old items: yes"
          : "- Receive old items: no"
      );
    }

    if (policies.prevent_refunds) {
      lines.push("- Refund prevention: active — always try to retain the customer before offering a refund");
      if (policies.offer_vouchers)
        lines.push("- Offer store credit/vouchers as the first alternative to refunds");
      if (policies.offer_partial_refunds)
        lines.push(
          `- Offer ${policies.partial_refund_percentage}% partial refund before offering a full refund`
        );
    }

    policySection = lines.join("\n") + "\n";
  }

  return `You are a customer support agent for ${store.company_summary ?? "an online store"}.

BRAND VOICE:
${store.brand_voice ?? "Professional and helpful."}

${doRules ? `RULES — ALWAYS DO:\n${doRules}\n` : ""}
${dontRules ? `RULES — NEVER DO:\n${dontRules}\n` : ""}
${store.shipping_policy ? `SHIPPING POLICY:\n${store.shipping_policy}\n` : ""}
${store.return_policy ? `RETURN POLICY:\n${store.return_policy}\n` : ""}
${policySection}RETURN HANDLING FLOW:
- If a customer wants to return but does NOT give a reason: acknowledge it warmly and ask why first. Example: "Of course, we'd love to help. Could you share the reason you'd like to return it?"
- If a reason is given: try to genuinely help first. Suggest a fix, an alternative product, or clarify a feature. Always reference their return request so you're not dodging it.
- If there's nothing you can do, or they insist: explain the return process clearly and make it easy.
- If the customer already gave a detailed reason upfront, skip asking and go straight to helping.
- CRITICAL: When explaining the return process, give ALL details you have in one go: return address, return URL, conditions, timeframes. NEVER say "let me know if you need the address" or "I'll send the details later." The customer is asking NOW, so give everything NOW.

${faqSection ? `FREQUENTLY ASKED QUESTIONS:\n${faqSection}\n` : ""}

CRITICAL INSTRUCTIONS:
- Reply in the same language the customer writes in.
- Only use factual data provided below. Never invent tracking numbers, dates, or order details.
- Keep replies concise: 3-5 sentences max.
- If you cannot answer confidently with the information provided, respond with exactly: [ESCALATE]
- Do not reveal that you are an AI or automated system.
- Do not include a subject line in your reply.
- Do not say "as an AI", "I'm an AI", "I'm a language model", or similar.
- Sign off with: ${store.sign_off ?? "Best regards"}`;
}

/**
 * User prompt for reply generation with order context.
 */
export function buildUserPrompt(
  intent: Intent,
  customerName: string | null,
  emailBody: string,
  orderData: ShopifyOrder | null
): string {
  const orderSection = orderData
    ? `
ORDER INFORMATION:
- Order: ${orderData.name}
- Status: ${orderData.financial_status}
- Fulfillment: ${orderData.fulfillment_status ?? "not yet fulfilled"}
- Tracking number: ${orderData.tracking_number ?? "not available"}
- Tracking URL: ${orderData.tracking_url ?? "not available"}
- Carrier: ${orderData.carrier ?? "unknown"}
- Items: ${orderData.line_items.map((i) => `${i.quantity}x ${i.title}${i.variant_title ? ` (${i.variant_title})` : ""}`).join(", ")}
`
    : "";

  return `Customer intent: ${intent}
Customer name: ${customerName ?? "Customer"}
${orderSection}
Customer message:
${emailBody}

Write a helpful reply:`;
}

/**
 * Prompt for website content extraction during onboarding scrape.
 */
export function buildScrapingExtractionPrompt(
  rawContent: string
): ChatCompletionMessageParam[] {
  // Limit content to ~15k tokens (rough estimate: 1 token ≈ 4 chars)
  const truncatedContent = rawContent.slice(0, 60000);

  return [
    {
      role: "system",
      content: `You are analyzing an ecommerce website. Extract the following information as JSON.

Return ONLY valid JSON with this exact schema:
{
  "brand_voice": "2-3 sentence description of tone and communication style",
  "company_summary": "1-2 sentences about what they sell and who they are",
  "shipping_policy": "Summary of shipping information, costs, timelines",
  "return_policy": "Summary of return/refund policy",
  "faqs": [{"question": "...", "answer": "..."}, ...],
  "product_categories": ["..."],
  "language": "primary language code (en, nl, de, fr, es)"
}

If information is not found, use null.
For FAQs: extract up to 15 FAQ items. If no FAQ page exists, generate common ecommerce questions based on the business type.`,
    },
    {
      role: "user",
      content: truncatedContent,
    },
  ];
}
