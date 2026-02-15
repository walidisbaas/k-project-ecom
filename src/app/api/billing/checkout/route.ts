import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";
import { billingCheckoutSchema } from "@/lib/validation";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = billingCheckoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation error", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { price_id, store_id } = parsed.data;

  // Get or create Stripe customer
  const { data: merchant } = await supabaseAdmin
    .from("merchants")
    .select("stripe_customer_id, email, name")
    .eq("id", user.id)
    .single();

  if (!merchant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  let customerId = merchant.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: merchant.email,
      name: merchant.name ?? undefined,
      metadata: { merchant_id: user.id },
    });
    customerId = customer.id;
    await supabaseAdmin
      .from("merchants")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: price_id, quantity: 1 }],
    success_url: `${APP_URL}/stores${store_id ? `?store_id=${store_id}&upgraded=true` : "?upgraded=true"}`,
    cancel_url: `${APP_URL}/onboarding/go-live${store_id ? `?store_id=${store_id}` : ""}`,
    metadata: {
      merchant_id: user.id,
      store_id: store_id ?? "",
    },
  });

  return NextResponse.json({ url: session.url });
}
