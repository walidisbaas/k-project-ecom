"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLANS } from "@/types";
import type { PlanName, PlanPricing } from "@/types";

// ── Billing intervals ──────────────────────────────────────────

type BillingInterval = keyof PlanPricing;

const INTERVALS: { key: BillingInterval; label: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" },
  { key: "yearly", label: "Yearly" },
];

// ── Plan card config ───────────────────────────────────────────

interface PlanCard {
  key: PlanName;
  title: string;
  subtitle: string;
  popular?: boolean;
}

const PLAN_CARDS: PlanCard[] = [
  {
    key: "starter",
    title: "Starter",
    subtitle: "For small stores getting started",
  },
  {
    key: "growth",
    title: "Growth",
    subtitle: "For growing brands with volume",
    popular: true,
  },
  {
    key: "scale",
    title: "Scale",
    subtitle: "For high-volume operations",
  },
];

// ── Component ──────────────────────────────────────────────────

interface GoLiveStepProps {
  storeId: string;
  onBack: () => void;
}

export function GoLiveStep({ storeId, onBack }: GoLiveStepProps) {
  const [interval, setInterval] = useState<BillingInterval>("quarterly");

  const handleCheckout = async (priceIdEnv: string) => {
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          price_id: priceIdEnv,
          store_id: storeId,
          interval,
        }),
      });

      if (!res.ok) throw new Error("Failed to create checkout");
      const data = (await res.json()) as { url: string };
      window.location.href = data.url;
    } catch {
      // Failed to start checkout
    }
  };

  return (
    <div className="py-10">
      <div className="text-center onboarding-stagger-1">
        <h1 className="font-heading text-4xl leading-tight text-mk-text sm:text-5xl">
          You&apos;re all set
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-lg leading-relaxed text-mk-text-muted">
          Choose a plan to activate your AI customer support agent. Start
          saving hours every week.
        </p>
      </div>

      {/* Billing interval toggle */}
      <div className="mx-auto mt-8 flex items-center justify-center onboarding-stagger-2">
        <div className="inline-flex rounded-full border border-mk-border bg-white p-1">
          {INTERVALS.map((opt) => {
            const savings =
              opt.key !== "monthly"
                ? Math.round(
                    ((PLANS.growth.pricing.monthly -
                      PLANS.growth.pricing[opt.key]) /
                      PLANS.growth.pricing.monthly) *
                      100
                  )
                : 0;

            return (
              <button
                key={opt.key}
                onClick={() => setInterval(opt.key)}
                className={cn(
                  "relative rounded-full px-6 py-2.5 text-sm font-medium transition-all",
                  interval === opt.key
                    ? "bg-mk-text text-white shadow-sm"
                    : "text-mk-text-muted hover:text-mk-text-secondary"
                )}
              >
                {opt.label}
                {savings > 0 && (
                  <span
                    className={cn(
                      "ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold",
                      interval === opt.key
                        ? "bg-white/20 text-white"
                        : "bg-mk-green-light text-mk-green"
                    )}
                  >
                    Save {savings}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pricing cards */}
      <div className="mx-auto mt-8 grid max-w-4xl gap-5 sm:grid-cols-3 onboarding-stagger-3">
        {PLAN_CARDS.map((card) => {
          const plan = PLANS[card.key];
          const price = plan.pricing[interval];
          const monthlyPrice = plan.pricing.monthly;

          return (
            <div
              key={card.key}
              className={cn(
                "group relative overflow-hidden rounded-2xl bg-white transition-all hover:shadow-lg hover:-translate-y-0.5",
                card.popular
                  ? "border-2 border-mk-accent"
                  : "border border-mk-border"
              )}
            >
              {card.popular && (
                <div className="absolute right-4 top-5">
                  <div className="flex items-center gap-1 rounded-full bg-mk-accent px-3 py-1">
                    <Sparkles className="h-3 w-3 text-white" />
                    <span className="text-[11px] font-bold text-white">
                      Most popular
                    </span>
                  </div>
                </div>
              )}

              <div className="p-7">
                <p className="text-lg font-bold text-mk-text">{card.title}</p>
                <p className="mt-1 text-sm text-mk-text-muted">
                  {card.subtitle}
                </p>

                <div className="mt-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold tracking-tight text-mk-text">
                      &euro;{price}
                    </span>
                    <span className="text-base text-mk-text-muted">/mo</span>
                  </div>
                  {interval !== "monthly" && (
                    <p className="mt-1.5 text-sm text-mk-text-muted">
                      &euro;{price * (interval === "quarterly" ? 3 : 12)} billed{" "}
                      {interval === "quarterly" ? "every 3 months" : "annually"}
                    </p>
                  )}
                  {interval !== "monthly" && (
                    <p className="mt-0.5 text-sm font-medium text-mk-green">
                      Save &euro;{(monthlyPrice - price) * 12}/year
                    </p>
                  )}
                </div>

                <button
                  onClick={() => handleCheckout(plan.price_id_env)}
                  className={cn(
                    "mt-6 w-full rounded-xl py-3 text-sm font-semibold transition-colors",
                    card.popular
                      ? "bg-mk-accent text-white hover:bg-mk-accent-hover"
                      : "border-2 border-mk-text bg-mk-text text-white hover:bg-mk-text/90"
                  )}
                >
                  Get started
                </button>

                <ul className="mt-5 space-y-2.5">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2.5 text-sm text-mk-text-secondary"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-mk-green" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-center onboarding-stagger-4">
        <Button variant="outline" size="lg" onClick={onBack} className="h-12">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    </div>
  );
}
