"use client";

import { useState, useEffect, useCallback } from "react";
import type { ActivityItem } from "@/types";

interface UseConversationsResult {
  conversations: ActivityItem[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useConversations(
  storeId: string | null
): UseConversationsResult {
  const [conversations, setConversations] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stores/${storeId}/conversations`);
      if (!res.ok) throw new Error("Failed to load conversations");
      const data = (await res.json()) as { data: ActivityItem[] };
      setConversations(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void fetchConversations();
  }, [fetchConversations]);

  return {
    conversations,
    loading,
    error,
    refetch: fetchConversations,
  };
}
