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
  CalendarAutomationRule,
  CalendarComment,
  CalendarConflictPreference,
  CalendarDelegation,
  CalendarDensity,
  CalendarFilterGroup,
  CalendarFollower,
  CalendarHoliday,
  CalendarInvitation,
  CalendarIntegration,
  CalendarIntegrationProvider,
  CalendarLayer,
  CalendarNotification,
  CalendarOutOfOffice,
  CalendarSavedFilter,
  CalendarSavedView,
  CalendarSchedulingSuggestion,
  CalendarSearchToken,
  CalendarShareSetting,
  CalendarWorkingHours,
} from "@/types/calendar";
import {
  connectIntegration,
  disconnectIntegration,
  triggerIntegrationSync,
  updateConflictPreference,
} from "@/services/calendarIntegrations";
import {
  MOCK_AUTOMATION_RULES,
  MOCK_CALENDAR_DELEGATIONS,
  MOCK_CALENDAR_FOLLOWERS,
  MOCK_CALENDAR_INTEGRATIONS,
  MOCK_EVENT_COMMENTS,
  MOCK_HOLIDAYS,
  MOCK_INVITATIONS,
  MOCK_OUT_OF_OFFICE,
  MOCK_SCHEDULING_SUGGESTIONS,
  MOCK_SHARE_SETTINGS,
  MOCK_WORKING_HOURS,
} from "@/data/calendarIntegrations";

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
  integrations: CalendarIntegration[];
  connectCalendarIntegration: (provider: CalendarIntegrationProvider, accountEmail: string) => Promise<void>;
  disconnectCalendarIntegration: (integrationId: string) => Promise<void>;
  syncCalendarIntegration: (integrationId: string) => Promise<void>;
  setIntegrationConflictPreference: (
    integrationId: string,
    preference: CalendarConflictPreference
  ) => Promise<void>;
  automationRules: CalendarAutomationRule[];
  toggleAutomationRule: (ruleId: string) => void;
  shareSettings: CalendarShareSetting[];
  updateShareRole: (shareId: string, role: CalendarShareSetting["role"]) => void;
  removeShareTarget: (shareId: string) => void;
  addShareTarget: (share: CalendarShareSetting) => void;
  invitations: CalendarInvitation[];
  updateInvitationStatus: (invitationId: string, status: CalendarInvitation["status"]) => void;
  followers: CalendarFollower[];
  addFollower: (follower: CalendarFollower) => void;
  removeFollower: (followerId: string) => void;
  comments: CalendarComment[];
  addComment: (comment: CalendarComment) => void;
  workingHours: CalendarWorkingHours[];
  updateWorkingHours: (ownerId: string, hours: Partial<CalendarWorkingHours>) => void;
  holidays: CalendarHoliday[];
  outOfOffice: CalendarOutOfOffice[];
  upsertOutOfOffice: (entry: CalendarOutOfOffice) => void;
  schedulingSuggestions: CalendarSchedulingSuggestion[];
  acceptSchedulingSuggestion: (suggestionId: string) => void;
  refreshSchedulingSuggestions: () => void;
  delegations: CalendarDelegation[];
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
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>(MOCK_CALENDAR_INTEGRATIONS);
  const [automationRules, setAutomationRules] = useState<CalendarAutomationRule[]>(MOCK_AUTOMATION_RULES);
  const [shareSettings, setShareSettings] = useState<CalendarShareSetting[]>(MOCK_SHARE_SETTINGS);
  const [invitations, setInvitations] = useState<CalendarInvitation[]>(MOCK_INVITATIONS);
  const [followers, setFollowers] = useState<CalendarFollower[]>(MOCK_CALENDAR_FOLLOWERS);
  const [comments, setComments] = useState<CalendarComment[]>(MOCK_EVENT_COMMENTS);
  const [workingHours, setWorkingHours] = useState<CalendarWorkingHours[]>(MOCK_WORKING_HOURS);
  const [holidays] = useState<CalendarHoliday[]>(MOCK_HOLIDAYS);
  const [outOfOffice, setOutOfOffice] = useState<CalendarOutOfOffice[]>(MOCK_OUT_OF_OFFICE);
  const [schedulingSuggestions, setSchedulingSuggestions] = useState<CalendarSchedulingSuggestion[]>(
    MOCK_SCHEDULING_SUGGESTIONS
  );
  const [delegations] = useState<CalendarDelegation[]>(MOCK_CALENDAR_DELEGATIONS);

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

  const connectCalendarIntegration = useCallback(
    async (provider: CalendarIntegrationProvider, accountEmail: string) => {
      const integration = await connectIntegration(provider, accountEmail);
      setIntegrations((current) => [...current, integration]);
    },
    []
  );

  const disconnectCalendarIntegration = useCallback(async (integrationId: string) => {
    await disconnectIntegration(integrationId);
    setIntegrations((current) => current.filter((integration) => integration.id !== integrationId));
  }, []);

  const syncCalendarIntegration = useCallback(async (integrationId: string) => {
    const result = await triggerIntegrationSync(integrationId);
    setIntegrations((current) =>
      current.map((integration) =>
        integration.id === result.id ? { ...integration, lastSyncAt: result.syncedAt, status: "connected" } : integration
      )
    );
  }, []);

  const setIntegrationConflictPreference = useCallback(
    async (integrationId: string, preference: CalendarConflictPreference) => {
      await updateConflictPreference(integrationId, preference);
      setIntegrations((current) =>
        current.map((integration) =>
          integration.id === integrationId ? { ...integration, conflictPreference: preference } : integration
        )
      );
    },
    []
  );

  const toggleAutomationRule = useCallback((ruleId: string) => {
    setAutomationRules((current) =>
      current.map((rule) => (rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule))
    );
  }, []);

  const updateShareRole = useCallback((shareId: string, role: CalendarShareSetting["role"]) => {
    setShareSettings((current) =>
      current.map((share) => (share.id === shareId ? { ...share, role } : share))
    );
  }, []);

  const removeShareTarget = useCallback((shareId: string) => {
    setShareSettings((current) => current.filter((share) => share.id !== shareId));
  }, []);

  const addShareTarget = useCallback((share: CalendarShareSetting) => {
    setShareSettings((current) => [...current, share]);
  }, []);

  const updateInvitationStatus = useCallback(
    (invitationId: string, status: CalendarInvitation["status"]) => {
      setInvitations((current) =>
        current.map((invitation) => (invitation.id === invitationId ? { ...invitation, status } : invitation))
      );
    },
    []
  );

  const addFollower = useCallback((follower: CalendarFollower) => {
    setFollowers((current) => [...current, follower]);
  }, []);

  const removeFollower = useCallback((followerId: string) => {
    setFollowers((current) => current.filter((follower) => follower.id !== followerId));
  }, []);

  const addComment = useCallback((comment: CalendarComment) => {
    setComments((current) => [...current, comment]);
  }, []);

  const updateWorkingHours = useCallback((ownerId: string, hours: Partial<CalendarWorkingHours>) => {
    setWorkingHours((current) =>
      current.map((item) =>
        item.ownerId === ownerId ? { ...item, ...hours, days: { ...item.days, ...(hours.days ?? {}) } } : item
      )
    );
  }, []);

  const upsertOutOfOffice = useCallback((entry: CalendarOutOfOffice) => {
    setOutOfOffice((current) => {
      const index = current.findIndex((item) => item.id === entry.id);
      if (index === -1) {
        return [...current, entry];
      }
      const next = [...current];
      next[index] = { ...next[index], ...entry };
      return next;
    });
  }, []);

  const acceptSchedulingSuggestion = useCallback((suggestionId: string) => {
    setSchedulingSuggestions((current) => current.filter((suggestion) => suggestion.id !== suggestionId));
  }, []);

  const refreshSchedulingSuggestions = useCallback(() => {
    setSchedulingSuggestions(MOCK_SCHEDULING_SUGGESTIONS.map((suggestion) => ({ ...suggestion })));
  }, []);

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
      integrations,
      connectCalendarIntegration,
      disconnectCalendarIntegration,
      syncCalendarIntegration,
      setIntegrationConflictPreference,
      automationRules,
      toggleAutomationRule,
      shareSettings,
      updateShareRole,
      removeShareTarget,
      addShareTarget,
      invitations,
      updateInvitationStatus,
      followers,
      addFollower,
      removeFollower,
      comments,
      addComment,
      workingHours,
      updateWorkingHours,
      holidays,
      outOfOffice,
      upsertOutOfOffice,
      schedulingSuggestions,
      acceptSchedulingSuggestion,
      refreshSchedulingSuggestions,
      delegations,
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
      integrations,
      connectCalendarIntegration,
      disconnectCalendarIntegration,
      syncCalendarIntegration,
      setIntegrationConflictPreference,
      automationRules,
      toggleAutomationRule,
      shareSettings,
      updateShareRole,
      removeShareTarget,
      addShareTarget,
      invitations,
      updateInvitationStatus,
      followers,
      addFollower,
      removeFollower,
      comments,
      addComment,
      workingHours,
      updateWorkingHours,
      holidays,
      outOfOffice,
      upsertOutOfOffice,
      schedulingSuggestions,
      acceptSchedulingSuggestion,
      refreshSchedulingSuggestions,
      delegations,
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
