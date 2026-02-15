import Nylas from "nylas";

/**
 * Nylas v8 client (lazy singleton to avoid build-time crashes).
 */
let _nylas: Nylas | null = null;

function getNylasClient(): Nylas {
  if (!_nylas) {
    _nylas = new Nylas({
      apiKey: process.env.NYLAS_API_KEY!,
      apiUri: "https://api.us.nylas.com",
    });
  }
  return _nylas;
}

export const nylas: Nylas = new Proxy({} as Nylas, {
  get(_target, prop, receiver) {
    return Reflect.get(getNylasClient(), prop, receiver);
  },
});

/**
 * Build the Nylas OAuth redirect URL for a given store.
 */
export function getNylasAuthUrl(redirectUri: string, state: string): string {
  return getNylasClient().auth.urlForOAuth2({
    clientId: process.env.NYLAS_CLIENT_ID!,
    redirectUri,
    scope: ["email.read_only", "email.send", "email.modify"],
    state,
  });
}

/**
 * Exchange an OAuth authorization code for a grant token.
 */
export async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ grantId: string; email: string }> {
  const result = await getNylasClient().auth.exchangeCodeForToken({
    clientId: process.env.NYLAS_CLIENT_ID!,
    clientSecret: process.env.NYLAS_CLIENT_SECRET!,
    redirectUri,
    code,
  });

  return {
    grantId: result.grantId,
    email: result.email,
  };
}

/**
 * Verify a Nylas webhook signature.
 */
export function verifyNylasWebhook(
  rawBody: string,
  signature: string
): boolean {
  try {
    const crypto = require("crypto") as typeof import("crypto");
    const hmac = crypto.createHmac(
      "sha256",
      process.env.NYLAS_WEBHOOK_SECRET!
    );
    hmac.update(rawBody);
    const expected = hmac.digest("hex");
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}
