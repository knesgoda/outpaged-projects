import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";

import {
  fetchTimelineSnapshot,
  type TimelineFetchOptions,
} from "@/services/timeline";

import { buildTimelineDerivedData } from "./selectors";
import type {
  TimelineDerivedData,
  TimelineItem,
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
  updateSnapshot: (
    updater: (previous: TimelineSnapshot) => TimelineSnapshot,
  ) => void;
  setSnapshot: (next: TimelineSnapshot | null) => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  selection: string[];
  setSelection: React.Dispatch<React.SetStateAction<string[]>>;
  clipboard: TimelineItem[] | null;
  setClipboard: React.Dispatch<React.SetStateAction<TimelineItem[] | null>>;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const TimelineContext = createContext<TimelineContextValue | undefined>(
  undefined,
);

export function TimelineProvider({
  children,
  initialSnapshot,
  ...options
}: TimelineProviderProps) {
  const queryKey = useMemo(
    () => [
      "timeline",
      options.projectId ?? "all",
      options.savedViewId ?? null,
      options.filters ?? {},
    ],
    [options.filters, options.projectId, options.savedViewId],
  );

  const query = useQuery({
    queryKey,
    queryFn: () => fetchTimelineSnapshot(options),
    initialData: initialSnapshot,
  });

  const [localSnapshot, setLocalSnapshot] = useState<TimelineSnapshot | null>(
    () => {
      if (initialSnapshot) return initialSnapshot;
      return query.data ?? null;
    },
  );

  const [preferences, setPreferences] = useState<TimelineViewPreferences>(
    () => {
      if (initialSnapshot?.preferences) {
        return { ...DEFAULT_PREFERENCES, ...initialSnapshot.preferences };
      }
      return DEFAULT_PREFERENCES;
    },
  );

  const historyRef = useRef<{
    past: TimelineSnapshot[];
    future: TimelineSnapshot[];
  }>({
    past: [],
    future: [],
  });

  const [selection, setSelection] = useState<string[]>([]);
  const [clipboard, setClipboard] = useState<TimelineItem[] | null>(null);

  const snapshot = localSnapshot ?? query.data ?? initialSnapshot ?? null;

  useEffect(() => {
    if (query.data) {
      setLocalSnapshot(query.data);
    }
  }, [query.data]);

  useEffect(() => {
    if (snapshot?.preferences) {
      setPreferences((prev) => ({ ...prev, ...snapshot.preferences }));
    }
  }, [snapshot?.preferences]);

  const derived = useMemo(
    () => (snapshot ? buildTimelineDerivedData(snapshot) : null),
    [snapshot],
  );

  const refresh = useCallback(async () => {
    const result = await query.refetch();
    if (result.data?.preferences) {
      setPreferences((prev) => ({ ...prev, ...result.data!.preferences }));
    }
    if (result.data) {
      setLocalSnapshot(result.data);
      historyRef.current = { past: [], future: [] };
    }
  }, [query]);

  const updatePreferences = useCallback(
    (patch: Partial<TimelineViewPreferences>) => {
      setPreferences((prev) => ({ ...prev, ...patch }));
    },
    [],
  );

  const setSnapshot = useCallback((next: TimelineSnapshot | null) => {
    setLocalSnapshot(next);
    if (next) {
      historyRef.current = { past: [], future: [] };
    }
  }, []);

  const updateSnapshot = useCallback(
    (updater: (previous: TimelineSnapshot) => TimelineSnapshot) => {
      setLocalSnapshot((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        if (next === prev) {
          return prev;
        }
        historyRef.current.past = [...historyRef.current.past, prev];
        historyRef.current.future = [];
        return next;
      });
    },
    [],
  );

  const undo = useCallback(() => {
    setLocalSnapshot((prev) => {
      const { past, future } = historyRef.current;
      if (!prev || past.length === 0) return prev;
      const previous = past[past.length - 1];
      historyRef.current = {
        past: past.slice(0, -1),
        future: [prev, ...future],
      };
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setLocalSnapshot((prev) => {
      const { past, future } = historyRef.current;
      if (!prev || future.length === 0) return prev;
      const [next, ...rest] = future;
      historyRef.current = {
        past: [...past, prev],
        future: rest,
      };
      return next;
    });
  }, []);

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;

  const value = useMemo<TimelineContextValue>(
    () => ({
      snapshot,
      derived,
      preferences,
      setPreferences,
      updatePreferences,
      updateSnapshot,
      setSnapshot,
      canUndo,
      canRedo,
      undo,
      redo,
      selection,
      setSelection,
      clipboard,
      setClipboard,
      loading: query.isLoading,
      error:
        query.error instanceof Error
          ? query.error
          : query.error
            ? new Error("Failed to load timeline")
            : null,
      refresh,
    }),
    [
      clipboard,
      derived,
      preferences,
      query.error,
      query.isLoading,
      refresh,
      selection,
      setPreferences,
      snapshot,
      updatePreferences,
      updateSnapshot,
      canUndo,
      canRedo,
      undo,
      redo,
      setSnapshot,
    ],
  );

  return (
    <TimelineContext.Provider value={value}>
      {children}
    </TimelineContext.Provider>
  );
}

function useTimelineContext(): TimelineContextValue {
  const context = useContext(TimelineContext);
  if (!context) {
    throw new Error(
      "useTimelineContext must be used within a TimelineProvider",
    );
  }
  return context;
}

export function useTimelineState() {
  return useTimelineContext();
}

export function useTimelineSelector<T>(
  selector: (context: TimelineContextValue) => T,
): T {
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
