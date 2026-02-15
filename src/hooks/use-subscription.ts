"use client";

import { useState, useEffect, useCallback } from "react";
import type { Merchant } from "@/types";

interface UseSubscriptionResult {
  merchant: Merchant | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useSubscription(): UseSubscriptionResult {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stores");
      if (!res.ok) throw new Error("Failed to load subscription");
      const data = (await res.json()) as { merchant: Merchant };
      setMerchant(data.merchant ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSubscription();
  }, [fetchSubscription]);

  return { merchant, loading, error, refetch: fetchSubscription };
}
