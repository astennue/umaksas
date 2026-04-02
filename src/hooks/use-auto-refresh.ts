"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface UseAutoRefreshOptions {
  /** Refresh interval in milliseconds (default: 10000 = 10 seconds) */
  interval?: number;
  /** Whether auto-refresh is enabled (default: true) */
  enabled?: boolean;
  /** Callback to fetch data */
  onRefresh: () => Promise<void>;
  /** Show subtle loading indicator during refresh */
  showIndicator?: boolean;
}

export function useAutoRefresh({
  interval = 5000,
  enabled = true,
  onRefresh,
  showIndicator = false,
}: UseAutoRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const onRefreshRef = useRef(onRefresh);

  // Keep callback ref updated without triggering re-renders
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  const refresh = useCallback(async () => {
    try {
      if (showIndicator) setIsRefreshing(true);
      await onRefreshRef.current();
    } catch (error) {
      // Silent fail - don't disrupt user experience
      console.warn("Auto-refresh failed:", error);
    } finally {
      if (showIndicator) setIsRefreshing(false);
    }
  }, [showIndicator]);

  useEffect(() => {
    if (!enabled) return;

    // Initial fetch
    refresh();

    // Set up interval
    const timer = setInterval(refresh, interval);

    return () => clearInterval(timer);
  }, [enabled, interval, refresh]);

  return { isRefreshing, refresh };
}
