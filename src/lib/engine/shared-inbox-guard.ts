import { nylas } from "@/lib/nylas/client";

/**
 * Shared Inbox Guard — prevents double-replying when a human has
 * already responded in the same thread.
 *
 * Fetches the thread from Nylas and checks if the store email
 * has sent any message AFTER the last customer message.
 */
export async function humanAlreadyReplied(
  grantId: string,
  threadId: string,
  customerEmail: string,
  storeEmail: string
): Promise<boolean> {
  try {
    // Fetch all messages in the thread
    const messagesResponse = await nylas.messages.list({
      identifier: grantId,
      queryParams: {
        threadId,
        limit: 50,
      },
    });

    const messages = messagesResponse.data ?? [];
    if (messages.length === 0) return false;

    // Sort by date ascending
    const sorted = [...messages].sort(
      (a, b) => (a.date ?? 0) - (b.date ?? 0)
    );

    // Find the index of the last customer message
    let lastCustomerIndex = -1;
    for (let i = sorted.length - 1; i >= 0; i--) {
      const msg = sorted[i];
      if (!msg) continue;
      const fromEmails = (msg.from ?? []).map((f: { email?: string }) =>
        (f.email ?? "").toLowerCase()
      );
      if (fromEmails.some((e: string) => e === customerEmail.toLowerCase())) {
        lastCustomerIndex = i;
        break;
      }
    }

    if (lastCustomerIndex === -1) return false;

    // Check if any message AFTER the last customer message is from the store
    for (let i = lastCustomerIndex + 1; i < sorted.length; i++) {
      const msg = sorted[i];
      if (!msg) continue;
      const fromEmails = (msg.from ?? []).map((f: { email?: string }) =>
        (f.email ?? "").toLowerCase()
      );
      if (fromEmails.some((e: string) => e === storeEmail.toLowerCase())) {
        return true; // Human already replied
      }
    }

    return false;
  } catch (err) {
    // On error: fail safe — assume no human reply, allow AI to proceed
    console.error("[shared-inbox-guard] Failed to check thread:", {
      threadId,
      error: err instanceof Error ? err.message : "unknown",
    });
    return false;
  }
}
