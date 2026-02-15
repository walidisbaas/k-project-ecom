"use client";

import { useState, useEffect, useCallback } from "react";
import type { DashboardStats } from "@/types";

interface UseStatsResult {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useStats(storeId: string | null): UseStatsResult {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/stores/${storeId}/stats`);
      if (!res.ok) throw new Error("Failed to load stats");
      const data = (await res.json()) as { data: DashboardStats };
      setStats(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    void fetchStats();
    // Refresh every 60 seconds
    const interval = setInterval(() => void fetchStats(), 60000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
