"use client";

import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: number; label: string };
  className?: string;
}

export function StatsCard({
  title,
  value,
  subtitle,
  trend,
  className,
}: StatsCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-mk-border bg-white p-6 shadow-sm",
        className
      )}
    >
      <p className="text-sm font-medium text-mk-text-muted">{title}</p>
      <p className="mt-2 text-3xl font-bold text-mk-text">{value}</p>
      {subtitle && (
        <p className="mt-1 text-sm text-mk-text-muted">{subtitle}</p>
      )}
      {trend && (
        <p
          className={cn(
            "mt-2 text-sm font-medium",
            trend.value >= 0 ? "text-green-600" : "text-red-600"
          )}
        >
          {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}%{" "}
          <span className="font-normal text-mk-text-muted">{trend.label}</span>
        </p>
      )}
    </div>
  );
}
