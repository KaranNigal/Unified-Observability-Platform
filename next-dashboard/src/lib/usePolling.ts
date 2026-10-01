"use client";
import { useState, useEffect, useCallback, useRef } from "react";

// Generic polling hook — re-fetches data every `intervalMs` milliseconds
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number = 15000
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const fetchFn = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetcherRef.current();
      setData(result);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setData(null);
    fetchFn();
    const id = setInterval(fetchFn, intervalMs);
    return () => clearInterval(id);
  }, [fetchFn, intervalMs, fetcher]);

  return { data, loading, error, refetch: fetchFn };
}
