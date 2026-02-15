"use client";

import { useState } from "react";
import { CheckCircle, Edit2, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ReviewQueueItem } from "@/types";

interface ReviewQueueItemProps {
  item: ReviewQueueItem;
  storeId: string;
  onAction: (itemId: string, action: string) => void;
}

const INTENT_LABELS: Record<string, string> = {
  WISMO: "Order Status",
  RETURN: "Return",
  EXCHANGE: "Exchange",
  CANCEL: "Cancel Order",
  ORDER_PROBLEM: "Order Problem",
  PRODUCT_QUESTION: "Product Q",
  GENERAL: "General",
};

export function ReviewQueueItemCard({
  item,
  storeId,
  onAction,
}: ReviewQueueItemProps) {
  const [editing, setEditing] = useState(false);
  const [editedReply, setEditedReply] = useState(item.draft_reply ?? "");
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (action: string, body?: object) => {
    setLoading(action);
    try {
      const res = await fetch(
        `/api/stores/${storeId}/review-queue?id=${item.id}&action=${action}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        }
      );
      if (!res.ok) throw new Error("Action failed");
      onAction(item.id, action);
    } catch {
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-xl border border-mk-border bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-2">
          {item.intent && (
            <Badge variant="secondary" className="text-xs">
              {INTENT_LABELS[item.intent] ?? item.intent}
            </Badge>
          )}
          {item.order_number && (
            <span className="text-sm text-mk-text-muted">
              Order #{item.order_number}
            </span>
          )}
        </div>
        <button
          onClick={() => handleAction("dismiss")}
          disabled={!!loading}
          className="text-mk-text-muted hover:text-mk-text-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Escalation reason */}
      <div className="mb-4 flex items-start gap-2 rounded-lg bg-yellow-50 p-3">
        <AlertCircle className="h-4 w-4 flex-shrink-0 text-yellow-600 mt-0.5" />
        <p className="text-sm text-yellow-800">{item.escalation_reason}</p>
      </div>

      {/* Draft reply */}
      {item.draft_reply && (
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-mk-text-muted">
            AI Draft Reply
          </p>
          {editing ? (
            <Textarea
              value={editedReply}
              onChange={(e) => setEditedReply(e.target.value)}
              className="min-h-[120px] text-sm"
            />
          ) : (
            <div className="rounded-lg bg-mk-bg p-3 text-sm text-mk-text-secondary whitespace-pre-wrap">
              {item.draft_reply}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        {!editing ? (
          <>
            <Button
              size="sm"
              onClick={() => handleAction("approve")}
              disabled={!!loading || !item.draft_reply}
              className="bg-mk-green hover:bg-mk-green/90 text-white"
            >
              <CheckCircle className="mr-1.5 h-3.5 w-3.5" />
              {loading === "approve" ? "Sending..." : "Send as-is"}
            </Button>
            {item.draft_reply && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditing(true)}
                disabled={!!loading}
              >
                <Edit2 className="mr-1.5 h-3.5 w-3.5" />
                Edit & Send
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              size="sm"
              onClick={() =>
                handleAction("edit-send", { edited_reply: editedReply })
              }
              disabled={!!loading || !editedReply.trim()}
              className="bg-mk-accent hover:bg-mk-accent-hover text-white"
            >
              {loading === "edit-send" ? "Sending..." : "Send edited reply"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing(false);
                setEditedReply(item.draft_reply ?? "");
              }}
            >
              Cancel
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
