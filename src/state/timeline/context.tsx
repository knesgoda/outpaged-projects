import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchTimelineSnapshot, type TimelineFetchOptions } from "@/services/timeline";

import { buildTimelineDerivedData } from "./selectors";
import type {
  TimelineDerivedData,
  TimelineSnapshot,
  TimelineViewPreferences,
} from "./types";

const DEFAULT_PREFERENCES: TimelineViewPreferences = {
  scale: "day",
  zoomLevel: 1,
  showWeekends: true,
  showBaselines: true,
  showDependencies: true,
  showOverlays: false,
  showLegend: false,
  snapMode: "day",
  rowDensity: "comfortable",
  grouping: "none",
  colorBy: "status",
  swimlanes: false,
  calendarId: null,
  savedViewId: null,
};

export interface TimelineProviderProps extends TimelineFetchOptions {
  children: ReactNode;
  initialSnapshot?: TimelineSnapshot;
}

export interface TimelineContextValue {
  snapshot: TimelineSnapshot | null;
  derived: TimelineDerivedData | null;
  preferences: TimelineViewPreferences;
  setPreferences: (next: TimelineViewPreferences) => void;
  updatePreferences: (patch: Partial<TimelineViewPreferences>) => void;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const TimelineContext = createContext<TimelineContextValue | undefined>(undefined);

export function TimelineProvider({
  children,
  initialSnapshot,
  ...options
}: TimelineProviderProps) {
  const queryKey = useMemo(
    () => ["timeline", options.projectId ?? "all", options.savedViewId ?? null, options.filters ?? {}],
    [options.filters, options.projectId, options.savedViewId]
  );

  const query = useQuery({
    queryKey,
    queryFn: () => fetchTimelineSnapshot(options),
    initialData: initialSnapshot,
  });

  const [preferences, setPreferences] = useState<TimelineViewPreferences>(() => {
    if (initialSnapshot?.preferences) {
      return { ...DEFAULT_PREFERENCES, ...initialSnapshot.preferences };
    }
    return DEFAULT_PREFERENCES;
  });

  const snapshot = query.data ?? initialSnapshot ?? null;

  useEffect(() => {
    if (snapshot?.preferences) {
      setPreferences(prev => ({ ...prev, ...snapshot.preferences }));
    }
  }, [snapshot?.preferences]);

  const derived = useMemo(
    () => (snapshot ? buildTimelineDerivedData(snapshot) : null),
    [snapshot]
  );

  const refresh = useCallback(async () => {
    const result = await query.refetch();
    if (result.data?.preferences) {
      setPreferences(prev => ({ ...prev, ...result.data!.preferences }));
    }
  }, [query]);

  const updatePreferences = useCallback((patch: Partial<TimelineViewPreferences>) => {
    setPreferences(prev => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo<TimelineContextValue>(
    () => ({
      snapshot,
      derived,
      preferences,
      setPreferences,
      updatePreferences,
      loading: query.isLoading,
      error: query.error instanceof Error ? query.error : query.error ? new Error("Failed to load timeline") : null,
      refresh,
    }),
    [derived, preferences, query.error, query.isLoading, refresh, setPreferences, snapshot, updatePreferences]
  );

  return <TimelineContext.Provider value={value}>{children}</TimelineContext.Provider>;
}

function useTimelineContext(): TimelineContextValue {
  const context = useContext(TimelineContext);
  if (!context) {
    throw new Error("useTimelineContext must be used within a TimelineProvider");
  }
  return context;
}

export function useTimelineState() {
  return useTimelineContext();
}

export function useTimelineSelector<T>(selector: (context: TimelineContextValue) => T): T {
  const context = useTimelineContext();
  return selector(context);
}

export function useTimelinePreferences() {
  const context = useTimelineContext();
  return {
    preferences: context.preferences,
    setPreferences: context.setPreferences,
    updatePreferences: context.updatePreferences,
  };
}
