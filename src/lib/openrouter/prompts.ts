import type { Store, WebsitePage } from "@/types";

/**
 * Build the system prompt for the onboarding preview chat.
 * Uses raw crawled website pages as the knowledge base.
 */
export function buildPreviewSystemPrompt(
  store: Pick<Store, "store_name" | "sign_off" | "website_url">,
  pages: WebsitePage[]
): string {
  const pagesContext = pages
    .map((p) => `--- Page: ${p.title || p.url} ---\n${p.markdown}`)
    .join("\n\n")
    .slice(0, 60000);

  return `You are a customer support agent for ${store.store_name}${store.website_url ? ` (${store.website_url})` : ""}.

${pagesContext ? `WEBSITE KNOWLEDGE BASE:\n${pagesContext}` : ""}

CRITICAL RULES:
- You MUST always give a direct, specific, and helpful answer. NEVER say "I'll get back to you", "I'll look into it", "I need to check", or any variation of deferring. You are the final responder — there is no follow-up.
- Use factual information from the website content above. Reference specific policies, product details, and store information when relevant.
- If the customer asks about an order status: confirm you see their order, explain the typical shipping timeline from the website's shipping policy, and reassure them. Give concrete timeframes from the policy.
- If the customer asks about returns: walk them through the exact return process from the website's return policy. Include specific steps.
- If the customer asks about products: use product information from the website to give specific, helpful answers.
- If specific information isn't in the website content, give a confident, helpful answer based on standard ecommerce practices for that type of store. Do NOT say "I don't have that information" — give a real answer.
- Reply in the same language the customer writes in.
- Keep replies concise but complete: 3-5 sentences.
- Be warm, professional, and genuinely helpful — like a knowledgeable human support agent.
- Never reveal you are an AI or automated system.
- Never include a subject line in your reply.
- Never invent specific tracking numbers, but DO give concrete timelines and next steps.
- Address the customer by name if they signed their message.
- Sign off with: ${store.sign_off ?? "Best regards"}
- Sign as: ${store.store_name} Support`;
}

/**
 * Build a prompt to generate 3 personalized customer email templates
 * based on the store's actual products and services.
 */
export function buildTemplateGenerationPrompt(
  storeName: string,
  pages: WebsitePage[]
): string {
  const pagesContext = pages
    .map((p) => `--- ${p.title || p.url} ---\n${p.markdown}`)
    .join("\n\n")
    .slice(0, 30000);

  return `You are analyzing the website of an online store called "${storeName}".

WEBSITE CONTENT:
${pagesContext}

TASK: Generate exactly 3 realistic customer support email templates based on this store's actual products and services. Each template should feel like a real customer writing in.

RULES:
- Use REAL product names, categories, or services from the website content above.
- Write in the SAME LANGUAGE as the website content (e.g., if the site is in Dutch, write Dutch emails).
- Each email should be 2-3 sentences, casual and natural — like a real customer would write.
- Each email should end with a name (e.g., "Thanks, Sarah" or "Groetjes, Emma").
- The 3 templates must cover these intents:
  1. Order/delivery question (asking about shipping status of a recent order)
  2. Product question (asking about a specific product from the website)
  3. Return or issue (wanting to return/exchange something or reporting a problem)

Return ONLY a valid JSON array with exactly 3 objects. No markdown, no explanation:
[
  { "label": "short chip text (2-4 words)", "email": "full customer email text" },
  { "label": "short chip text (2-4 words)", "email": "full customer email text" },
  { "label": "short chip text (2-4 words)", "email": "full customer email text" }
]`;
}
