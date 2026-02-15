import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Strip PII keys before logging — never log email bodies, addresses, or names */
export function sanitizeForLog(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const PII_KEYS = [
    "email",
    "body",
    "content",
    "text",
    "reply",
    "message",
    "name",
    "address",
    "phone",
  ];
  return Object.fromEntries(
    Object.entries(obj).filter(
      ([k]) => !PII_KEYS.includes(k.toLowerCase())
    )
  );
}

/** Extract domain from email address — safe to log */
export function extractDomain(email: string): string {
  return email.split("@")[1] ?? "unknown";
}

/** Format a number as EUR currency */
export function formatEur(cents: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

/** Truncate text to maxLength, appending ellipsis */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/** Convert milliseconds to human-readable duration */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60000)}m`;
}
