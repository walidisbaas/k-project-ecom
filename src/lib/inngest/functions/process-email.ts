import { inngest } from "@/lib/inngest/client";
import { processEmail } from "@/lib/engine/processor";

/**
 * Inngest function: process an incoming email through the full AI pipeline.
 *
 * Using step.run() for the core processing call provides idempotency:
 * if the function retries after the step has already completed, the step
 * result is cached and the email is not processed (or sent) twice.
 *
 * Throttle: max 10 emails processed per store per minute to prevent
 * runaway API costs during bulk webhook deliveries.
 */
export const processEmailFn = inngest.createFunction(
  {
    id: "process-email",
    name: "Process Incoming Email",
    retries: 3,
    throttle: {
      key: "event.data.store_id",
      limit: 10,
      period: "1m",
    },
  },
  { event: "email/received" },
  async ({ event, step }) => {
    const { grant_id, message_id, thread_id, store_id } = event.data;

    const result = await step.run("process-email-pipeline", () =>
      processEmail(grant_id, message_id, thread_id, store_id)
    );

    return result;
  }
);
