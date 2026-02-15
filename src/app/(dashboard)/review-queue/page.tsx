"use client";

import { Suspense } from "react";

import { useSearchParams } from "next/navigation";
import { useReviewQueue } from "@/hooks/use-review-queue";
import { ReviewQueueItemCard } from "@/components/dashboard/review-queue-item";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw, Inbox } from "lucide-react";

function ReviewQueueContent() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get("store");

  const { items, loading, removeItem, refetch } = useReviewQueue(storeId);

  if (!storeId) {
    return (
      <div className="flex h-64 items-center justify-center text-mk-text-muted">
        Select a store to view the review queue.
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-mk-text font-heading">Review Queue</h1>
          <p className="mt-1 text-mk-text-muted">
            AI-generated replies waiting for your approval.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refetch}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="mt-6">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center rounded-xl border-2 border-dashed border-mk-border">
            <Inbox className="h-10 w-10 text-mk-border" />
            <p className="mt-3 font-medium text-mk-text-muted">
              No items to review
            </p>
            <p className="mt-1 text-sm text-mk-text-muted">
              All caught up! New items will appear here when the AI needs your
              input.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <ReviewQueueItemCard
                key={item.id}
                item={item}
                storeId={storeId}
                onAction={(itemId) => removeItem(itemId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReviewQueuePage() {
  return (
    <Suspense>
      <ReviewQueueContent />
    </Suspense>
  );
}
