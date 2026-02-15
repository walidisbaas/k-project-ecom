import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { exchangeCodeForToken } from "@/lib/nylas/client";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

/**
 * Nylas OAuth callback.
 * The `state` parameter contains the storeId — used to link the grant back
 * to the correct store.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // storeId

  if (!code || !state) {
    return NextResponse.redirect(
      `${APP_URL}/onboarding?error=missing_params`
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${APP_URL}/login`);
  }

  // Verify the merchant owns this store
  const { data: store } = await supabaseAdmin
    .from("stores")
    .select("id")
    .eq("id", state)
    .eq("merchant_id", user.id)
    .single();

  if (!store) {
    return NextResponse.redirect(
      `${APP_URL}/onboarding?error=invalid_state`
    );
  }

  try {
    const redirectUri = `${APP_URL}/api/auth/nylas/callback`;
    const { grantId, email } = await exchangeCodeForToken(code, redirectUri);

    // Upsert email connection
    await supabaseAdmin.from("email_connections").upsert(
      {
        store_id: state,
        provider: "nylas",
        email_address: email,
        nylas_grant_id: grantId,
        connection_status: "active",
        last_error: null,
      },
      { onConflict: "store_id,email_address" }
    );

    // Advance onboarding step
    await supabaseAdmin
      .from("stores")
      .update({ onboarding_step: 3 })
      .eq("id", state);

    return NextResponse.redirect(
      `${APP_URL}/onboarding?store_id=${state}`
    );
  } catch (err) {
    console.error("[nylas-callback] Token exchange failed:", {
      error: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.redirect(
      `${APP_URL}/onboarding?store_id=${state}&error=exchange_failed`
    );
  }
}
