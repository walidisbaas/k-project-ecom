import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { encryptToken } from "@/lib/encryption";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";
const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY ?? "";
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET ?? "";

/**
 * Shopify OAuth callback.
 * Exchanges the authorization code for a permanent access token,
 * encrypts it with AES-256, and stores it in shopify_connections.
 *
 * The `state` parameter contains the storeId.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state"); // storeId
  const hmac = searchParams.get("hmac");

  if (!code || !shop || !state) {
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

  // Verify merchant owns this store
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

  // Verify HMAC signature
  if (hmac && !verifyHmac(searchParams, SHOPIFY_API_SECRET)) {
    return NextResponse.redirect(
      `${APP_URL}/onboarding?store_id=${state}&error=invalid_hmac`
    );
  }

  try {
    // Exchange code for permanent access token
    const tokenResponse = await fetch(
      `https://${shop}/admin/oauth/access_token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: SHOPIFY_API_KEY,
          client_secret: SHOPIFY_API_SECRET,
          code,
        }),
      }
    );

    if (!tokenResponse.ok) {
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      scope: string;
    };

    // Encrypt access token before storage
    const encryptedToken = encryptToken(tokenData.access_token);

    // Upsert Shopify connection
    await supabaseAdmin.from("shopify_connections").upsert(
      {
        store_id: state,
        shop_domain: shop,
        access_token: encryptedToken,
        scopes: tokenData.scope,
      },
      { onConflict: "store_id" }
    );

    // Advance onboarding step
    await supabaseAdmin
      .from("stores")
      .update({ onboarding_step: 4 })
      .eq("id", state);

    return NextResponse.redirect(
      `${APP_URL}/onboarding?store_id=${state}`
    );
  } catch (err) {
    console.error("[shopify-callback] OAuth failed:", {
      error: err instanceof Error ? err.message : "unknown",
    });
    return NextResponse.redirect(
      `${APP_URL}/onboarding?store_id=${state}&error=exchange_failed`
    );
  }
}

/**
 * Initiate Shopify OAuth — redirects merchant to Shopify authorization page.
 * Called from the onboarding UI.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const shopDomain = body?.shop_domain as string | undefined;
  const storeId = body?.store_id as string | undefined;

  if (!shopDomain || !storeId) {
    return NextResponse.json(
      { error: "shop_domain and store_id are required" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redirectUri = `${APP_URL}/api/auth/shopify/callback`;
  const scopes =
    "read_orders,read_products,read_customers,read_fulfillments";
  const nonce = storeId; // Use storeId as state/nonce

  const authUrl =
    `https://${shopDomain}/admin/oauth/authorize` +
    `?client_id=${SHOPIFY_API_KEY}` +
    `&scope=${scopes}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${nonce}`;

  return NextResponse.json({ url: authUrl });
}

function verifyHmac(
  searchParams: URLSearchParams,
  secret: string
): boolean {
  try {
    const crypto = require("crypto") as typeof import("crypto");
    // Build the message: all params except hmac, sorted alphabetically
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (key !== "hmac") params[key] = value;
    });

    const message = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&");

    const digest = crypto
      .createHmac("sha256", secret)
      .update(message)
      .digest("hex");

    const hmac = searchParams.get("hmac") ?? "";
    return crypto.timingSafeEqual(
      Buffer.from(digest, "hex"),
      Buffer.from(hmac, "hex")
    );
  } catch {
    return false;
  }
}
