import type { Intent } from "@/types";

export interface QualityCheckResult {
  pass: boolean;
  warnings: string[];
  reason?: string; // Set when pass = false
}

const MIN_REPLY_LENGTH = 20;
const MAX_REPLY_LENGTH = 2000;

/** Patterns that indicate the model failed or hallucinated */
const HARD_FAIL_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  {
    pattern: /\[ESCALATE\]/,
    reason: "AI requested escalation",
  },
  {
    pattern: /as an ai|i'm an ai|i am an ai|language model|i'm a bot/i,
    reason: "AI self-disclosure detected",
  },
  {
    pattern: /i('m| am) not sure|i don't have access|i cannot access|i can't access/i,
    reason: "AI uncertainty detected — needs escalation",
  },
  {
    pattern: /\[YOUR NAME\]|\[INSERT\]|\[STORE NAME\]|\{[a-z_]+\}/i,
    reason: "Unfilled template variable detected",
  },
];

/** Patterns that are warnings (2+ warnings → escalate) */
const WARNING_PATTERNS: Array<{ pattern: RegExp; warning: string }> = [
  {
    pattern: /i('m| am) not certain|i believe|i think|as far as i know/i,
    warning: "AI expresses uncertainty",
  },
];

/** Order-related intents that require order data to be present */
const ORDER_REQUIRED_INTENTS: Intent[] = [
  "WISMO",
  "RETURN",
  "EXCHANGE",
  "CANCEL",
  "ORDER_PROBLEM",
];

export function checkQuality(
  reply: string,
  orderData: boolean, // true if order data was available for this request
  intent: Intent
): QualityCheckResult {
  const warnings: string[] = [];

  // ── Hard fail checks ──────────────────────────────────
  for (const { pattern, reason } of HARD_FAIL_PATTERNS) {
    if (pattern.test(reply)) {
      return { pass: false, warnings, reason };
    }
  }

  if (reply.trim().length < MIN_REPLY_LENGTH) {
    return {
      pass: false,
      warnings,
      reason: `Reply too short: ${reply.length} chars (min ${MIN_REPLY_LENGTH})`,
    };
  }

  // ── Warning checks ────────────────────────────────────
  if (reply.length > MAX_REPLY_LENGTH) {
    warnings.push(`Reply too long: ${reply.length} chars (max ${MAX_REPLY_LENGTH})`);
  }

  for (const { pattern, warning } of WARNING_PATTERNS) {
    if (pattern.test(reply)) {
      warnings.push(warning);
    }
  }

  // Order-related intent with no order data — might be a hallucination risk
  if (ORDER_REQUIRED_INTENTS.includes(intent) && !orderData) {
    warnings.push(
      `Order-related intent (${intent}) but no order data available`
    );
  }

  // ── Final verdict ─────────────────────────────────────
  if (warnings.length >= 2) {
    return {
      pass: false,
      warnings,
      reason: `Too many quality warnings: ${warnings.join("; ")}`,
    };
  }

  return { pass: true, warnings };
}
