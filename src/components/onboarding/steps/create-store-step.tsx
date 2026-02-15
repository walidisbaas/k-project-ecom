"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Sparkles } from "lucide-react";

/** Normalize URL input: accept mystore.com, www.mystore.com, or https://... */
function normalizeWebsiteUrl(input: string): string {
  let url = input.trim();
  if (!url) return "";
  url = url.replace(/\/+$/, ""); // trim trailing slashes
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }
  return url;
}

interface CreateStoreStepProps {
  onCreated: (storeId: string) => void;
}

export function CreateStoreStep({ onCreated }: CreateStoreStepProps) {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUrl = normalizeWebsiteUrl(websiteUrl);
    if (!normalizedUrl) return;
    setLoading(true);

    // Derive store name from URL domain
    let storeName = normalizedUrl;
    try {
      const hostname = new URL(normalizedUrl).hostname.replace(/^www\./, "");
      storeName = hostname.split(".")[0];
      storeName = storeName.charAt(0).toUpperCase() + storeName.slice(1);
    } catch {
      // fallback to raw input
    }

    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_name: storeName,
          website_url: normalizedUrl,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to create store");
      }

      const data = (await res.json()) as { data: { id: string } };
      onCreated(data.data.id);
    } catch {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center">
      <div className="w-full max-w-lg text-center onboarding-stagger-1">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-mk-accent-light">
          <Sparkles className="h-8 w-8 text-mk-accent" />
        </div>
        <h1 className="font-heading text-4xl leading-tight text-mk-text sm:text-5xl">
          Welcome to Kenso
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-mk-text-muted">
          Let&apos;s set up your AI-powered customer support in just a few
          minutes. Enter your website URL to get started.
        </p>
      </div>

      <form onSubmit={handleCreate} className="mt-10 w-full max-w-lg space-y-6 onboarding-stagger-2">
        <div>
          <Input
            type="text"
            inputMode="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="yourstore.com"
            required
            autoFocus
            className="h-14 text-center text-lg"
          />
          <p className="mt-3 text-center text-sm text-mk-text-muted">
            We&apos;ll scan your website to learn your brand voice and
            policies automatically.
          </p>
        </div>

        <Button
          type="submit"
          disabled={loading}
          size="lg"
          className="h-14 w-full bg-mk-accent text-base hover:bg-mk-accent-hover"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Creating your store...
            </>
          ) : (
            "Get started \u2192"
          )}
        </Button>
      </form>
    </div>
  );
}
