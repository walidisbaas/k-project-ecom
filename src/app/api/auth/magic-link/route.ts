import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { magicLinkSchema } from "@/lib/validation";

/**
 * POST: Request a new magic link for a given email.
 * Used by the "get a new link" form when a magic link expires.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = magicLinkSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please enter a valid email address" },
      { status: 400 }
    );
  }

  const { email } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ sent: true });
}
