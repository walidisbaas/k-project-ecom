"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewStorePage() {
  const router = useRouter();
  const [storeName, setStoreName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_name: storeName,
          website_url: websiteUrl || null,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to create store");
      }

      const data = (await res.json()) as { data: { id: string } };
      router.push(`/onboarding?store_id=${data.data.id}`);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <Link
        href="/stores"
        className="mb-6 inline-flex items-center gap-1 text-sm text-mk-text-muted hover:text-mk-text-secondary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to stores
      </Link>

      <div className="rounded-2xl border border-mk-border bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-mk-text font-heading">Add a new store</h1>
        <p className="mt-2 text-mk-text-muted">
          We&apos;ll analyze your website to set up Kenso AI automatically.
        </p>

        <form onSubmit={handleCreate} className="mt-8 space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-mk-text-secondary">
              Store name
            </label>
            <Input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="My Shopify Store"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-mk-text-secondary">
              Website URL
            </label>
            <Input
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://mystore.com"
            />
            <p className="mt-1 text-xs text-mk-text-muted">
              We&apos;ll scan your website to learn your brand voice and
              policies.
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-mk-accent hover:bg-mk-accent-hover"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Continue →"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
