"use client";

import { useState, useEffect, useCallback } from "react";
import type { Store } from "@/types";

interface UseStoresResult {
  stores: Store[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useStores(): UseStoresResult {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stores");
      if (!res.ok) throw new Error("Failed to load stores");
      const data = (await res.json()) as { data: Store[] };
      setStores(data.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStores();
  }, [fetchStores]);

  return { stores, loading, error, refetch: fetchStores };
}
