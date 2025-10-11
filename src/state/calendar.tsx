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
import type {
  CalendarDensity,
  CalendarFilterGroup,
  CalendarNotification,
  CalendarSavedFilter,
  CalendarLayer,
  CalendarSavedView,
  CalendarSearchToken,
} from "@/types/calendar";

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
  filters: CalendarFilterGroup[];
  setFilters: (groups: CalendarFilterGroup[]) => void;
  savedFilters: CalendarSavedFilter[];
  activeFilterId: string | null;
  createSavedFilter: (input: { name: string; description?: string }) => void;
  updateSavedFilter: (filterId: string, updates: Partial<Omit<CalendarSavedFilter, "id" | "groups">>) => void;
  deleteSavedFilter: (filterId: string) => void;
  applySavedFilter: (filterId: string | null) => void;
  updateFilterGroups: (groups: CalendarFilterGroup[]) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchTokens: CalendarSearchToken[];
  setSearchTokens: (tokens: CalendarSearchToken[]) => void;
  notifications: CalendarNotification[];
  setNotifications: (updater: (current: CalendarNotification[]) => CalendarNotification[]) => void;
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

const INITIAL_FILTER_GROUPS: CalendarFilterGroup[] = [];

const INITIAL_SAVED_FILTERS: CalendarSavedFilter[] = [
  {
    id: "saved-filter-critical",
    name: "Critical milestones",
    description: "Milestones and releases marked as critical priority",
    groups: [
      {
        id: "group-critical",
        logic: "AND",
        conditions: [
          { id: "cond-type", field: "type", operator: "equals", value: "milestone" },
          { id: "cond-priority", field: "priority", operator: "equals", value: "critical" },
        ],
      },
    ],
  },
  {
    id: "saved-filter-followups",
    name: "Meetings with attachments",
    description: "Sessions that include collateral to review",
    groups: [
      {
        id: "group-attachments",
        logic: "AND",
        conditions: [
          { id: "cond-type-meeting", field: "type", operator: "equals", value: "meeting" },
          { id: "cond-has-attachments", field: "hasAttachments", operator: "exists" },
        ],
      },
    ],
  },
];

export function CalendarProvider({ children }: { children: ReactNode }) {
  const [calendars, setCalendars] = useState<CalendarLayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [density, setDensity] = useState<CalendarDensity>(DEFAULT_DENSITY);
  const [savedViews, setSavedViews] = useState<CalendarSavedView[]>(INITIAL_SAVED_VIEWS);
  const [activeSavedViewId, setActiveSavedViewId] = useState<string | null>(null);
  const [filters, setFilters] = useState<CalendarFilterGroup[]>(INITIAL_FILTER_GROUPS);
  const [savedFilters, setSavedFilters] = useState<CalendarSavedFilter[]>(INITIAL_SAVED_FILTERS);
  const [activeFilterId, setActiveFilterId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchTokens, setSearchTokens] = useState<CalendarSearchToken[]>([]);
  const [notifications, setNotificationsState] = useState<CalendarNotification[]>([]);

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

  const updateFilterGroups = useCallback((groups: CalendarFilterGroup[]) => {
    setFilters(groups);
    setActiveFilterId(null);
  }, []);

  const createSavedFilter = useCallback(
    ({ name, description }: { name: string; description?: string }) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `filter-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setSavedFilters((current) => [...current, { id, name, description, groups: filters }]);
      setActiveFilterId(id);
    },
    [filters]
  );

  const updateSavedFilter = useCallback(
    (filterId: string, updates: Partial<Omit<CalendarSavedFilter, "id" | "groups">>) => {
      setSavedFilters((current) =>
        current.map((filter) => (filter.id === filterId ? { ...filter, ...updates } : filter))
      );
    },
    []
  );

  const deleteSavedFilter = useCallback((filterId: string) => {
    setSavedFilters((current) => current.filter((filter) => filter.id !== filterId));
    setActiveFilterId((current) => (current === filterId ? null : current));
  }, []);

  const applySavedFilter = useCallback(
    (filterId: string | null) => {
      if (!filterId) {
        setActiveFilterId(null);
        setFilters(INITIAL_FILTER_GROUPS);
        return;
      }
      const saved = savedFilters.find((filter) => filter.id === filterId);
      if (!saved) return;
      setFilters(saved.groups);
      setActiveFilterId(filterId);
    },
    [savedFilters]
  );

  const setNotifications = useCallback(
    (updater: (current: CalendarNotification[]) => CalendarNotification[]) => {
      setNotificationsState((current) => updater(current));
    },
    []
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
      filters,
      setFilters,
      savedFilters,
      activeFilterId,
      createSavedFilter,
      updateSavedFilter,
      deleteSavedFilter,
      applySavedFilter,
      updateFilterGroups,
      searchQuery,
      setSearchQuery,
      searchTokens,
      setSearchTokens,
      notifications,
      setNotifications,
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
      filters,
      savedFilters,
      activeFilterId,
      createSavedFilter,
      updateSavedFilter,
      deleteSavedFilter,
      applySavedFilter,
      updateFilterGroups,
      searchQuery,
      searchTokens,
      notifications,
      setNotifications,
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
