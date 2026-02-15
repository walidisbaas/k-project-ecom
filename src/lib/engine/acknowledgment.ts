/**
 * Acknowledgment detector — identifies "thanks" / confirmation-only messages
 * that don't need an AI reply. Also handles sending acknowledgment emails.
 */

/**
 * Returns true if the email body is a short acknowledgment that does not
 * require a reply (e.g. "Thanks!", "Got it", "Perfect").
 */
export function isAcknowledgment(body: string): boolean {
  const trimmed = body.trim();

  // Only check short messages
  if (trimmed.length > 200) return false;

  const ACK_PATTERNS = [
    // English
    /^thanks?[!.?]?\s*$/i,
    /^thank you[!.?]?\s*$/i,
    /^got it[!.?]?\s*$/i,
    /^ok[!.?]?\s*$/i,
    /^okay[!.?]?\s*$/i,
    /^perfect[!.?]?\s*$/i,
    /^great[!.?]?\s*$/i,
    /^awesome[!.?]?\s*$/i,
    /^sounds good[!.?]?\s*$/i,
    /^no problem[!.?]?\s*$/i,
    /^understood[!.?]?\s*$/i,
    // Dutch
    /^bedankt[!.?]?\s*$/i,
    /^dank(je(wel)?|u(wel)?)[!.?]?\s*$/i,
    /^top[!.?]?\s*$/i,
    /^prima[!.?]?\s*$/i,
    /^super[!.?]?\s*$/i,
    /^fijn[!.?]?\s*$/i,
    /^begrepen[!.?]?\s*$/i,
    // German
    /^danke(schön)?[!.?]?\s*$/i,
    /^verstanden[!.?]?\s*$/i,
    /^alles klar[!.?]?\s*$/i,
    // French
    /^merci[!.?]?\s*$/i,
    /^d'accord[!.?]?\s*$/i,
    /^compris[!.?]?\s*$/i,
    // Spanish
    /^gracias[!.?]?\s*$/i,
    /^entendido[!.?]?\s*$/i,
    /^de acuerdo[!.?]?\s*$/i,
  ];

  return ACK_PATTERNS.some((pattern) => pattern.test(trimmed));
}
