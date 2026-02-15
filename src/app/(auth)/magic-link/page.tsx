"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

type Status = "loading" | "success" | "expired" | "error";

function MagicLinkContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState("");
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    async function handleMagicLink() {
      try {
        const res = await fetch(`/api/auth/magic-link/verify?token=${token}`);
        const data = (await res.json()) as {
          success?: boolean;
          expired?: boolean;
          error?: string;
        };

        if (data.success) {
          setStatus("success");
          setTimeout(() => router.push("/stores"), 1500);
        } else if (data.expired) {
          setStatus("expired");
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    }

    void handleMagicLink();
  }, [token, router]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    setResending(true);
    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("Failed to send");
    } catch {
    } finally {
      setResending(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-mk-accent" />
          <p className="mt-4 text-mk-text-secondary">Signing you in...</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-mk-green" />
          <h2 className="mt-4 font-heading text-2xl font-bold text-mk-text">
            You&apos;re in!
          </h2>
          <p className="mt-2 text-mk-text-secondary">Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-yellow-500" />
          <h2 className="mt-4 font-heading text-2xl font-bold text-mk-text">
            Link expired
          </h2>
          <p className="mt-2 text-mk-text-secondary">
            This magic link has expired. Enter your email to get a new one.
          </p>
          <form onSubmit={handleResend} className="mt-6 space-y-3">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
            />
            <Button
              type="submit"
              disabled={resending}
              className="w-full bg-mk-accent hover:bg-mk-accent-hover text-white"
            >
              {resending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send new link"
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h2 className="mt-4 font-heading text-2xl font-bold text-mk-text">
          Invalid link
        </h2>
        <p className="mt-2 text-mk-text-secondary">
          This link is not valid.{" "}
          <Link href="/" className="text-mk-accent hover:underline">
            Go back to the homepage
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense>
      <MagicLinkContent />
    </Suspense>
  );
}
