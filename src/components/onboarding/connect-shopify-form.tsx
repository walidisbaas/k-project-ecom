"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, Lock, Store } from "lucide-react";

/** Derive a likely myshopify.com domain from a website URL */
function deriveShopDomain(websiteUrl: string): string {
  try {
    const hostname = new URL(websiteUrl).hostname.replace(/^www\./, "");
    const name = hostname.split(".")[0];
    return `${name}.myshopify.com`;
  } catch {
    return "";
  }
}

interface ConnectShopifyFormProps {
  storeId: string;
  connected?: boolean;
  shopDomain?: string;
  websiteUrl?: string | null;
}

export function ConnectShopifyForm({
  storeId,
  connected = false,
  shopDomain,
  websiteUrl,
}: ConnectShopifyFormProps) {
  const [loading, setLoading] = useState(false);

  const derivedDomain = websiteUrl ? deriveShopDomain(websiteUrl) : "";

  const handleConnect = async () => {
    const shop = derivedDomain;
    if (!shop) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/auth/shopify/callback?store_id=${storeId}&shop=${encodeURIComponent(shop)}&action=auth_url`
      );
      if (!res.ok) throw new Error("Failed to get auth URL");
      const data = (await res.json()) as { url: string };
      window.location.href = data.url;
    } catch {
      // Failed to connect Shopify
    } finally {
      setLoading(false);
    }
  };

  if (connected) {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-mk-green/20 bg-mk-green-light px-6 py-8 text-center">
        <CheckCircle className="h-8 w-8 text-mk-green" />
        <p className="mt-3 text-lg font-medium text-mk-green">
          Shopify connected
        </p>
        {shopDomain && (
          <p className="mt-1 text-sm text-mk-green/80">{shopDomain}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">
      {derivedDomain && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-mk-bg px-4 py-2.5">
          <Store className="h-4 w-4 text-mk-text-muted" />
          <span className="text-sm text-mk-text-secondary">
            {derivedDomain}
          </span>
        </div>
      )}
      <Button
        onClick={handleConnect}
        disabled={loading || !derivedDomain}
        size="lg"
        className="h-14 w-full bg-mk-green text-base hover:bg-mk-green/90"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Connecting...
          </>
        ) : (
          "Connect Shopify"
        )}
      </Button>
      <p className="mt-4 flex items-center gap-1.5 text-xs text-mk-text-muted">
        <Lock className="h-3 w-3" />
        Read-only OAuth access — Kenso never modifies your Shopify data
      </p>
    </div>
  );
}
