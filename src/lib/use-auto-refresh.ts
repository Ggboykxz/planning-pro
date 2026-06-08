"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface UseAutoRefreshOptions {
  intervalMs?: number;       // Refresh interval in ms (default: 30000 = 30s)
  enabled?: boolean;         // Whether auto-refresh is active
  onFocus?: boolean;         // Whether to refresh on window focus
  onDataChange?: () => void; // Callback when data changes detected
}

/**
 * Hook for auto-refreshing data from API endpoints.
 * Returns the fetch function, loading state, and last refresh time.
 */
export function useAutoRefresh<T>(
  fetchFn: () => Promise<T>,
  options: UseAutoRefreshOptions = {}
) {
  const { intervalMs = 30000, enabled = true, onFocus = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchFn();
      if (mountedRef.current) {
        setData(result);
        setLastRefreshed(new Date());
      }
    } catch (error) {
      console.error("Auto-refresh error:", error);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchFn]);

  // Initial load
  useEffect(() => {
    mountedRef.current = true;
    refresh();
    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  // Set up interval
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      refresh();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs, refresh]);

  // Refresh on window focus
  useEffect(() => {
    if (!onFocus || !enabled) return;

    const handleFocus = () => {
      refresh();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [onFocus, enabled, refresh]);

  return {
    data,
    setData,
    loading,
    refresh,
    lastRefreshed,
  };
}

/**
 * Simpler hook that just auto-refreshes at an interval
 */
export function useIntervalRefresh(callback: () => void, intervalMs: number = 30000) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const tick = () => savedCallback.current();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  // Also refresh on focus
  useEffect(() => {
    const handleFocus = () => savedCallback.current();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);
}
