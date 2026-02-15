"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";
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

interface ConversationListProps {
  items: ActivityItem[];
  storeId: string;
}

export function ConversationList({ items, storeId }: ConversationListProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-mk-border text-sm text-mk-text-muted">
        No conversations yet. They&apos;ll appear here once emails start coming in.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={`/conversations/${item.thread_id}?store=${storeId}`}
          className="flex items-center justify-between rounded-lg border border-mk-border bg-white p-4 transition-shadow hover:shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "h-2 w-2 flex-shrink-0 rounded-full",
                item.auto_sent
                  ? "bg-mk-green"
                  : item.escalated
                  ? "bg-red-500"
                  : "bg-yellow-500"
              )}
            />
            <div>
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
                  <span className="text-sm font-medium text-mk-text-secondary">
                    Order #{item.order_number}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-mk-text-muted">
                {formatDistanceToNow(new Date(item.created_at), {
                  addSuffix: true,
                })}
                {item.auto_sent && " · Auto-replied"}
                {item.escalated && " · Escalated"}
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-mk-text-muted" />
        </Link>
      ))}
    </div>
  );
}
