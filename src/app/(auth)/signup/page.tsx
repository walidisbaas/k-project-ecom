"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Navigate after the success animation plays
  useEffect(() => {
    if (!success) return;
    // Show the loader, then trigger shrink, then navigate
    const shrinkTimer = setTimeout(() => setExiting(true), 1400);
    const navTimer = setTimeout(() => router.push("/stores"), 1800);
    return () => {
      clearTimeout(shrinkTimer);
      clearTimeout(navTimer);
    };
  }, [success, router]);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/email-signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed to sign in");
      setSuccess(true);
    } catch {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) throw error;
    } catch {
      setGoogleLoading(false);
    }
  };

  // ── Success transition ──
  if (success) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-4">
        <div className="flex flex-col items-center auth-success-enter">
          {/* Animated loading loop */}
          <div className="h-28 w-28">
            <DotLottieReact
              src="https://lottie.host/acc1a2c9-d5a0-4f40-aece-dce57e0fba82/gatZAs7ixQ.lottie"
              loop
              autoplay
            />
          </div>

          {/* Welcome text */}
          <h1 className="mt-8 font-heading text-3xl text-mk-text auth-success-text-1 sm:text-4xl">
            Welcome to Kenso
          </h1>
          <p className="mt-3 text-base text-mk-text-muted auth-success-text-2">
            Setting up your workspace...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center sm:mb-10">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="font-heading text-3xl text-mk-text">
              kenso
              <sup className="ml-0.5 text-sm font-body font-semibold text-mk-accent">
                AI
              </sup>
            </span>
          </Link>
          <h1 className="mt-5 font-heading text-3xl font-bold text-mk-text sm:mt-8 sm:text-4xl">
            Create your account
          </h1>
          <p className="mt-3 text-base text-mk-text-muted">
            Start automating customer support in minutes
          </p>
        </div>

        <div className="rounded-2xl border border-mk-border bg-white p-6 shadow-sm sm:p-8">
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignup}
                disabled={googleLoading}
                className="h-12 w-full border-mk-text bg-mk-text text-base font-medium text-white hover:bg-mk-text/90"
              >
                {googleLoading ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                Continue with Google
              </Button>

              <div className="my-4 flex items-center gap-3 sm:my-6">
                <div className="h-px flex-1 bg-mk-border" />
                <span className="text-sm text-mk-text-muted">or</span>
                <div className="h-px flex-1 bg-mk-border" />
              </div>

              <form onSubmit={handleEmailSignup} className="space-y-4">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  autoFocus
                  className="h-12"
                />
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full bg-mk-accent text-base hover:bg-mk-accent-hover text-white"
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Continue with email
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-3 text-center text-xs text-mk-text-muted sm:mt-5">
                By signing up you agree to our{" "}
                <Link href="/terms" className="underline">
                  Terms
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="underline">
                  Privacy Policy
                </Link>
                .
              </p>
        </div>

        <p className="mt-4 text-center text-sm text-mk-text-muted sm:mt-6">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-mk-accent hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
