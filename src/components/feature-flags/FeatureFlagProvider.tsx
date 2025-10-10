import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useTenant } from "@/domain/tenant";

export type FeatureFlagKey =
  | "automation-engine"
  | "dynamic-fields"
  | "workflow-designer"
  | "collaboration-presence"
  | "analytics-mvp"
  | "governance-suite";

type FeatureFlagState = Record<FeatureFlagKey, boolean>;

const DEFAULT_FLAGS: FeatureFlagState = {
  "automation-engine": false,
  "dynamic-fields": true,
  "workflow-designer": false,
  "collaboration-presence": false,
  "analytics-mvp": false,
  "governance-suite": false,
};

interface FeatureFlagContextValue {
  flags: FeatureFlagState;
  isEnabled: (flag: FeatureFlagKey) => boolean;
  setFlag: (flag: FeatureFlagKey, enabled: boolean) => void;
  overrideFlags: (overrides: Partial<FeatureFlagState>) => void;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | undefined>(undefined);

const buildStorageKey = (organizationId: string) => `outpaged.flags.${organizationId}`;

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  const tenant = useTenant();
  const storageKey = useMemo(() => buildStorageKey(tenant.organizationId), [tenant.organizationId]);
  const [flags, setFlags] = useState<FeatureFlagState>(() => DEFAULT_FLAGS);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const persisted = window.localStorage.getItem(storageKey);
      if (persisted) {
        const parsed = JSON.parse(persisted) as Partial<FeatureFlagState>;
        setFlags((current) => ({ ...current, ...parsed }));
      } else {
        if (tenant.environment !== "production") {
          setFlags((current) => ({
            ...current,
            "analytics-mvp": true,
          }));
        }
      }
    } catch (error) {
      console.warn("Failed to read feature flags", error);
    }
  }, [storageKey, tenant.environment]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(flags));
    } catch (error) {
      console.warn("Failed to persist feature flags", error);
    }
  }, [flags, storageKey]);

  const setFlag = useCallback<FeatureFlagContextValue["setFlag"]>((flag, enabled) => {
    setFlags((current) => ({ ...current, [flag]: enabled }));
  }, []);

  const overrideFlags = useCallback<FeatureFlagContextValue["overrideFlags"]>((overrides) => {
    setFlags((current) => ({ ...current, ...overrides }));
  }, []);

  const isEnabled = useCallback<FeatureFlagContextValue["isEnabled"]>((flag) => flags[flag], [flags]);

  const value = useMemo<FeatureFlagContextValue>(
    () => ({ flags, isEnabled, setFlag, overrideFlags }),
    [flags, isEnabled, setFlag, overrideFlags]
  );

  return <FeatureFlagContext.Provider value={value}>{children}</FeatureFlagContext.Provider>;
}

export function useFeatureFlags() {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error("useFeatureFlags must be used within FeatureFlagProvider");
  }
  return context;
}
