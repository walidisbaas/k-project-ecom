import { openai } from "@/lib/openai/client";
import { buildIntentClassificationPrompt } from "@/lib/openai/prompts";
import type { Intent } from "@/types";

const VALID_INTENTS: Intent[] = [
  "WISMO",
  "RETURN",
  "EXCHANGE",
  "CANCEL",
  "ORDER_PROBLEM",
  "PRODUCT_QUESTION",
  "GENERAL",
];

export interface ClassificationResult {
  intent: Intent;
  extracted_order_number: string | null;
}

/**
 * Classify the intent of a customer email using GPT-4o-mini.
 * Uses response_format: json_object for deterministic JSON output.
 * Falls back to GENERAL intent on any error.
 */
export async function classifyIntent(
  subject: string,
  body: string
): Promise<ClassificationResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: buildIntentClassificationPrompt(subject, body),
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 256,
    });

    const content = response.choices[0]?.message.content;
    if (!content) return { intent: "GENERAL", extracted_order_number: null };

    const parsed = JSON.parse(content) as {
      intent?: string;
      extracted_order_number?: string | null;
    };

    const intent = VALID_INTENTS.includes(parsed.intent as Intent)
      ? (parsed.intent as Intent)
      : "GENERAL";

    return {
      intent,
      extracted_order_number: parsed.extracted_order_number ?? null,
    };
  } catch (err) {
    // Rule-based fallback
    return ruleBased(subject, body);
  }
}

/**
 * Rule-based intent classifier as a fast fallback (no API call).
 * Also used as a pre-filter before calling OpenAI to save costs on obvious cases.
 */
export function classifyIntentRuleBased(
  subject: string,
  body: string
): ClassificationResult {
  return ruleBased(subject, body);
}

function ruleBased(
  subject: string,
  body: string
): ClassificationResult {
  const text = (subject + " " + body).toLowerCase();

  // WISMO — Where Is My Order (check first, most common)
  if (
    /where.*(my|is).*(order|package|parcel|shipment)/i.test(text) ||
    /tracking|track.*order|delivery.*status|shipped.*yet|when.*arriv|where.*shipment/i.test(text) ||
    /wanneer.*bestelling|waar.*pakket|bezorging|levering/i.test(text) || // Dutch
    /wo.*bestellung|wann.*lieferung|sendungsverfolgung/i.test(text) || // German
    /où.*colis|suivi.*commande|livraison/i.test(text) || // French
    /dónde.*pedido|seguimiento/i.test(text) // Spanish
  ) {
    return { intent: "WISMO", extracted_order_number: extractOrderNumber(text) };
  }

  // CANCEL
  if (
    /cancel.*order|cancel.*purchase|want.*cancel|annul|stornieren/i.test(text) ||
    /annuleer|bestelling.*annuleer/i.test(text)
  ) {
    return { intent: "CANCEL", extracted_order_number: extractOrderNumber(text) };
  }

  // RETURN
  if (
    /return|refund|send.*back|money.*back|terugsturen|retour|rücksend|remboursement/i.test(
      text
    )
  ) {
    return { intent: "RETURN", extracted_order_number: extractOrderNumber(text) };
  }

  // EXCHANGE
  if (
    /exchange|swap|ruilen|tausch|échange/i.test(text)
  ) {
    return { intent: "EXCHANGE", extracted_order_number: extractOrderNumber(text) };
  }

  // ORDER_PROBLEM
  if (
    /damaged|broken|wrong.*item|missing.*item|not.*received|defect|kapot|beschadigd|beschädig|endommagé/i.test(
      text
    )
  ) {
    return { intent: "ORDER_PROBLEM", extracted_order_number: extractOrderNumber(text) };
  }

  // PRODUCT_QUESTION
  if (
    /size|sizing|fit|material|color|colour|stock|available|product|maat|kleur|beschikbaar|taille|couleur|disponible/i.test(
      text
    )
  ) {
    return { intent: "PRODUCT_QUESTION", extracted_order_number: null };
  }

  return { intent: "GENERAL", extracted_order_number: null };
}

/**
 * Extract an order number from text.
 * Matches patterns like: #1234, order 1234, order #1234, bestelling 1234
 */
export function extractOrderNumber(text: string): string | null {
  const patterns = [
    /#(\d{3,8})/,
    /order\s*#?\s*(\d{3,8})/i,
    /order\s+number\s*:?\s*(\d{3,8})/i,
    /ordernumber\s*:?\s*(\d{3,8})/i,
    /bestelling\s*#?\s*(\d{3,8})/i, // Dutch
    /bestellung\s*#?\s*(\d{3,8})/i, // German
    /commande\s*#?\s*(\d{3,8})/i, // French
    /pedido\s*#?\s*(\d{3,8})/i, // Spanish
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match?.[1]) return match[1];
  }
  return null;
}
