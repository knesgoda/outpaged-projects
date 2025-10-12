import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { OfflinePolicy } from "@/services/offline";
import {
  fetchOfflinePolicy,
  getCachedOfflinePolicy,
  initializeRemoteWipeListeners,
  onRemoteWipe,
  triggerRemoteWipe,
} from "@/services/offline";
import { subscribeOfflinePolicy } from "@/services/offline/policyState";
import { useToast } from "@/hooks/use-toast";

interface OfflinePolicyContextValue {
  policy: OfflinePolicy;
  loading: boolean;
  refresh: () => Promise<void>;
}

const OfflinePolicyContext = createContext<OfflinePolicyContextValue | undefined>(undefined);

const POLL_INTERVAL = 60_000;

export function OfflinePolicyProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [policy, setPolicy] = useState<OfflinePolicy>(() => getCachedOfflinePolicy());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const next = await fetchOfflinePolicy();
      setPolicy(next);
    } catch (error) {
      console.warn("Failed to refresh offline policy", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    initializeRemoteWipeListeners();
    const unsubscribe = onRemoteWipe((event) => {
      toast({
        title: "Remote wipe executed",
        description: event.reason ?? "Offline data has been cleared for this session.",
        variant: "destructive",
      });
      void refresh();
    });
    return () => unsubscribe();
  }, [refresh, toast]);

  useEffect(() => {
    const unsubscribe = subscribeOfflinePolicy((next) => {
      setPolicy(next);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleVisibility = () => {
      if (!document.hidden) {
        void refresh();
      }
    };
    window.addEventListener("focus", handleVisibility);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleVisibility);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  useEffect(() => {
    if (POLL_INTERVAL <= 0) return;
    const interval = setInterval(() => {
      void refresh();
    }, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [refresh]);

  const value = useMemo<OfflinePolicyContextValue>(
    () => ({ policy, loading, refresh }),
    [loading, policy, refresh]
  );

  return <OfflinePolicyContext.Provider value={value}>{children}</OfflinePolicyContext.Provider>;
}

export function useOfflinePolicyContext(): OfflinePolicyContextValue {
  const context = useContext(OfflinePolicyContext);
  if (!context) {
    throw new Error("useOfflinePolicyContext must be used within OfflinePolicyProvider");
  }
  return context;
}

export async function requestRemoteWipe(options: {
  reason?: string;
  target?: OfflinePolicy["remoteWipe"]["target"];
  sessionIds?: string[];
}) {
  await triggerRemoteWipe(options);
}
