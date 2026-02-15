"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  ArrowLeft,
  Mail,
  Bot,
  Inbox,
  CornerDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Store, ScrapeExtractResult } from "@/types";

// ── Fake email data ────────────────────────────────────────────

interface FakeEmail {
  id: number;
  from: string;
  initials: string;
  subject: string;
  snippet: string;
  time: string;
  intent: string;
  replyFn: (store: Store, scrape: ScrapeExtractResult | null) => string;
}

const FAKE_EMAILS: FakeEmail[] = [
  {
    id: 1,
    from: "Sarah M.",
    initials: "SM",

    subject: "Where is my order #1847?",
    snippet:
      "Hi, I placed an order last week and haven't received any shipping updates yet. Can you check the status?",
    time: "10:32 AM",
    intent: "WISMO",
    replyFn: (store, scrape) =>
      `Hi Sarah,\n\nThank you for reaching out! I'd be happy to help you track down order #1847.\n\nI've looked into your order and it's currently being prepared for shipment. ${scrape?.shipping_policy ? `As a reminder, ${scrape.shipping_policy.split(".")[0].toLowerCase()}.` : "You should receive a shipping confirmation with tracking details shortly."}\n\nIf you don't receive an update within 24 hours, please don't hesitate to reply to this email and we'll escalate this right away.\n\n${store.sign_off || "Best regards"},\n${store.store_name} Support`,
  },
  {
    id: 2,
    from: "James K.",
    initials: "JK",

    subject: "I'd like to return my purchase",
    snippet:
      "Hello, I received my order but it doesn't fit as expected. How do I start a return?",
    time: "9:15 AM",
    intent: "RETURN",
    replyFn: (store, scrape) =>
      `Hi James,\n\nI'm sorry to hear the item didn't work out! We want to make sure you're completely happy with your purchase.\n\n${scrape?.return_policy ? `Here's what you need to know about our return process: ${scrape.return_policy.split(".").slice(0, 2).join(".")}.` : "We offer hassle-free returns — simply reply with your order number and we'll send you a prepaid return label."}\n\nOnce we receive the returned item, we'll process your refund within 3-5 business days.\n\n${store.sign_off || "Best regards"},\n${store.store_name} Support`,
  },
  {
    id: 3,
    from: "Emily R.",
    initials: "ER",

    subject: "Do you ship internationally?",
    snippet:
      "Hey! I'm based in Canada and wondering if you ship here. What are the rates?",
    time: "Yesterday",
    intent: "SHIPPING",
    replyFn: (store, scrape) =>
      `Hi Emily,\n\nGreat question! We'd love to get our products to you in Canada.\n\n${scrape?.shipping_policy ? scrape.shipping_policy.split(".").slice(0, 2).join(".") + "." : "We do offer international shipping to select countries including Canada. Shipping rates are calculated at checkout based on your location and order weight."}\n\nFeel free to browse our store and the shipping options will appear at checkout!\n\n${store.sign_off || "Best regards"},\n${store.store_name} Support`,
  },
  {
    id: 4,
    from: "Michael T.",
    initials: "MT",

    subject: "Received wrong color",
    snippet:
      "I ordered the black version but received white instead. This is order #2103. Can you fix this?",
    time: "Yesterday",
    intent: "ORDER PROBLEM",
    replyFn: (store, scrape) =>
      `Hi Michael,\n\nI sincerely apologize for the mix-up with your order #2103. That's definitely not the experience we want you to have!\n\nI'll arrange for the correct item (black) to be shipped to you right away. ${scrape?.return_policy ? "You won't need to return the incorrect item first — we'll send you a prepaid label to return it at your convenience." : "We'll also send you a prepaid return label for the incorrect item."}\n\nYou should receive a shipping confirmation within 24 hours.\n\n${store.sign_off || "Best regards"},\n${store.store_name} Support`,
  },
  {
    id: 5,
    from: "Lisa W.",
    initials: "LW",

    subject: "Product recommendation needed",
    snippet:
      "Hi there! I'm looking for a gift for my sister. Can you suggest something in the $50 range?",
    time: "2 days ago",
    intent: "PRODUCT Q",
    replyFn: (store, scrape) =>
      `Hi Lisa,\n\nWhat a thoughtful gift! I'd love to help you find something special.\n\n${scrape?.company_summary ? `${scrape.company_summary.split(".")[0]}, so you'll find plenty of great options.` : "We have a wonderful selection that would make a perfect gift."} ${scrape?.product_categories?.length ? `Some of our most popular categories include ${scrape.product_categories.slice(0, 3).join(", ")}.` : ""}\n\nFor gifts in the $50 range, I'd recommend checking out our bestsellers — they're always crowd-pleasers! If you'd like something more specific, just let me know her interests and I'll narrow it down.\n\n${store.sign_off || "Best regards"},\n${store.store_name} Support`,
  },
];

