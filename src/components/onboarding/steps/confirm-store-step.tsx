"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Globe,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import type { Store, ScrapeExtractResult } from "@/types";

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 120_000; // 2 minutes max

interface ConfirmStoreStepProps {
  storeId: string;
  onNext: () => void;
  onBack: () => void;
}

export function ConfirmStoreStep({
  storeId,
  onNext,
  onBack,
}: ConfirmStoreStepProps) {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [scrapeFailed, setScrapeFailed] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const pollStartRef = useRef<number>(0);

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await fetch(`/api/stores/${storeId}`);
        if (res.ok) {
          const data = (await res.json()) as { data: Store };
          setStore(data.data);

          if (data.data.scrape_status === "failed") {
            setScrapeFailed(true);
          } else if (
            data.data.scrape_status === "pending" ||
            data.data.scrape_status === "scraping"
          ) {
            setScraping(true);
            pollStartRef.current = Date.now();
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    void fetchStore();
  }, [storeId]);

  // Poll while scraping is in progress, with timeout
  useEffect(() => {
    if (!scraping) return;

    const interval = setInterval(async () => {
      if (Date.now() - pollStartRef.current > POLL_TIMEOUT_MS) {
        setScraping(false);
        setScrapeFailed(true);
        clearInterval(interval);
        return;
      }

      try {
        const res = await fetch(`/api/stores/${storeId}`);
        if (res.ok) {
          const data = (await res.json()) as { data: Store };
          setStore(data.data);
          if (data.data.scrape_status === "complete") {
            setScraping(false);
            setScrapeFailed(false);
          } else if (data.data.scrape_status === "failed") {
            setScraping(false);
            setScrapeFailed(true);
          }
        }
      } catch {
        // keep polling
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [scraping, storeId]);

  const handleRetry = async () => {
    setRetrying(true);
    setScrapeFailed(false);
    setImageLoaded(false);
    try {
      const res = await fetch(`/api/stores/${storeId}/scrape`, {
        method: "POST",
      });
      if (res.ok) {
        setScraping(true);
        pollStartRef.current = Date.now();
      } else {
        setScrapeFailed(true);
      }
    } catch {
      setScrapeFailed(true);
    } finally {
      setRetrying(false);
    }
  };

  const scrapeData = store?.scrape_data as ScrapeExtractResult | null;
  const screenshotUrl = scrapeData?.screenshot_url;

  // Preload screenshot so it appears all at once
  useEffect(() => {
    if (!screenshotUrl) {
      setImageLoaded(false);
      return;
    }
    const img = new Image();
    img.src = screenshotUrl;
    img.onload = () => setImageLoaded(true);
    img.onerror = () => setImageLoaded(false);
  }, [screenshotUrl]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="py-10">
      <div className="text-center onboarding-stagger-1">
        <h1 className="font-heading text-4xl leading-tight text-mk-text sm:text-5xl">
          Is this your store?
        </h1>
        <p className="mx-auto mt-4 max-w-md text-lg leading-relaxed text-mk-text-muted">
          We found{" "}
          <span className="font-medium text-mk-text-secondary">
            {store?.store_name}
          </span>{" "}
          — confirm this is correct so we can set up your AI agent.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-2xl onboarding-stagger-2">
        {scraping || (screenshotUrl && !imageLoaded) ? (
          <div className="overflow-hidden rounded-2xl border border-mk-border bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-mk-border bg-mk-bg px-4 py-2.5">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-mk-border" />
                <span className="h-3 w-3 rounded-full bg-mk-border" />
                <span className="h-3 w-3 rounded-full bg-mk-border" />
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-md bg-white px-3 py-1 text-sm text-mk-text-muted">
                <Globe className="h-3.5 w-3.5" />
                {store?.website_url}
              </div>
            </div>
            <div className="relative overflow-hidden bg-white p-5">
              {/* Skeleton nav */}
              <div className="flex items-center justify-between">
                <div className="h-4 w-20 rounded bg-gray-100" />
                <div className="flex gap-3">
                  <div className="h-3 w-12 rounded-full bg-gray-100" />
                  <div className="h-3 w-12 rounded-full bg-gray-100" />
                  <div className="h-3 w-12 rounded-full bg-gray-100" />
                </div>
              </div>
              {/* Skeleton hero */}
              <div className="mt-5 h-36 w-full rounded-lg bg-gray-100" />
              {/* Skeleton content rows */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="h-16 rounded-md bg-gray-100" />
                <div className="h-16 rounded-md bg-gray-100" />
                <div className="h-16 rounded-md bg-gray-100" />
              </div>
              <div className="mt-3 flex gap-3">
                <div className="h-3 w-2/3 rounded-full bg-gray-100" />
                <div className="h-3 w-1/3 rounded-full bg-gray-100" />
              </div>
              <div className="mt-2 flex gap-3">
                <div className="h-3 w-1/2 rounded-full bg-gray-100" />
                <div className="h-3 w-1/4 rounded-full bg-gray-100" />
              </div>
              {/* Shimmer overlay */}
              <div className="pointer-events-none absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/70 to-transparent" />
            </div>
          </div>
        ) : scrapeFailed ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-mk-border bg-white px-6 py-10">
            <AlertCircle className="mb-3 h-7 w-7 text-red-500" />
            <p className="text-base font-medium text-mk-text">
              Something went wrong
            </p>
            <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-relaxed text-mk-text-muted">
              We couldn&apos;t reach{" "}
              <span className="inline-block rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-mk-text-secondary">
                {store?.website_url}
              </span>
              . Double check that this is the right domain and try again.
            </p>
            <div className="mt-5 flex gap-3">
              <Button variant="outline" size="sm" onClick={onBack}>
                Change URL
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={retrying}
              >
                {retrying ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCcw className="mr-2 h-4 w-4" />
                )}
                Try again
              </Button>
            </div>
          </div>
        ) : screenshotUrl ? (
          <div className="overflow-hidden rounded-2xl border border-mk-border bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-mk-border bg-mk-bg px-4 py-2.5">
              <div className="flex gap-1.5">
                <span className="h-3 w-3 rounded-full bg-mk-border" />
                <span className="h-3 w-3 rounded-full bg-mk-border" />
                <span className="h-3 w-3 rounded-full bg-mk-border" />
              </div>
              <div className="flex flex-1 items-center gap-2 rounded-md bg-white px-3 py-1 text-sm text-mk-text-muted">
                <Globe className="h-3.5 w-3.5" />
                {store?.website_url}
              </div>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screenshotUrl}
              alt={`Screenshot of ${store?.store_name}`}
              className="w-full"
            />
          </div>
        ) : (
          <div className="flex h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-mk-border bg-white">
            <Globe className="mb-4 h-10 w-10 text-mk-text-muted" />
            <p className="text-base font-medium text-mk-text-secondary">
              {store?.store_name}
            </p>
            <p className="mt-1 text-sm text-mk-text-muted">
              {store?.website_url}
            </p>
          </div>
        )}
      </div>

      <div className="mt-8 flex justify-between onboarding-stagger-3">
        <Button variant="outline" size="lg" onClick={onBack} className="h-12">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          disabled={scraping || (!!screenshotUrl && !imageLoaded)}
          size="lg"
          className="h-12 bg-mk-accent hover:bg-mk-accent-hover"
        >
          {scrapeFailed ? "Continue anyway" : "Yes, this is my store"}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
