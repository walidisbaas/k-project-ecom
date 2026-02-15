"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const FAQ_ITEMS = [
  {
    question: "What if the AI says something wrong?",
    answer:
      "Kenso only responds with data it pulls directly from your Shopify store — real order numbers, real tracking links, real product info. It doesn't make things up. And for anything it's not confident about, it flags it for you instead of guessing.",
  },
  {
    question: "Will it sound like a robot to my customers?",
    answer:
      "No. Kenso adapts to your brand voice — friendly, professional, casual, whatever matches your store. Most customers can't tell it's AI. You can review and adjust the tone anytime.",
  },
  {
    question: "What emails does it NOT handle?",
    answer:
      "Complex complaints, legal issues, or anything where a human touch matters. Kenso detects these automatically and forwards them to your inbox with full context so you can jump in quickly. You set the rules for what gets escalated.",
  },
  {
    question: "How long does setup actually take?",
    answer:
      "About 2 minutes. Connect Shopify (one click), connect your email (one click), review your settings, and go live. Kenso automatically imports your products, policies, and order data — no manual setup needed.",
  },
  {
    question: "Can I try it before paying?",
    answer:
      "Yes. Your first 100 emails are free, no credit card required. You'll see exactly how Kenso handles your real customer emails before you spend anything.",
  },
  {
    question: "What if I already use Gorgias or another helpdesk?",
    answer:
      "Kenso works standalone — just plug in your email and go. We're building integrations with Gorgias, Zendesk, and Freshdesk for stores that want to add Kenso as an AI layer on top of their existing setup.",
  },
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-[680px]">
        <h2 className="text-center font-heading text-[clamp(32px,4.5vw,44px)] leading-[1.15] text-mk-text">
          Questions you probably have.
        </h2>

        <div className="mt-12 space-y-3">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-mk-border bg-white/90 shadow-[0_1px_2px_rgba(26,18,7,0.03)] backdrop-blur-sm transition-shadow hover:shadow-[0_2px_8px_rgba(26,18,7,0.05)]"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left transition-colors hover:bg-mk-bg/50"
                >
                  <span className="pr-4 text-base font-semibold text-mk-text">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-mk-text-muted transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-[grid-template-rows] duration-200 ease-out",
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  )}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 text-base leading-relaxed text-mk-text-secondary">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
