import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { email } = await req.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Create user if new (auto-confirmed), ignore error if already exists
  await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  // Generate link server-side (no email sent)
  const { data: linkData, error: linkError } =
    await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });

  if (linkError || !linkData?.properties?.hashed_token) {
    return NextResponse.json({ error: "Failed to sign in" }, { status: 500 });
  }

  // Verify server-side to establish session cookies
  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "magiclink",
  });

  if (verifyError) {
    return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
