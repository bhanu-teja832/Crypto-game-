"use client";
import { useState, useEffect, useCallback } from "react";
import { API_BASE } from "@/lib/constants";
import type { ApiRound, HistoryResponse } from "@/lib/types";

interface UseHistoryOptions {
  pageSize?: number;
  autoRefresh?: boolean;
  refreshIntervalMs?: number;
}

/**
 * Fetches paginated game history from the server REST API.
 * Optionally auto-refreshes to show new rounds in real-time.
 */
export function useHistory(options: UseHistoryOptions = {}) {
  const {
    pageSize = 20,
    autoRefresh = false,
    refreshIntervalMs = 10_000,
  } = options;

  const [rounds, setRounds]   = useState<ApiRound[]>([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const fetchPage = useCallback(
    async (p: number) => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `${API_BASE}/history?page=${p}&limit=${pageSize}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: HistoryResponse = await res.json();
        setRounds(data.rounds);
        setTotal(data.total);
        setPage(p);
      } catch (err: any) {
        setError(err?.message ?? "Failed to load history");
      } finally {
        setLoading(false);
      }
    },
    [pageSize]
  );

  // Initial load
  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => fetchPage(page), refreshIntervalMs);
    return () => clearInterval(id);
  }, [autoRefresh, refreshIntervalMs, page, fetchPage]);

  const nextPage = useCallback(() => {
    if (page * pageSize < total) fetchPage(page + 1);
  }, [page, pageSize, total, fetchPage]);

  const prevPage = useCallback(() => {
    if (page > 1) fetchPage(page - 1);
  }, [page, fetchPage]);

  const refresh = useCallback(() => fetchPage(page), [page, fetchPage]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    rounds,
    total,
    page,
    totalPages,
    loading,
    error,
    nextPage,
    prevPage,
    refresh,
  };
}

/**
 * Fetch a single round by its number (for the fairness verification page).
 */
export function useRound(roundNumber: number | null) {
  const [round, setRound]   = useState<ApiRound | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  useEffect(() => {
    if (roundNumber === null) return;

    setLoading(true);
    setError(null);

    fetch(`${API_BASE}/history/${roundNumber}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => setRound(data))
      .catch((err) => setError(err?.message ?? "Failed to load round"))
      .finally(() => setLoading(false));
  }, [roundNumber]);

  return { round, loading, error };
}

/**
 * Verify a round by its seed hash (provably fair page).
 */
export function useVerify(hash: string | null) {
  const [result, setResult] = useState<{
    roundId: number;
    crashPoint: number;
    hash: string;
    seed: string;
    recomputedCrashPoint: number;
    verified: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const verify = useCallback(async (h: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`${API_BASE}/verify/${h}`);
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setResult(await res.json());
    } catch (err: any) {
      setError(err?.message ?? "Verification failed");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-verify if hash is provided
  useEffect(() => {
    if (hash) verify(hash);
  }, [hash, verify]);

  return { result, loading, error, verify };
}
