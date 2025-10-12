import { useCallback, useEffect, useMemo, useState } from "react";

import {
  summarizeOfflineQueue,
  type OfflineQueueSummary,
} from "@/services/offline";

export type ConnectivityState = "online" | "offline" | "queue" | "syncing";

export interface ConnectivityStatus {
  state: ConnectivityState;
  queueSize: number;
  lastSyncedAt: number | null;
  summary: OfflineQueueSummary | null;
  refresh: () => Promise<void>;
  isOnline: boolean;
}

function computeState(isOnline: boolean, summary: OfflineQueueSummary | null): ConnectivityState {
  if (!isOnline) return "offline";
  if (!summary || summary.total === 0) return "online";
  if ((summary.byStatus.syncing ?? 0) > 0) return "syncing";
  return "queue";
}

export function useConnectivityStatus(pollInterval = 15_000): ConnectivityStatus {
  const [summary, setSummary] = useState<OfflineQueueSummary | null>(null);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const nextSummary = await summarizeOfflineQueue();
      setSummary(nextSummary);
      if ((typeof navigator === "undefined" || navigator.onLine) && nextSummary.total === 0) {
        setLastSyncedAt(Date.now());
      }
    } catch (error) {
      console.warn("Failed to summarize offline queue", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      setIsOnline(true);
      void refresh();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refresh]);

  useEffect(() => {
    void refresh();
    if (pollInterval <= 0) return;

    const interval = setInterval(() => {
      void refresh();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [pollInterval, refresh]);

  const state = useMemo(() => computeState(isOnline, summary), [isOnline, summary]);
  const queueSize = summary?.total ?? 0;

  return useMemo(
    () => ({
      state,
      queueSize,
      lastSyncedAt,
      summary,
      refresh,
      isOnline,
    }),
    [isOnline, lastSyncedAt, queueSize, refresh, state, summary]
  );
}
