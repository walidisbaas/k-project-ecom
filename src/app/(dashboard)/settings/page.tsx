"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Settings2,
  CreditCard,
  Mail,
  ShoppingBag,
  ExternalLink,
  Loader2,
  RefreshCw,
  Globe,
  CheckCircle2,
} from "lucide-react";
import type { Store, Merchant } from "@/types";

function SettingsContent() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get("store");

  const [store, setStore] = useState<Store | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeSuccess, setScrapeSuccess] = useState(false);

  // Editable fields
  const [storeName, setStoreName] = useState("");
  const [autoSend, setAutoSend] = useState(false);

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [storeRes, merchantRes] = await Promise.all([
          fetch(`/api/stores/${storeId}`),
          fetch("/api/stores"),
        ]);

        if (storeRes.ok) {
          const storeData = (await storeRes.json()) as { data: Store };
          setStore(storeData.data);
          setStoreName(storeData.data.store_name);
          setAutoSend(storeData.data.auto_send);
        }

        if (merchantRes.ok) {
          const mData = (await merchantRes.json()) as { merchant?: Merchant };
          setMerchant(mData.merchant ?? null);
        }
      } catch {
        // Failed to load
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, [storeId]);

  const handleSaveStore = async () => {
    if (!storeId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/stores/${storeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_name: storeName,
          auto_send: autoSend,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleRescrape = async () => {
    if (!storeId || !store?.website_url) return;
    setScraping(true);
    setScrapeSuccess(false);
    try {
      const res = await fetch(`/api/stores/${storeId}/scrape`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to start scrape");
      setScrapeSuccess(true);
      // Refresh store data after a delay to pick up new scrape status
      setTimeout(async () => {
        try {
          const storeRes = await fetch(`/api/stores/${storeId}`);
          if (storeRes.ok) {
            const storeData = (await storeRes.json()) as { data: Store };
            setStore(storeData.data);
          }
        } catch {
          // Silently fail
        }
      }, 2000);
    } catch {
      // Failed to trigger scrape
    } finally {
      setScraping(false);
    }
  };

  const handleBillingPortal = async () => {
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed");
      const data = (await res.json()) as { url: string };
      window.location.href = data.url;
    } catch {
      // Failed to open billing portal
    }
  };

  if (!storeId) {
    return (
      <div className="flex h-64 items-center justify-center text-mk-text-muted">
        Select a store to manage settings.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-mk-text font-heading">Settings</h1>
      <p className="mt-1 text-mk-text-muted">
        Manage your store configuration and billing.
      </p>

      {/* Store settings */}
      <div className="mt-8 rounded-xl border border-mk-border bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="h-5 w-5 text-mk-text-muted" />
          <h2 className="text-lg font-semibold text-mk-text">
            Store settings
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-mk-text-secondary">
              Store name
            </label>
            <Input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-mk-border p-4">
            <div>
              <p className="text-sm font-medium text-mk-text">
                Auto-send replies
              </p>
              <p className="text-xs text-mk-text-muted">
                When enabled, AI replies are sent immediately. When disabled,
                all replies go to the review queue.
              </p>
            </div>
            <Switch checked={autoSend} onCheckedChange={setAutoSend} />
          </div>

          <Button
            onClick={handleSaveStore}
            disabled={saving}
            className="bg-mk-accent hover:bg-mk-accent-hover"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Connections */}
      <div className="rounded-xl border border-mk-border bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-mk-text">
          Connections
        </h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-mk-border p-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-mk-accent" />
              <div>
                <p className="text-sm font-medium text-mk-text">Email</p>
                <p className="text-xs text-mk-text-muted">
                  {store?.has_broken_connection
                    ? "Connection broken — reconnect required"
                    : "Connected via Nylas"}
                </p>
              </div>
            </div>
            <Badge
              className={
                store?.has_broken_connection
                  ? "bg-red-100 text-red-700"
                  : "bg-mk-green-light text-mk-green"
              }
            >
              {store?.has_broken_connection ? "Broken" : "Active"}
            </Badge>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-mk-border p-4">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-5 w-5 text-mk-green" />
              <div>
                <p className="text-sm font-medium text-mk-text">Shopify</p>
                <p className="text-xs text-mk-text-muted">
                  Order lookup integration
                </p>
              </div>
            </div>
            <Badge className="bg-mk-green-light text-mk-green">Connected</Badge>
          </div>
        </div>
      </div>

      <Separator className="my-6" />

      {/* Website scanning */}
      {store?.website_url && (
        <>
          <div className="rounded-xl border border-mk-border bg-white p-6">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="h-5 w-5 text-mk-text-muted" />
              <h2 className="text-lg font-semibold text-mk-text">
                Website scanning
              </h2>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-mk-border p-4">
              <div>
                <p className="text-sm font-medium text-mk-text">
                  {store.website_url}
                </p>
                <p className="text-xs text-mk-text-muted">
                  Re-scan to update brand voice, policies, and FAQs from your
                  website.
                </p>
              </div>
              <Badge
                className={
                  store.scrape_status === "scraping"
                    ? "bg-yellow-100 text-yellow-700"
                    : store.scrape_status === "complete"
                      ? "bg-mk-green-light text-mk-green"
                      : "bg-mk-bg-warm text-mk-text-muted"
                }
              >
                {store.scrape_status === "scraping"
                  ? "Scanning..."
                  : store.scrape_status === "complete"
                    ? "Scanned"
                    : store.scrape_status}
              </Badge>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleRescrape}
                disabled={scraping || store.scrape_status === "scraping"}
              >
                {scraping || store.scrape_status === "scraping" ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Re-scan website
                  </>
                )}
              </Button>
              {scrapeSuccess && (
                <span className="flex items-center gap-1 text-sm text-mk-green">
                  <CheckCircle2 className="h-4 w-4" />
                  Scan started
                </span>
              )}
            </div>
          </div>

          <Separator className="my-6" />
        </>
      )}

      {/* Billing */}
      <div className="rounded-xl border border-mk-border bg-white p-6">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="h-5 w-5 text-mk-text-muted" />
          <h2 className="text-lg font-semibold text-mk-text">Billing</h2>
        </div>

        {merchant && (
          <div className="mb-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-mk-text-secondary">Current plan</p>
              <Badge className="bg-mk-accent-light text-mk-accent capitalize">
                {merchant.plan}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-mk-text-secondary">Usage this month</p>
              <p className="text-sm font-medium text-mk-text">
                {merchant.emails_used_this_month} / {merchant.emails_limit}
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-mk-border">
              <div
                className="h-full rounded-full bg-mk-accent"
                style={{
                  width: `${Math.min(
                    (merchant.emails_used_this_month / merchant.emails_limit) *
                      100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        <Button variant="outline" onClick={handleBillingPortal}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Manage billing
        </Button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  );
}
