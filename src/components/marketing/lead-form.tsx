"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ArrowRight, Loader2 } from "lucide-react";

export function LeadForm() {
  const [email, setEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          website_url: websiteUrl || undefined,
          source: "landing_page",
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Something went wrong");
      }

      setSubmitted(true);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="rounded-xl border border-mk-green/20 bg-mk-green-light p-8 text-center">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-mk-green/10">
          <span className="text-2xl">✉️</span>
        </div>
        <h3 className="text-lg font-semibold text-mk-green">
          Check your inbox!
        </h3>
        <p className="mt-1 text-sm text-mk-text-secondary">
          We&apos;re analyzing your store and will send you a demo link in a few
          minutes.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Input
        type="url"
        placeholder="Your store URL (e.g. mystore.com)"
        value={websiteUrl}
        onChange={(e) => setWebsiteUrl(e.target.value)}
        className="h-12 border-mk-border bg-white text-base text-mk-text placeholder:text-mk-text-muted"
        required
      />
      <Input
        type="email"
        placeholder="Your email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-12 border-mk-border bg-white text-base text-mk-text placeholder:text-mk-text-muted"
        required
      />
      <button
        type="submit"
        disabled={loading}
        className="flex h-12 items-center justify-center rounded-[10px] bg-mk-accent text-base font-semibold text-white shadow-[0_2px_8px_rgba(224,90,26,0.3)] transition-all hover:-translate-y-0.5 hover:bg-mk-accent-hover disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Analyzing your store...
          </>
        ) : (
          <>
            Get your free demo
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </button>
      <p className="text-center text-xs text-mk-text-muted">
        Free to try. No credit card required.
      </p>
    </form>
  );
}
