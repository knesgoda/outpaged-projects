import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchCalendarLayers, persistCalendarPreferences } from "@/services/calendarLayers";
import type { CalendarDensity, CalendarLayer, CalendarSavedView } from "@/types/calendar";

export interface CalendarStateContextValue {
  calendars: CalendarLayer[];
  visibleCalendars: CalendarLayer[];
  loading: boolean;
  error: Error | null;
  density: CalendarDensity;
  setDensity: (density: CalendarDensity) => void;
  savedViews: CalendarSavedView[];
  activeSavedViewId: string | null;
  toggleCalendarVisibility: (calendarId: string) => void;
  setCalendarColor: (calendarId: string, color: string) => void;
  subscribeToCalendar: (calendarId: string) => void;
  unsubscribeFromCalendar: (calendarId: string) => void;
  createSavedView: (input: { name: string; calendarIds: string[]; description?: string }) => void;
  updateSavedView: (viewId: string, updates: Partial<Omit<CalendarSavedView, "id">>) => void;
  deleteSavedView: (viewId: string) => void;
  applySavedView: (viewId: string | null) => void;
  refreshCalendars: () => Promise<void>;
}

const CalendarStateContext = createContext<CalendarStateContextValue | undefined>(undefined);

const DEFAULT_DENSITY: CalendarDensity = "comfortable";

const INITIAL_SAVED_VIEWS: CalendarSavedView[] = [
  {
    id: "view.my-meetings",
    name: "My Meetings",
    calendarIds: ["calendar.personal", "calendar.team.engineering"],
    description: "Personal and engineering meetings",
  },
  {
    id: "view.workspace-overview",
    name: "Workspace Overview",
    calendarIds: ["calendar.workspace", "calendar.project.apollo"],
    description: "Milestones and workspace-wide events",
  },
];

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [calendars, setCalendars] = useState<CalendarLayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [density, setDensity] = useState<CalendarDensity>(DEFAULT_DENSITY);
  const [savedViews, setSavedViews] = useState<CalendarSavedView[]>(INITIAL_SAVED_VIEWS);
  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(null);

  const refreshCalendars = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchCalendarLayers();
      setCalendars(next);
      setError(null);
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause
          : new Error("Unable to load calendars. Please refresh and try again.");
      setError(message);
      setCalendars([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshCalendars();
  }, [refreshCalendars]);

  const toggleCalendarVisibility = useCallback(
    (calendarId: string) => {
      setCalendars((current) => {
        const next = current.map((calendar) =>
          calendar.id === calendarId && calendar.subscribed
            ? { ...calendar, visible: !calendar.visible }
            : calendar
        );
        void persistCalendarPreferences(next);
        return next;
      });
    },
    []
  );

  const setCalendarColor = useCallback((calendarId: string, color: string) => {
    setCalendars((current) => {
      const next = current.map((calendar) =>
        calendar.id === calendarId ? { ...calendar, color } : calendar
      );
      void persistCalendarPreferences(next);
      return next;
    });
  }, []);

  const subscribeToCalendar = useCallback((calendarId: string) => {
    setCalendars((current) => {
      const next = current.map((calendar) =>
        calendar.id === calendarId
          ? { ...calendar, subscribed: true, visible: true }
          : calendar
      );
      void persistCalendarPreferences(next);
      return next;
    });
  }, []);

  const unsubscribeFromCalendar = useCallback((calendarId: string) => {
    setCalendars((current) => {
      const next = current.map((calendar) =>
        calendar.id === calendarId
          ? { ...calendar, subscribed: false, visible: false }
          : calendar
      );
      void persistCalendarPreferences(next);
      return next;
    });
  }, []);

  const createSavedView = useCallback(
    ({ name, calendarIds, description }: { name: string; calendarIds: string[]; description?: string }) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `view-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setSavedViews((current) => [...current, { id, name, calendarIds, description }]);
      setActiveSavedViewId(id);
    },
    []
  );

  const updateSavedView = useCallback((viewId: string, updates: Partial<Omit<CalendarSavedView, "id">>) => {
    setSavedViews((current) =>
      current.map((view) => (view.id === viewId ? { ...view, ...updates } : view))
    );
  }, []);

  const deleteSavedView = useCallback((viewId: string) => {
    setSavedViews((current) => current.filter((view) => view.id !== viewId));
    setActiveSavedViewId((current) => (current === viewId ? null : current));
  }, []);

  const applySavedView = useCallback(
    (viewId: string | null) => {
      if (!viewId) {
        setActiveSavedViewId(null);
        return;
      }

      setActiveSavedViewId(viewId);
      setCalendars((current) => {
        const view = savedViews.find((item) => item.id === viewId);
        if (!view) {
          return current;
        }
        const next = current.map((calendar) => ({
          ...calendar,
          visible: view.calendarIds.includes(calendar.id) ? calendar.visible || calendar.subscribed : false,
        }));
        void persistCalendarPreferences(next);
        return next;
      });
    },
    [savedViews]
  );

  const visibleCalendars = useMemo(
    () => calendars.filter((calendar) => calendar.visible && calendar.subscribed),
    [calendars]
  );

  const value = useMemo<CalendarStateContextValue>(
    () => ({
      calendars,
      visibleCalendars,
      loading,
      error,
      density,
      setDensity,
      savedViews,
      activeSavedViewId,
      toggleCalendarVisibility,
      setCalendarColor,
      subscribeToCalendar,
      unsubscribeFromCalendar,
      createSavedView,
      updateSavedView,
      deleteSavedView,
      applySavedView,
      refreshCalendars,
    }),
    [
      calendars,
      visibleCalendars,
      loading,
      error,
      density,
      savedViews,
      activeSavedViewId,
      toggleCalendarVisibility,
      setCalendarColor,
      subscribeToCalendar,
      unsubscribeFromCalendar,
      createSavedView,
      updateSavedView,
      deleteSavedView,
      applySavedView,
      refreshCalendars,
    ]
  );

  return <CalendarStateContext.Provider value={value}>{children}</CalendarStateContext.Provider>;
}

export function useCalendarState() {
  const context = useContext(CalendarStateContext);
  if (!context) {
    throw new Error("useCalendarState must be used within a CalendarProvider");
  }
  return context;
}
