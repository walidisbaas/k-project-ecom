"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  label: string;
  done: boolean;
  optional?: boolean;
}

interface GoLiveChecklistProps {
  items: ChecklistItem[];
}

export function GoLiveChecklist({ items }: GoLiveChecklistProps) {
  const requiredItems = items.filter((i) => !i.optional);
  const completedCount = items.filter((i) => i.done).length;
  const allDone = requiredItems.every((i) => i.done);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-mk-text-muted">
          {allDone
            ? "All checks passed! You're ready to go live."
            : `${completedCount} of ${items.length} checks completed`}
        </p>
        {/* Progress bar */}
        <div className="h-2 w-32 overflow-hidden rounded-full bg-mk-border">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              allDone ? "bg-mk-green" : "bg-mk-accent"
            )}
            style={{
              width: `${(completedCount / items.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className={cn(
              "flex items-center gap-3 rounded-lg border p-4",
              item.done
                ? "border-mk-green/20 bg-mk-green-light"
                : "border-mk-border bg-white"
            )}
          >
            {item.done ? (
              <Check className="h-4 w-4 text-mk-green" />
            ) : (
              <X className="h-4 w-4 text-mk-text-muted" />
            )}
            <span
              className={cn(
                "text-base",
                item.done ? "text-mk-green" : "text-mk-text-secondary"
              )}
            >
              {item.label}
              {item.optional && !item.done && (
                <span className="ml-1 text-sm text-mk-text-muted">(optional)</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
