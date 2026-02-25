"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowRight,
  ArrowLeft,
  Package,
  Clock,
  RefreshCw,
  Shield,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { StorePolicies } from "@/types";

// ── Info tooltip ────────────────────────────────────────────

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="ml-1 inline-flex text-mk-text-muted/60 hover:text-mk-text-muted transition-colors">
          <Info className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-56">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

// ── Segmented toggle ────────────────────────────────────────

interface SegmentedToggleProps {
  options: { key: number; label: string }[];
  value: number;
  onChange: (value: number) => void;
}

function SegmentedToggle({ options, value, onChange }: SegmentedToggleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const idx = options.findIndex((o) => o.key === value);
    // +1 to skip the indicator div
    const btn = container.children[idx + 1] as HTMLElement;
    if (btn) {
      setIndicator({ left: btn.offsetLeft, width: btn.offsetWidth });
    }
  }, [value, options]);

  return (
    <div
      ref={containerRef}
      className="relative inline-flex rounded-full border border-white/60 bg-white/40 p-0.5"
    >
      <div
        className="absolute top-0.5 bottom-0.5 rounded-full bg-white shadow-sm transition-all duration-300 ease-out"
        style={{ width: indicator.width, left: indicator.left }}
      />
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className={cn(
            "relative z-10 w-14 rounded-full py-2 text-center text-sm font-medium transition-colors duration-300",
            value === opt.key
              ? "text-mk-text"
              : "text-mk-text-muted hover:text-mk-text/70"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── Config options ──────────────────────────────────────────

const SHIPPING_OPTIONS = [
  { key: 1, label: "1d" },
  { key: 2, label: "2d" },
  { key: 7, label: "7d" },
  { key: 14, label: "14d" },
];

const RESPONSE_OPTIONS = [
  { key: 1, label: "1hr" },
  { key: 2, label: "2hr" },
  { key: 4, label: "4hr" },
  { key: 8, label: "8hr" },
];

const REFUND_OPTIONS = [
  { key: 10, label: "10%" },
  { key: 20, label: "20%" },
  { key: 30, label: "30%" },
];

const DEFAULT_POLICIES: StorePolicies = {
  shipping_days: 7,
  response_interval_hours: 4,
  trade_ins_enabled: false,
  receive_old_items: false,
  average_cogs: 10,
  prevent_refunds: false,
  offer_vouchers: false,
  offer_partial_refunds: false,
  partial_refund_percentage: 20,
};

// ── Component ───────────────────────────────────────────────

interface PolicyConfigStepProps {
  storeId: string;
  onNext: () => void;
  onBack: () => void;
}

export function PolicyConfigStep({
  storeId,
  onNext,
  onBack,
}: PolicyConfigStepProps) {
  const [policies, setPolicies] = useState<StorePolicies>(DEFAULT_POLICIES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const fetched = useRef(false);
  const initialLoadDone = useRef(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fetch AI-suggested policies on mount
  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const fetchSuggestions = async () => {
      try {
        const res = await fetch(
          `/api/stores/${storeId}/policies/suggest`
        );
        if (res.ok) {
          const json = (await res.json()) as { data: StorePolicies };
          setPolicies(json.data);
        }
      } catch {
        // use defaults
      } finally {
        setLoading(false);
        // Delay so the setPolicies above doesn't trigger auto-save
        requestAnimationFrame(() => {
          initialLoadDone.current = true;
        });
      }
    };

    void fetchSuggestions();
  }, [storeId]);

  // Auto-save: debounced PATCH on every field change
  useEffect(() => {
    if (!initialLoadDone.current) return;

    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/stores/${storeId}/policies`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(policies),
        });
      } catch {
        // Silent fail for auto-save
      }
    }, 800);

    return () => clearTimeout(autoSaveTimer.current);
  }, [policies, storeId]);

  const update = useCallback(
    <K extends keyof StorePolicies>(key: K, value: StorePolicies[K]) => {
      setPolicies((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const handleContinue = async () => {
    setSaving(true);
    setSaveError(false);
    // Cancel any pending auto-save
    clearTimeout(autoSaveTimer.current);
    try {
      const res = await fetch(`/api/stores/${storeId}/policies`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...policies, advance_step: true }),
      });
      if (!res.ok) {
        setSaveError(true);
        return;
      }
      onNext();
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-10">
        <div className="text-center">
          <Skeleton className="mx-auto h-10 w-72" />
          <Skeleton className="mx-auto mt-4 h-5 w-96" />
        </div>
        <div className="mx-auto mt-10 max-w-lg space-y-4">
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="py-10">
      {/* Header */}
      <div className="text-center onboarding-stagger-1">
        <h1 className="font-heading text-3xl leading-tight text-mk-text sm:text-5xl">
          Configure your policies
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-mk-text-muted sm:text-lg">
          We extracted these from your website. Adjust anything that
          doesn&apos;t look right.
        </p>
      </div>

      {/* Glass card */}
      <div className="glassy-card mx-auto mt-10 max-w-lg overflow-hidden rounded-2xl onboarding-stagger-2">
        <div className="divide-y divide-white/40">
          {/* ── Shipping ───────────────────────────────────── */}
          <div className="px-4 py-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/60 bg-white shadow-sm">
                  <Package className="h-4 w-4 text-mk-accent" />
                </div>
                <div>
                  <p className="text-base font-semibold text-mk-text">Shipping</p>
                  <p className="text-sm text-mk-text-muted">Average delivery time</p>
                </div>
              </div>
              <SegmentedToggle
                options={SHIPPING_OPTIONS}
                value={policies.shipping_days}
                onChange={(v) => update("shipping_days", v)}
              />
            </div>
          </div>

          {/* ── Response Time ──────────────────────────────── */}
          <div className="px-4 py-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/60 bg-white shadow-sm">
                  <Clock className="h-4 w-4 text-mk-accent" />
                </div>
                <div>
                  <p className="text-base font-semibold text-mk-text">Response Time</p>
                  <p className="text-sm text-mk-text-muted">Reply within</p>
                </div>
              </div>
              <SegmentedToggle
                options={RESPONSE_OPTIONS}
                value={policies.response_interval_hours}
                onChange={(v) => update("response_interval_hours", v)}
              />
            </div>
          </div>

          {/* ── Trade-ins ──────────────────────────────────── */}
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/60 bg-white shadow-sm">
                  <RefreshCw className="h-4 w-4 text-mk-accent" />
                </div>
                <p className="text-base font-semibold text-mk-text">
                  Trade-ins
                </p>
              </div>
              <Switch
                checked={policies.trade_ins_enabled}
                onCheckedChange={(v) => update("trade_ins_enabled", v)}
                className="h-6 w-11 data-[size=default]:h-6 data-[size=default]:w-11 [&_[data-slot=switch-thumb]]:size-5"
              />
            </div>

            {/* Sub-options (animated) */}
            <div
              className={cn(
                "overflow-hidden transition-all duration-300 ease-out",
                policies.trade_ins_enabled
                  ? "max-h-40 opacity-100 mt-3"
                  : "max-h-0 opacity-0"
              )}
            >
              <div className="space-y-3 pl-11">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-mk-text-muted">
                    Receive old items
                  </p>
                  <Switch
                    checked={policies.receive_old_items}
                    onCheckedChange={(v) => update("receive_old_items", v)}
                    className="h-6 w-11 data-[size=default]:h-6 data-[size=default]:w-11 [&_[data-slot=switch-thumb]]:size-5"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-mk-text-muted">Average COGS</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-mk-text-muted">&euro;</span>
                    <input
                      type="number"
                      min={0}
                      max={100000}
                      value={policies.average_cogs}
                      onChange={(e) =>
                        update(
                          "average_cogs",
                          Math.max(0, Number(e.target.value) || 0)
                        )
                      }
                      className="w-20 rounded-lg border border-white/60 bg-white/50 px-2.5 py-1.5 text-sm text-mk-text shadow-sm outline-none focus:border-mk-accent/40 focus:ring-1 focus:ring-mk-accent/20"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Refund Prevention ──────────────────────────── */}
          <div className="px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/60 bg-white shadow-sm">
                  <Shield className="h-4 w-4 text-mk-accent" />
                </div>
                <p className="text-base font-semibold text-mk-text">
                  Prevent Refunds
                </p>
              </div>
              <Switch
                checked={policies.prevent_refunds}
                onCheckedChange={(v) => update("prevent_refunds", v)}
                className="h-6 w-11 data-[size=default]:h-6 data-[size=default]:w-11 [&_[data-slot=switch-thumb]]:size-5"
              />
            </div>

            {/* Sub-options (animated) */}
            <div
              className={cn(
                "overflow-hidden transition-all duration-300 ease-out",
                policies.prevent_refunds
                  ? "max-h-60 opacity-100 mt-3"
                  : "max-h-0 opacity-0"
              )}
            >
              <div className="space-y-3 pl-11">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-mk-text-muted">Offer vouchers</p>
                  <Switch
                    checked={policies.offer_vouchers}
                    onCheckedChange={(v) => update("offer_vouchers", v)}
                    className="h-6 w-11 data-[size=default]:h-6 data-[size=default]:w-11 [&_[data-slot=switch-thumb]]:size-5"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-mk-text-muted">
                    Offer partial refunds
                  </p>
                  <Switch
                    checked={policies.offer_partial_refunds}
                    onCheckedChange={(v) => update("offer_partial_refunds", v)}
                    className="h-6 w-11 data-[size=default]:h-6 data-[size=default]:w-11 [&_[data-slot=switch-thumb]]:size-5"
                  />
                </div>

                {/* Partial refund percentage */}
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-300 ease-out",
                    policies.offer_partial_refunds
                      ? "max-h-20 opacity-100"
                      : "max-h-0 opacity-0"
                  )}
                >
                  <p className="mb-2 text-sm text-mk-text-muted">
                    Partial refund percentage
                  </p>
                  <SegmentedToggle
                    options={REFUND_OPTIONS}
                    value={policies.partial_refund_percentage}
                    onChange={(v) => update("partial_refund_percentage", v)}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mx-auto mt-10 max-w-lg onboarding-stagger-3">
        {saveError && (
          <p className="mb-3 text-center text-sm text-red-500">
            Failed to save. Please try again.
          </p>
        )}
        <div className="flex justify-between">
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
            onClick={handleContinue}
            size="lg"
            disabled={saving}
            className="h-12 bg-mk-accent hover:bg-mk-accent-hover"
          >
            {saving ? "Saving..." : "Continue"}
            {!saving && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
