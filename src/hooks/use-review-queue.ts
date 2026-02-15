"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReviewQueueItem } from "@/types";

interface UseReviewQueueResult {
  items: ReviewQueueItem[];
  loading: boolean;
  error: string | null;
  removeItem: (id: string) => void;
  refetch: () => void;
}

export function useReviewQueue(storeId: string | null): UseReviewQueueResult {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/stores/${storeId}/review-queue?status=pending`
      );
      if (!res.ok) throw new Error("Failed to load review queue");
      const data = (await res.json()) as { data: ReviewQueueItem[] };
      setItems(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  // Optimistic removal
  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return { items, loading, error, removeItem, refetch: fetchItems };
}
