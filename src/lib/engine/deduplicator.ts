import { redis } from "@/lib/redis/client";

const DEDUP_TTL = 86400; // 24 hours
const THREAD_RATE_LIMIT_TTL = 3600; // 1 hour
const THREAD_RATE_LIMIT_MAX = 3; // max replies per thread per hour

/**
 * Check if a Nylas notification was already processed.
 * Uses Redis SETNX for atomic test-and-set semantics.
 * Returns true if this is a duplicate (already seen).
 */
export async function isDuplicateNotification(
  notificationId: string
): Promise<boolean> {
  const key = `dedup:notification:${notificationId}`;
  const result = await redis.set(key, "1", { nx: true, ex: DEDUP_TTL });
  return result === null; // null = key already existed = duplicate
}

/**
 * Check if we already sent a reply to this specific message.
 */
export async function alreadyReplied(
  storeId: string,
  messageId: string
): Promise<boolean> {
  const key = `dedup:replied:${storeId}:${messageId}`;
  const value = await redis.get(key);
  return value !== null;
}

/**
 * Mark a message as replied to.
 */
export async function markReplied(
  storeId: string,
  messageId: string
): Promise<void> {
  const key = `dedup:replied:${storeId}:${messageId}`;
  await redis.set(key, "1", { ex: DEDUP_TTL });
}

/**
 * Check if a thread has hit the rate limit (max 3 replies per thread per hour).
 * Returns true if the limit is exceeded.
 * Increments the counter on each call.
 */
export async function threadRateLimitHit(
  storeId: string,
  threadId: string
): Promise<boolean> {
  const key = `rate:thread:${storeId}:${threadId}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, THREAD_RATE_LIMIT_TTL);
  }
  return count > THREAD_RATE_LIMIT_MAX;
}

/**
 * Check if store has hit its daily auto-reply limit.
 * Returns true if the limit is exceeded.
 */
export async function dailyLimitHit(
  storeId: string,
  limit: number
): Promise<boolean> {
  if (limit <= 0) return true;
  const today = new Date().toISOString().split("T")[0];
  const key = `rate:daily:${storeId}:${today}`;
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 86400); // 24 hours
  }
  return count > limit;
}
