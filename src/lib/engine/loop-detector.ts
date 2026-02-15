/**
 * Loop Detector — 8 checks to prevent replying to automated emails.
 * All checks are synchronous (no Redis) for maximum performance.
 */

interface LoopCheckInput {
  from: string;
  subject: string;
  body: string;
  headers: Record<string, string>;
  storeEmail: string;
}

interface LoopCheckResult {
  safe: boolean;
  reason?: string;
}

// ────────────────────────────────────────────
// Check 1: Auto-reply / suppression headers
// ────────────────────────────────────────────
const AUTO_REPLY_HEADERS = [
  "x-autoreply",
  "x-autorespond",
  "x-auto-response-suppress",
];

function checkAutoReplyHeaders(
  headers: Record<string, string>
): string | null {
  const normalizedHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) {
    normalizedHeaders[k.toLowerCase()] = v.toLowerCase();
  }

  for (const header of AUTO_REPLY_HEADERS) {
    if (normalizedHeaders[header]) {
      return `auto-reply header: ${header}`;
    }
  }

  // auto-submitted header: only block if value is NOT "no"
  const autoSubmitted = normalizedHeaders["auto-submitted"];
  if (autoSubmitted && autoSubmitted !== "no") {
    return "auto-submitted header detected";
  }

  // precedence header: bulk/list/junk
  const precedence = normalizedHeaders["precedence"];
  if (
    precedence &&
    ["bulk", "list", "junk"].includes(precedence.toLowerCase())
  ) {
    return `precedence: ${precedence}`;
  }

  return null;
}

// ────────────────────────────────────────────
// Check 2: Sender is store's own email
// ────────────────────────────────────────────
function checkSelfSend(from: string, storeEmail: string): string | null {
  if (from.toLowerCase() === storeEmail.toLowerCase()) {
    return "sender is store email (self-send)";
  }
  return null;
}

// ────────────────────────────────────────────
// Check 3: No-reply / automated sender addresses
// ────────────────────────────────────────────
const NOREPLY_PATTERNS = [
  /noreply/i,
  /no-reply/i,
  /do-not-reply/i,
  /donotreply/i,
  /mailer-daemon/i,
  /postmaster/i,
  /bounce/i,
  /^notifications@/i,
  /^news@/i,
  /^marketing@/i,
  /^newsletter@/i,
  /^info@.*shopify\.com$/i,
  /^support@.*stripe\.com$/i,
];

function checkNoReplyAddress(from: string): string | null {
  const email = from.toLowerCase();
  for (const pattern of NOREPLY_PATTERNS) {
    if (pattern.test(email)) {
      return `no-reply address pattern: ${pattern.toString()}`;
    }
  }
  return null;
}

// ────────────────────────────────────────────
// Check 4: Auto-reply subjects (multi-language)
// ────────────────────────────────────────────
const AUTO_REPLY_SUBJECT_PATTERNS = [
  // English
  /^out of office/i,
  /^automatic reply/i,
  /^auto:/i,
  /^autoreply:/i,
  /^vacation reply/i,
  /^away:/i,
  // Dutch
  /^afwezig/i,
  /^automatisch antwoord/i,
  /^buiten kantoor/i,
  // German
  /^abwesenheitsnotiz/i,
  /^automatische antwort/i,
  // French
  /^absence/i,
  /^réponse automatique/i,
  /^je suis absent/i,
  // Spanish
  /^respuesta automática/i,
  /^fuera de la oficina/i,
];

function checkAutoReplySubject(subject: string): string | null {
  for (const pattern of AUTO_REPLY_SUBJECT_PATTERNS) {
    if (pattern.test(subject.trim())) {
      return `auto-reply subject: ${subject.slice(0, 50)}`;
    }
  }
  return null;
}

// ────────────────────────────────────────────
// Check 5: Delivery failure subjects
// ────────────────────────────────────────────
const DELIVERY_FAILURE_PATTERNS = [
  /undeliverable/i,
  /delivery failed/i,
  /delivery failure/i,
  /returned mail/i,
  /failure notice/i,
  /mail delivery/i,
  /nondelivery report/i,
];

function checkDeliveryFailure(subject: string): string | null {
  for (const pattern of DELIVERY_FAILURE_PATTERNS) {
    if (pattern.test(subject)) {
      return `delivery failure subject: ${subject.slice(0, 50)}`;
    }
  }
  return null;
}

// ────────────────────────────────────────────
// Check 6 & 7: Rate limits handled in deduplicator.ts
// ────────────────────────────────────────────

// ────────────────────────────────────────────
// Check 8: Auto-reply body patterns
// ────────────────────────────────────────────
const AUTO_REPLY_BODY_PATTERNS = [
  /^this is an automated/i,
  /^this is an automatic/i,
  /^thank you for your email, i am currently/i,
  /^i'm currently out of the office/i,
  /^i am currently out of the office/i,
  /^i will be out of office/i,
  /^this message is automatically generated/i,
];

function checkAutoReplyBody(body: string): string | null {
  const trimmed = body.trim().slice(0, 200).toLowerCase();
  for (const pattern of AUTO_REPLY_BODY_PATTERNS) {
    if (pattern.test(trimmed)) {
      return "auto-reply body detected";
    }
  }
  return null;
}

// ────────────────────────────────────────────
// Main export
// ────────────────────────────────────────────
export function shouldReply(input: LoopCheckInput): LoopCheckResult {
  const checks = [
    () => checkAutoReplyHeaders(input.headers),
    () => checkSelfSend(input.from, input.storeEmail),
    () => checkNoReplyAddress(input.from),
    () => checkAutoReplySubject(input.subject),
    () => checkDeliveryFailure(input.subject),
    () => checkAutoReplyBody(input.body),
  ];

  for (const check of checks) {
    const reason = check();
    if (reason) {
      return { safe: false, reason };
    }
  }

  return { safe: true };
}
