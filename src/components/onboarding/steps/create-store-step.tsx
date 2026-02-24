"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import type { Store, ScrapeExtractResult } from "@/types";

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

const LOADING_TEXTS = [
  "Scanning your website...",
  "Learning your brand voice...",
  "Setting up your AI assistant...",
];

const LOADING_DURATION = 7000;
const TEXT_INTERVAL = Math.floor(LOADING_DURATION / LOADING_TEXTS.length);

export function CreateStoreStep({ onCreated }: CreateStoreStepProps) {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [textIndex, setTextIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const storeIdRef = useRef<string | null>(null);
  const timerDoneRef = useRef(false);
  const imageReadyRef = useRef(false);

  // Rotate loading texts
  useEffect(() => {
    if (!loading) return;
    setTextIndex(0);
    const interval = setInterval(() => {
      setTextIndex((prev) => {
        if (prev >= LOADING_TEXTS.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, TEXT_INTERVAL);
    return () => clearInterval(interval);
  }, [loading]);

  // Trigger shrink animation then proceed to next step
  const startExit = useRef<() => void>(undefined);
  startExit.current = () => {
    if (exiting) return;
    setExiting(true);
    const id = storeIdRef.current!;
    setTimeout(() => onCreated(id), 400); // matches shrink duration
  };

  const tryProceedRef = useRef<() => void>(undefined);
  tryProceedRef.current = () => {
    if (timerDoneRef.current && storeIdRef.current && imageReadyRef.current) {
      startExit.current!();
    }
  };

  // 7-second timer — proceed when both timer + API are done + image preloaded
  useEffect(() => {
    if (!loading) return;
    timerDoneRef.current = false;
    imageReadyRef.current = false;
    const timeout = setTimeout(() => {
      timerDoneRef.current = true;
      tryProceedRef.current!();
    }, LOADING_DURATION);
    return () => clearTimeout(timeout);
  }, [loading]);

  // Poll for scrape completion & preload screenshot into browser cache
  useEffect(() => {
    if (!loading) return;

    const interval = setInterval(async () => {
      const id = storeIdRef.current;
      if (!id || imageReadyRef.current) return;

      try {
        const res = await fetch(`/api/stores/${id}`);
        if (!res.ok) return;
        const data = (await res.json()) as { data: Store };
        const scrapeData = data.data.scrape_data as ScrapeExtractResult | null;
        const url = scrapeData?.screenshot_url;

        if (data.data.scrape_status === "failed") {
          // No image to preload — let confirm step handle the error
          imageReadyRef.current = true;
          tryProceedRef.current!();
          return;
        }

        if (!url) return; // still scraping

        // Preload the image into browser cache
        const img = new window.Image();
        img.src = url;
        img.onload = () => {
          imageReadyRef.current = true;
          tryProceedRef.current!();
        };
        img.onerror = () => {
          imageReadyRef.current = true;
          tryProceedRef.current!();
        };
      } catch {
        // keep polling
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [loading]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedUrl = normalizeWebsiteUrl(websiteUrl);
    if (!normalizedUrl) return;
    storeIdRef.current = null;
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
      storeIdRef.current = data.data.id;
    } catch {
      setLoading(false);
    }
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center">
        <div className="flex flex-col items-center">
          <div className={`h-44 w-44 ${exiting ? "animate-lottie-shrink" : "animate-lottie-grow"}`}>
            <DotLottieReact
              src="https://lottie.host/acc1a2c9-d5a0-4f40-aece-dce57e0fba82/gatZAs7ixQ.lottie"
              loop
              autoplay
            />
          </div>

          <p
            key={textIndex}
            className="mt-8 animate-fade-in bg-gradient-to-r from-mk-accent via-[#E8873A] to-[#C44D15] bg-clip-text text-center text-xl font-medium text-transparent"
          >
            {LOADING_TEXTS[textIndex]}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col items-center justify-center">
      <div className="w-full max-w-2xl text-center onboarding-stagger-1">
        <div className="mx-auto mb-6 h-24 w-24">
          <DotLottieReact
            src="https://lottie.host/acc1a2c9-d5a0-4f40-aece-dce57e0fba82/gatZAs7ixQ.lottie"
            loop
            autoplay
          />
        </div>
        <h1 className="font-heading text-4xl leading-tight text-mk-text sm:text-5xl">
          Welcome to Kenso
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-mk-text-muted">
          Set up your AI-powered customer support in minutes.
          <br />
          Enter your website URL to get started.
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
            className="h-14 bg-white text-center text-lg"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          size="lg"
          className="h-14 w-full bg-mk-accent text-base hover:bg-mk-accent-hover"
        >
          Get started &rarr;
        </Button>
      </form>
    </div>
  );
}
