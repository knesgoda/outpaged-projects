import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { WorkspaceSettings } from "@/types";
import { getWorkspaceSettings } from "@/services/settings";

type WorkspaceBrandingContextValue = {
  settings: WorkspaceSettings | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setSettings: (value: WorkspaceSettings | null) => void;
};

const WorkspaceBrandingContext = createContext<WorkspaceBrandingContextValue | undefined>(undefined);

export function WorkspaceBrandingProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<WorkspaceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getWorkspaceSettings();
      setSettings(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load workspace settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ settings, loading, error, refresh, setSettings }),
    [settings, loading, error, refresh]
  );

  return (
    <WorkspaceBrandingContext.Provider value={value}>{children}</WorkspaceBrandingContext.Provider>
  );
}

export function useWorkspaceBranding() {
  const context = useContext(WorkspaceBrandingContext);
  if (!context) {
    throw new Error("useWorkspaceBranding must be used within WorkspaceBrandingProvider");
  }
  return context;
}