// ── Component ──────────────────────────────────────────────────

interface PreviewStepProps {
  storeId: string;
  onNext: () => void;
  onBack: () => void;
}

export function PreviewStep({ storeId, onNext, onBack }: PreviewStepProps) {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(1);

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await fetch(`/api/stores/${storeId}`);
        if (res.ok) {
          const data = (await res.json()) as { data: Store };
          setStore(data.data);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };
    void fetchStore();
  }, [storeId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[420px] w-full rounded-2xl" />
      </div>
    );
  }

  const scrape = store?.scrape_data as ScrapeExtractResult | null;
  const selected = FAKE_EMAILS.find((e) => e.id === selectedId)!;
  const aiReply = selected.replyFn(store!, scrape);

  return (
    <div className="py-10">
      <div className="text-center onboarding-stagger-1">
        <h1 className="font-heading text-4xl leading-tight text-mk-text sm:text-5xl">
          See your AI agent in action
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-mk-text-muted">
          Preview how Kenso handles customer emails using your website data. No
          replies are sent — this is just a preview.
        </p>
      </div>

      {/* Browser-chrome mailbox */}
      <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-2xl border border-mk-border bg-white shadow-sm onboarding-stagger-2">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-mk-border bg-mk-bg px-4 py-2.5">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-mk-border" />
            <span className="h-3 w-3 rounded-full bg-mk-border" />
            <span className="h-3 w-3 rounded-full bg-mk-border" />
          </div>
          <div className="flex flex-1 items-center gap-2 rounded-md bg-white px-3 py-1 text-sm text-mk-text-muted">
            <Inbox className="h-3.5 w-3.5" />
            Kenso Inbox — {store?.store_name}
          </div>
        </div>

        {/* Mail layout */}
        <div className="flex min-h-[420px]">
          {/* Left: email list */}
          <div className="w-[280px] shrink-0 border-r border-mk-border bg-mk-bg/50">
            <div className="border-b border-mk-border px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-mk-text-muted">
                Inbox
              </p>
            </div>
            {FAKE_EMAILS.map((email) => (
              <button
                key={email.id}
                onClick={() => setSelectedId(email.id)}
                className={cn(
                  "flex w-full items-start gap-3 border-b border-mk-border/60 px-4 py-3 text-left transition-colors",
                  selectedId === email.id
                    ? "bg-white"
                    : "hover:bg-white/60"
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mk-border/60 text-xs font-semibold text-mk-text-secondary">
                  {email.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={cn(
                        "truncate text-sm",
                        selectedId === email.id
                          ? "font-semibold text-mk-text"
                          : "font-medium text-mk-text-secondary"
                      )}
                    >
                      {email.from}
                    </p>
                    <span className="shrink-0 text-[11px] text-mk-text-muted">
                      {email.time}
                    </span>
                  </div>
                  <p className="truncate text-xs font-medium text-mk-text-secondary">
                    {email.subject}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-mk-text-muted">
                    {email.snippet}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Right: selected email + AI reply */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Email header */}
            <div className="border-b border-mk-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mk-border/60 text-xs font-semibold text-mk-text-secondary">
                  {selected.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-mk-text">
                      {selected.from}
                    </p>
                    <span className="rounded-full bg-mk-accent-light px-2 py-0.5 text-[10px] font-semibold text-mk-accent">
                      {selected.intent}
                    </span>
                  </div>
                  <p className="text-xs text-mk-text-muted">
                    {selected.subject}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-mk-text-muted">
                  {selected.time}
                </span>
              </div>
            </div>

            {/* Email body */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <div className="flex items-start gap-2.5">
                <Mail className="mt-0.5 h-4 w-4 shrink-0 text-mk-text-muted" />
                <p className="text-sm leading-relaxed text-mk-text-secondary">
                  {selected.snippet}
                </p>
              </div>

              {/* AI reply */}
              <div className="mt-5 rounded-xl border border-mk-accent/20 bg-mk-accent-light/40 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-mk-accent">
                    <Bot className="h-3.5 w-3.5 text-white" />
                  </div>
                  <p className="text-xs font-semibold text-mk-accent">
                    Kenso AI reply
                  </p>
                  <CornerDownRight className="h-3 w-3 text-mk-text-muted" />
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-mk-text-secondary">
                  {aiReply}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 flex justify-between onboarding-stagger-3">
        <Button variant="outline" size="lg" onClick={onBack} className="h-12">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          size="lg"
          className="h-12 bg-mk-accent hover:bg-mk-accent-hover"
        >
          Looks good, continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
