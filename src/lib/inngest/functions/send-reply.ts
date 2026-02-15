import { inngest } from "@/lib/inngest/client";
import { nylas } from "@/lib/nylas/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Inngest function: send an approved reply from the review queue.
 *
 * The send step is wrapped in step.run() to prevent double-sending
 * if the function is retried after the Nylas call succeeds.
 */
export const sendReplyFn = inngest.createFunction(
  {
    id: "send-reply",
    name: "Send Approved Reply",
    retries: 3,
  },
  { event: "email/send-reply" },
  async ({ event, step }) => {
    const { store_id, grant_id, thread_id, message_id, reply_text, review_queue_id } =
      event.data;

    const replyMessageId = await step.run("send-via-nylas", async () => {
      const sent = await nylas.messages.send({
        identifier: grant_id,
        requestBody: {
          to: [], // Nylas auto-resolves recipients when replyToMessageId is set
          replyToMessageId: message_id,
          body: reply_text,
        },
      });
      return sent.data.id ?? null;
    });

    if (review_queue_id) {
      await step.run("mark-sent", () =>
        supabaseAdmin
          .from("review_queue")
          .update({
            status: "replied",
            reviewed_at: new Date().toISOString(),
          })
          .eq("id", review_queue_id)
      );
    }

    // Update email log
    await step.run("update-log", () =>
      supabaseAdmin
        .from("email_logs")
        .update({ auto_sent: true })
        .eq("store_id", store_id)
        .eq("thread_id", thread_id)
        .eq("escalated", true)
        .order("created_at", { ascending: false })
        .limit(1)
    );

    return { reply_message_id: replyMessageId };
  }
);
