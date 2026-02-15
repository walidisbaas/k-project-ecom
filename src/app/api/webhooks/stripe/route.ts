import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resend, FROM_EMAIL } from "@/lib/resend/client";
import type Stripe from "stripe";

const PLAN_EMAILS_MAP: Record<string, { plan: string; emails_limit: number }> = {
  [process.env.STRIPE_PRICE_ID_STARTER ?? "price_starter"]: {
    plan: "starter",
    emails_limit: 500,
  },
  [process.env.STRIPE_PRICE_ID_GROWTH ?? "price_growth"]: {
    plan: "growth",
    emails_limit: 2500,
  },
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: check if we've already processed this event
  const { data: existing } = await supabaseAdmin
    .from("webhook_events")
    .select("id")
    .eq("event_id", event.id)
    .single();

  if (existing) {
    return NextResponse.json({ received: true }); // Already processed
  }

  // Record the event
  await supabaseAdmin.from("webhook_events").insert({
    source: "stripe",
    event_type: event.type,
    event_id: event.id,
    payload: event as unknown as import("@/types").Json,
    processed: false,
  });

  try {
    await processStripeEvent(event);

    // Mark as processed
    await supabaseAdmin
      .from("webhook_events")
      .update({ processed: true })
      .eq("event_id", event.id);
  } catch (err) {
    console.error("[stripe-webhook] Processing failed:", {
      event_type: event.type,
      event_id: event.id,
      error: err instanceof Error ? err.message : "unknown",
    });
  }

  return NextResponse.json({ received: true });
}

async function processStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode !== "subscription") break;

      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;

      // Get the subscription to find the price
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = subscription.items.data[0]?.price.id ?? "";
      const planInfo = PLAN_EMAILS_MAP[priceId];

      if (!planInfo) break;

      await supabaseAdmin
        .from("merchants")
        .update({
          plan: planInfo.plan,
          emails_limit: planInfo.emails_limit,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          billing_cycle_start: new Date().toISOString(),
          emails_used_this_month: 0,
        })
        .eq("stripe_customer_id", customerId);
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0]?.price.id ?? "";
      const planInfo = PLAN_EMAILS_MAP[priceId];

      if (!planInfo) break;

      await supabaseAdmin
        .from("merchants")
        .update({
          plan: planInfo.plan,
          emails_limit: planInfo.emails_limit,
          stripe_subscription_id: sub.id,
        })
        .eq("stripe_customer_id", sub.customer as string);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;

      await supabaseAdmin
        .from("merchants")
        .update({
          plan: "cancelled",
          emails_limit: 0,
        })
        .eq("stripe_customer_id", sub.customer as string);

      // Pause all stores for this merchant
      const { data: merchant } = await supabaseAdmin
        .from("merchants")
        .select("id")
        .eq("stripe_customer_id", sub.customer as string)
        .single();

      if (merchant) {
        await supabaseAdmin
          .from("stores")
          .update({ is_live: false })
          .eq("merchant_id", merchant.id);
      }
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      // Reset monthly email usage on invoice payment
      await supabaseAdmin
        .from("merchants")
        .update({
          emails_used_this_month: 0,
          billing_cycle_start: new Date().toISOString(),
        })
        .eq("stripe_customer_id", invoice.customer as string);
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const { data: merchant } = await supabaseAdmin
        .from("merchants")
        .select("email, name")
        .eq("stripe_customer_id", customerId)
        .single();

      if (merchant) {
        await resend.emails.send({
          from: `Kenso AI <${FROM_EMAIL}>`,
          to: merchant.email,
          subject: "Payment failed — please update your billing details",
          html: `
<p>Hi ${merchant.name ?? "there"},</p>
<p>We were unable to process your Kenso subscription payment.</p>
<p>Please update your payment details to continue using Kenso AI.</p>
<p><a href="${process.env.NEXT_PUBLIC_APP_URL}/settings">Update billing →</a></p>
`,
        });
      }
      break;
    }
  }
}
