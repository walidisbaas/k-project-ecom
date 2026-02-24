"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";

interface FeaturesOverviewStepProps {
  onNext: () => void;
  onBack: () => void;
}

const FEATURES = [
  {
    iconSrc: "/flows-icon.svg",
    title: "Customise your email agent",
    description:
      "Control exactly how your agent responds to returns, refunds, sizing questions — any scenario & any language.",
  },
  {
    iconSrc: "/gmail-icon.svg",
    title: "Connect your support email",
    description:
      "Kenso reads and auto-responds to customer emails so you never miss a message. Or approve each reply manually before sending.",
  },
  {
    iconSrc: "/shopify-icon-green.svg",
    title: "Connect your Shopify store",
    optional: true,
    description:
      "Pull in real order data so your AI gives accurate shipping & order status answers. Or just train it on FAQ's.",
  },
] as const;

export function FeaturesOverviewStep({
  onNext,
  onBack,
}: FeaturesOverviewStepProps) {
  return (
    <div className="py-10">
      {/* Header */}
      <div className="text-center onboarding-stagger-1">
        <h1 className="font-heading text-3xl leading-tight text-mk-text sm:text-5xl">
          Here&apos;s what you&apos;ll unlock
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-mk-text-muted sm:text-lg">
          That was just a preview. Once set up, your AI agent can do so much more.
        </p>
      </div>

      {/* Features container — glassy border */}
      <div className="glassy-card mx-auto mt-10 max-w-lg overflow-hidden rounded-2xl onboarding-stagger-2">
        <div className="divide-y divide-white/40">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex items-start gap-3.5 px-4 py-4 sm:gap-5 sm:px-6 sm:py-6"
            >
              {/* Icon */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/60 bg-white shadow-sm sm:h-11 sm:w-11">
                <Image
                  src={feature.iconSrc}
                  alt=""
                  width={24}
                  height={24}
                  className="h-6 w-6 object-contain"
                />
              </div>

              {/* Text */}
              <div className="min-w-0">
                <p className="text-base font-semibold text-mk-text">
                  {feature.title}
                  {"optional" in feature && feature.optional && (
                    <span className="ml-1.5 text-xs font-normal text-gray-400">
                      (Optional)
                    </span>
                  )}
                </p>
                <p className="mt-0.5 text-base leading-relaxed text-mk-text-muted sm:text-sm">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="mx-auto mt-10 flex max-w-lg justify-between onboarding-stagger-3">
        <Button
          variant="outline"
          size="lg"
          onClick={onBack}
          className="h-12"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={onNext}
          size="lg"
          className="h-12 bg-mk-accent hover:bg-mk-accent-hover"
        >
          Continue
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
