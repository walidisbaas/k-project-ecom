import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client (lazy singleton).
 * Bypasses Row Level Security — use ONLY in:
 *   - Webhook handlers (Nylas, Stripe)
 *   - Inngest job functions
 *   - Admin operations that require cross-user access
 *
 * NEVER import this in components or client-side code.
 */
let _admin: SupabaseClient | null = null;

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!_admin) {
      _admin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );
    }
    return Reflect.get(_admin, prop, receiver);
  },
});
