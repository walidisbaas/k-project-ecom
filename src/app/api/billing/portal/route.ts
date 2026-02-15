import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: merchant } = await supabaseAdmin
    .from("merchants")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!merchant?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No billing account found" },
      { status: 404 }
    );
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: merchant.stripe_customer_id,
    return_url: `${APP_URL}/settings`,
  });

  return NextResponse.json({ url: session.url });
}
