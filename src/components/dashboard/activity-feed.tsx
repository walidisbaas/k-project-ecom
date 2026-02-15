"use client";

import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/types";

const INTENT_COLORS: Record<string, string> = {
  WISMO: "bg-blue-100 text-blue-700",
  RETURN: "bg-red-100 text-red-700",
  EXCHANGE: "bg-yellow-100 text-yellow-700",
  CANCEL: "bg-gray-100 text-gray-700",
  ORDER_PROBLEM: "bg-red-100 text-red-700",
  PRODUCT_QUESTION: "bg-green-100 text-green-700",
  GENERAL: "bg-purple-100 text-purple-700",
};

interface ActivityFeedProps {
  items: ActivityItem[];
}

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-mk-text-muted">
        No activity yet
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start gap-3 rounded-lg border border-mk-border bg-white p-3"
        >
          <div
            className={cn(
              "mt-0.5 h-2 w-2 flex-shrink-0 rounded-full",
              item.auto_sent ? "bg-mk-green" : item.escalated ? "bg-red-500" : "bg-yellow-500"
            )}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  "text-xs",
                  INTENT_COLORS[item.intent] ?? "bg-gray-100 text-gray-700"
                )}
              >
                {item.intent}
              </Badge>
              {item.order_number && (
                <span className="text-xs text-mk-text-muted">
                  #{item.order_number}
                </span>
              )}
              {item.auto_sent && (
                <Badge className="bg-mk-green-light text-mk-green text-xs">
                  Auto-sent
                </Badge>
              )}
              {item.escalated && (
                <Badge className="bg-red-100 text-red-700 text-xs">
                  Escalated
                </Badge>
              )}
            </div>
            {item.escalation_reason && (
              <p className="mt-1 text-xs text-mk-text-muted">
                {item.escalation_reason}
              </p>
            )}
            <p className="mt-1 text-xs text-mk-text-muted">
              {formatDistanceToNow(new Date(item.created_at), {
                addSuffix: true,
              })}
              {item.response_time_ms != null && (
                <> &middot; {(item.response_time_ms / 1000).toFixed(1)}s</>
              )}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
