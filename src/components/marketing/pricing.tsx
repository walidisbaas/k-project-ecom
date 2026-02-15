import Link from "next/link";
import { Check } from "lucide-react";

const PLANS = [
  {
    name: "Starter",
    description: "For stores getting started",
    price: "€79",
    period: "/month",
    features: [
      "500 AI emails/month",
      "Shopify integration",
      "Order tracking & FAQs",
      "Brand voice customization",
      "Email support",
    ],
    featured: false,
  },
  {
    name: "Growth",
    description: "For stores scaling up",
    price: "€199",
    period: "/month",
    badge: "Most Popular",
    features: [
      "2,500 AI emails/month",
      "Everything in Starter",
      "Returns & exchange handling",
      "Smart escalation rules",
      "Priority support",
    ],
    featured: true,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="px-6 py-20">
      <div className="mx-auto max-w-[680px]">
        {/* Section label */}
        <p className="text-center text-sm font-semibold uppercase tracking-[1.5px] text-mk-accent-text">
          Simple pricing
        </p>

        {/* Headline */}
        <h2 className="mt-4 text-center font-heading text-[clamp(32px,4.5vw,44px)] leading-[1.15] text-mk-text">
          Less than the cost of one VA hour per day.
        </h2>

        {/* Plans */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl border bg-white/95 p-7 shadow-[0_2px_8px_rgba(26,18,7,0.04)] backdrop-blur-sm transition-all hover:shadow-[0_8px_24px_rgba(26,18,7,0.08)] ${
                plan.featured
                  ? "border-mk-accent shadow-[0_0_0_1px_var(--mk-accent),0_4px_16px_rgba(224,90,26,0.12)]"
                  : "border-mk-border"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-mk-accent px-4 py-1 text-sm font-semibold text-white">
                  {plan.badge}
                </span>
              )}

              <h3 className="text-xl font-bold text-mk-text">{plan.name}</h3>
              <p className="mt-1 text-base text-mk-text-muted">
                {plan.description}
              </p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-5xl font-bold text-mk-text">
                  {plan.price}
                </span>
                <span className="text-base text-mk-text-muted">{plan.period}</span>
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-mk-green" />
                    <span className="text-base text-mk-text-secondary">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={`mt-7 block rounded-[10px] py-3 text-center text-base font-semibold transition-all hover:-translate-y-0.5 ${
                  plan.featured
                    ? "bg-mk-accent text-white shadow-[0_2px_8px_rgba(224,90,26,0.3)] hover:bg-mk-accent-hover"
                    : "border border-mk-border bg-white text-mk-text hover:border-mk-text"
                }`}
              >
                Start Free Trial
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
