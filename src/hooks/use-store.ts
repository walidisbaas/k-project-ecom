"use client";

import { useState, useEffect, useCallback } from "react";
import type { Store } from "@/types";

interface UseStoreResult {
  store: Store | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useStore(storeId: string | null): UseStoreResult {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStore = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stores/${storeId}`);
      if (!res.ok) throw new Error("Failed to load store");
      const data = (await res.json()) as { data: Store };
      setStore(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void fetchStore();
  }, [fetchStore]);

  return { store, loading, error, refetch: fetchStore };
}
