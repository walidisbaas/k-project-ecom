import type { ChatCompletionMessageParam } from "openai/resources";
import type { Intent, ShopifyOrder, StoreFaq, StoreRule, Store } from "@/types";

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

  return `You are a customer support agent for ${store.company_summary ?? "an online store"}.

BRAND VOICE:
${store.brand_voice ?? "Professional and helpful."}

${doRules ? `RULES — ALWAYS DO:\n${doRules}\n` : ""}
${dontRules ? `RULES — NEVER DO:\n${dontRules}\n` : ""}
${store.shipping_policy ? `SHIPPING POLICY:\n${store.shipping_policy}\n` : ""}
${store.return_policy ? `RETURN POLICY:\n${store.return_policy}\n` : ""}
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
