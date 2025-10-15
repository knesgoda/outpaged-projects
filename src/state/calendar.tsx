// @ts-nocheck
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  addCalendarComment,
  addCalendarFollower,
  addCalendarShare,
  deleteCalendarNotifications,
  deleteCalendarSchedulingSuggestion,
  fetchCalendarAutomationRules,
  fetchCalendarComments,
  fetchCalendarDelegations,
  fetchCalendarFollowers,
  fetchCalendarHolidays,
  fetchCalendarInvitations,
  fetchCalendarLayers,
  fetchCalendarNotifications,
  fetchCalendarOutOfOffice,
  fetchCalendarSchedulingSuggestions,
  fetchCalendarShareSettings,
  fetchCalendarWorkingHours,
  removeCalendarFollower,
  removeCalendarShare,
  setAutomationRuleEnabled,
  updateCalendarInvitationStatus,
  updateCalendarLayerPreferences,
  updateCalendarShareRole,
  upsertCalendarNotifications,
  upsertCalendarOutOfOffice,
  upsertCalendarWorkingHours,
} from "@/services/calendarMetadata";
import type {
  CalendarAutomationRule,
  CalendarComment,
  CalendarConflictPreference,
  CalendarDelegation,
  CalendarDensity,
  CalendarDocumentationEntry,
  CalendarFilterGroup,
  CalendarFollower,
  CalendarGovernanceSettings,
  CalendarHoliday,
  CalendarInvitation,
  CalendarIntegration,
  CalendarIntegrationProvider,
  CalendarLayer,
  CalendarNotification,
  CalendarOutOfOffice,
  CalendarSavedFilter,
  CalendarSavedView,
  CalendarSearchToken,
  CalendarShareSetting,
  CalendarWorkingHours,
  CalendarDefaultSettings,
  SchedulingAssistantSuggestion,
} from "@/types/calendar";
import {
  connectIntegration,
  disconnectIntegration,
  fetchCalendarIntegrations,
  subscribeToIntegrationUpdates,
  triggerIntegrationSync,
  updateConflictPreference,
} from "@/services/calendarIntegrations";
const DEFAULT_CALENDAR_SETTINGS: CalendarDefaultSettings = {
  defaultView: "week",
  workingHoursStart: 9,
  workingHoursEnd: 17,
  snapMinutes: 15,
  defaultReminderMinutes: 10,
  defaultVisibility: "team",
  defaultTimezone: "UTC",
  maxEventDurationHours: 8,
  colorEncoding: "calendar",
};

const DEFAULT_GOVERNANCE_SETTINGS: CalendarGovernanceSettings = {
  activeHolidaySet: "us-national",
  holidaySets: [
    { id: "us-national", name: "US National", active: true },
    { id: "emea", name: "EMEA Regional", active: false },
  ],
  integrationLimits: [
    { provider: "google", maxConnections: 5 },
    { provider: "outlook", maxConnections: 3 },
    { provider: "apple", maxConnections: 2 },
  ],
  retentionPolicy: {
    retainEventsMonths: 24,
    purgeAttachments: false,
  },
  dataResidency: "us-east",
  delegationPolicies: [
    { id: "delegation-default", name: "Default delegation", enabled: true },
    { id: "delegation-exec", name: "Executive assistant", enabled: true },
  ],
  complianceExportsEnabled: true,
  encryptionAtRest: true,
};

const DEFAULT_DOCUMENTATION: CalendarDocumentationEntry[] = [
  {
    id: "docs-visual-encoding",
    title: "Understand calendar visual encoding",
    description: "Learn how stripes, dots, and badges communicate status and urgency.",
    href: "https://example.com/docs/calendar-visuals",
  },
  {
    id: "docs-automation",
    title: "Calendar automations",
    description: "Configure rules to sync tasks, releases, and vacations automatically.",
    href: "https://example.com/docs/calendar-automation",
  },
  {
    id: "docs-governance",
    title: "Governance & compliance",
    description: "Manage retention, residency, and audit exports for calendar data.",
    href: "https://example.com/docs/calendar-governance",
  },
];

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
  schedulingSuggestions: SchedulingAssistantSuggestion[];
  acceptSchedulingSuggestion: (suggestionId: string) => void;
  refreshSchedulingSuggestions: () => void;
  delegations: CalendarDelegation[];
  defaults: CalendarDefaultSettings;
  updateDefaultSetting: <K extends keyof CalendarDefaultSettings>(
    key: K,
    value: CalendarDefaultSettings[K]
  ) => void;
  resetDefaults: () => void;
  governance: CalendarGovernanceSettings;
  updateGovernanceSetting: <K extends keyof CalendarGovernanceSettings>(
    key: K,
    value: CalendarGovernanceSettings[K]
  ) => void;
  documentation: CalendarDocumentationEntry[];
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
  const [integrations, setIntegrations] = useState<CalendarIntegration[]>([]);
  const [automationRules, setAutomationRules] = useState<CalendarAutomationRule[]>([]);
  const [shareSettings, setShareSettings] = useState<CalendarShareSetting[]>([]);
  const [invitations, setInvitations] = useState<CalendarInvitation[]>([]);
  const [followers, setFollowers] = useState<CalendarFollower[]>([]);
  const [comments, setComments] = useState<CalendarComment[]>([]);
  const [workingHours, setWorkingHours] = useState<CalendarWorkingHours[]>([]);
  const [holidays, setHolidays] = useState<CalendarHoliday[]>([]);
  const [outOfOffice, setOutOfOffice] = useState<CalendarOutOfOffice[]>([]);
  const [schedulingSuggestions, setSchedulingSuggestions] = useState<SchedulingAssistantSuggestion[]>([]);
  const [delegations, setDelegations] = useState<CalendarDelegation[]>([]);
  const [defaults, setDefaults] = useState<CalendarDefaultSettings>(DEFAULT_CALENDAR_SETTINGS);
  const [governance, setGovernance] = useState<CalendarGovernanceSettings>(DEFAULT_GOVERNANCE_SETTINGS);
  const [documentation] = useState<CalendarDocumentationEntry[]>(DEFAULT_DOCUMENTATION);

  const loadCalendarLayers = useCallback(async () => {
    const layers = await fetchCalendarLayers();
    return layers;
  }, []);

  const refreshCalendars = useCallback(async () => {
    setLoading(true);
    try {
      const next = await loadCalendarLayers();
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
  }, [loadCalendarLayers]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      setLoading(true);
      try {
        const [
          layerData,
          notificationData,
          integrationData,
          automationData,
          shareData,
          invitationData,
          followerData,
          commentData,
          workingHoursData,
          holidayData,
          outOfOfficeData,
          schedulingData,
          delegationData,
        ] = await Promise.all([
          loadCalendarLayers(),
          fetchCalendarNotifications(),
          fetchCalendarIntegrations(),
          fetchCalendarAutomationRules(),
          fetchCalendarShareSettings(),
          fetchCalendarInvitations(),
          fetchCalendarFollowers(),
          fetchCalendarComments(),
          fetchCalendarWorkingHours(),
          fetchCalendarHolidays(),
          fetchCalendarOutOfOffice(),
          fetchCalendarSchedulingSuggestions(),
          fetchCalendarDelegations(),
        ]);

        if (cancelled) {
          return;
        }

        setCalendars(layerData);
        setNotificationsState(notificationData);
        setIntegrations(integrationData);
        setAutomationRules(automationData);
        setShareSettings(shareData);
        setInvitations(invitationData);
        setFollowers(followerData);
        setComments(commentData);
        setWorkingHours(workingHoursData);
        setHolidays(holidayData);
        setOutOfOffice(outOfOfficeData);
        setSchedulingSuggestions(schedulingData);
        setDelegations(delegationData);
        setError(null);
      } catch (cause) {
        if (!cancelled) {
          const message =
            cause instanceof Error
              ? cause
              : new Error("Unable to load calendar data. Please try again later.");
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [loadCalendarLayers]);

  useEffect(() => {
    const unsubscribe = subscribeToIntegrationUpdates((event) => {
      setIntegrations((current) => {
        if (event.type === "disconnected") {
          return current.filter((integration) => integration.id !== event.integration.id);
        }

        const normalized = {
          ...event.integration,
          pendingConflicts:
            typeof event.conflicts !== "undefined"
              ? event.conflicts?.length ?? event.integration.pendingConflicts
              : event.integration.pendingConflicts,
        } satisfies CalendarIntegration;

        const existingIndex = current.findIndex((integration) => integration.id === normalized.id);
        if (existingIndex === -1) {
          return [...current, normalized];
        }

        const next = [...current];
        next[existingIndex] = { ...next[existingIndex], ...normalized };
        return next;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const toggleCalendarVisibility = useCallback(
    (calendarId: string) => {
      setCalendars((current) => {
        return current.map((calendar) => {
          if (calendar.id !== calendarId || !calendar.subscribed) {
            return calendar;
          }
          const updated = { ...calendar, visible: !calendar.visible };
          void updateCalendarLayerPreferences(calendarId, { visible: updated.visible }).catch((error) => {
            console.error("Failed to update calendar visibility", error);
          });
          return updated;
        });
      });
    },
    []
  );

  const setCalendarColor = useCallback((calendarId: string, color: string) => {
    setCalendars((current) => {
      return current.map((calendar) => {
        if (calendar.id !== calendarId) {
          return calendar;
        }
        void updateCalendarLayerPreferences(calendarId, { color }).catch((error) => {
          console.error("Failed to update calendar color", error);
        });
        return { ...calendar, color };
      });
    });
  }, []);

  const subscribeToCalendar = useCallback((calendarId: string) => {
    setCalendars((current) => {
      return current.map((calendar) => {
        if (calendar.id !== calendarId) {
          return calendar;
        }
        const updated = { ...calendar, subscribed: true, visible: true };
        void updateCalendarLayerPreferences(calendarId, {
          subscribed: true,
          visible: true,
        }).catch((error) => {
          console.error("Failed to subscribe to calendar", error);
        });
        return updated;
      });
    });
  }, []);

  const unsubscribeFromCalendar = useCallback((calendarId: string) => {
    setCalendars((current) => {
      return current.map((calendar) => {
        if (calendar.id !== calendarId) {
          return calendar;
        }
        const updated = { ...calendar, subscribed: false, visible: false };
        void updateCalendarLayerPreferences(calendarId, {
          subscribed: false,
          visible: false,
        }).catch((error) => {
          console.error("Failed to unsubscribe from calendar", error);
        });
        return updated;
      });
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
          visible: view.calendarIds.includes(calendar.id)
            ? calendar.visible || calendar.subscribed
            : false,
        }));

        const updates = next.reduce<Promise<void>[]>((acc, calendar, index) => {
          const previous = current[index];
          if (previous && previous.visible !== calendar.visible) {
            acc.push(
              updateCalendarLayerPreferences(calendar.id, { visible: calendar.visible }).catch((error) => {
                console.error("Failed to update calendar visibility", error);
              })
            );
          }
          return acc;
        }, []);
        if (updates.length > 0) {
          void Promise.all(updates);
        }
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
      setNotificationsState((current) => {
        const next = updater(current);
        const currentById = new Map(current.map((item) => [item.id, item]));
        const nextIds = new Set(next.map((item) => item.id));

        const removedIds = current
          .filter((item) => !nextIds.has(item.id))
          .map((item) => item.id);

        const changedNotifications = next.filter((item) => {
          const existing = currentById.get(item.id);
          return !existing || JSON.stringify(existing) !== JSON.stringify(item);
        });

        void (async () => {
          try {
            if (changedNotifications.length > 0) {
              await upsertCalendarNotifications(changedNotifications);
            }
            if (removedIds.length > 0) {
              await deleteCalendarNotifications(removedIds);
            }
          } catch (error) {
            console.error("Failed to persist calendar notifications", error);
          }
        })();

        return next;
      });
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
      current.map((rule) => {
        if (rule.id !== ruleId) {
          return rule;
        }
        const next = { ...rule, enabled: !rule.enabled };
        void setAutomationRuleEnabled(ruleId, next.enabled).catch((error) => {
          console.error("Failed to update automation rule", error);
        });
        return next;
      })
    );
  }, []);

  const updateShareRole = useCallback((shareId: string, role: CalendarShareSetting["role"]) => {
    setShareSettings((current) =>
      current.map((share) => {
        if (share.id !== shareId) {
          return share;
        }
        void updateCalendarShareRole(shareId, role).catch((error) => {
          console.error("Failed to update share role", error);
        });
        return { ...share, role };
      })
    );
  }, []);

  const removeShareTarget = useCallback((shareId: string) => {
    setShareSettings((current) => current.filter((share) => share.id !== shareId));
    void removeCalendarShare(shareId).catch((error) => {
      console.error("Failed to remove share target", error);
    });
  }, []);

  const addShareTarget = useCallback((share: CalendarShareSetting) => {
    setShareSettings((current) => [...current, share]);
    void addCalendarShare(share).catch((error) => {
      console.error("Failed to add share target", error);
    });
  }, []);

  const updateInvitationStatus = useCallback(
    (invitationId: string, status: CalendarInvitation["status"]) => {
      setInvitations((current) =>
        current.map((invitation) => {
          if (invitation.id !== invitationId) {
            return invitation;
          }
          void updateCalendarInvitationStatus(invitationId, status).catch((error) => {
            console.error("Failed to update invitation", error);
          });
          return { ...invitation, status };
        })
      );
    },
    []
  );

  const addFollower = useCallback((follower: CalendarFollower) => {
    setFollowers((current) => [...current, follower]);
    void addCalendarFollower(follower).catch((error) => {
      console.error("Failed to add follower", error);
    });
  }, []);

  const removeFollower = useCallback((followerId: string) => {
    setFollowers((current) => current.filter((follower) => follower.id !== followerId));
    void removeCalendarFollower(followerId).catch((error) => {
      console.error("Failed to remove follower", error);
    });
  }, []);

  const addComment = useCallback((comment: CalendarComment) => {
    setComments((current) => [...current, comment]);
    void addCalendarComment(comment).catch((error) => {
      console.error("Failed to add comment", error);
    });
  }, []);

  const updateWorkingHours = useCallback((ownerId: string, hours: Partial<CalendarWorkingHours>) => {
    setWorkingHours((current) => {
      const existing = current.find((item) => item.ownerId === ownerId);
      const base: CalendarWorkingHours = existing ?? {
        ownerId,
        timezone: hours.timezone ?? "UTC",
        days: (hours.days as CalendarWorkingHours["days"]) ?? ({} as CalendarWorkingHours["days"]),
      };
      const merged: CalendarWorkingHours = {
        ...base,
        ...hours,
        days: { ...base.days, ...(hours.days ?? {}) },
      };

      void upsertCalendarWorkingHours(merged).catch((error) => {
        console.error("Failed to update working hours", error);
      });

      if (existing) {
        return current.map((item) => (item.ownerId === ownerId ? merged : item));
      }
      return [...current, merged];
    });
  }, []);

  const upsertOutOfOffice = useCallback((entry: CalendarOutOfOffice) => {
    setOutOfOffice((current) => {
      const index = current.findIndex((item) => item.id === entry.id);
      const nextEntry = { ...entry };
      void upsertCalendarOutOfOffice(nextEntry).catch((error) => {
        console.error("Failed to persist out of office entry", error);
      });
      if (index === -1) {
        return [...current, nextEntry];
      }
      const next = [...current];
      next[index] = nextEntry;
      return next;
    });
  }, []);

  const acceptSchedulingSuggestion = useCallback((suggestionId: string) => {
    setSchedulingSuggestions((current) => current.filter((suggestion) => suggestion.id !== suggestionId));
    void deleteCalendarSchedulingSuggestion(suggestionId).catch((error) => {
      console.error("Failed to dismiss scheduling suggestion", error);
    });
  }, []);

  const refreshSchedulingSuggestions = useCallback(() => {
    fetchCalendarSchedulingSuggestions()
      .then((suggestions) => {
        setSchedulingSuggestions(suggestions);
      })
      .catch((error) => {
        console.error("Failed to refresh scheduling suggestions", error);
      });
  }, []);

  const updateDefaultSetting = useCallback(
    <K extends keyof CalendarDefaultSettings>(key: K, value: CalendarDefaultSettings[K]) => {
      setDefaults((current) => ({ ...current, [key]: value }));
    },
    []
  );

  const resetDefaults = useCallback(() => {
    setDefaults(DEFAULT_CALENDAR_SETTINGS);
  }, []);

  const updateGovernanceSetting = useCallback(
    <K extends keyof CalendarGovernanceSettings>(key: K, value: CalendarGovernanceSettings[K]) => {
      setGovernance((current) => ({ ...current, [key]: value }));
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
      defaults,
      updateDefaultSetting,
      resetDefaults,
      governance,
      updateGovernanceSetting,
      documentation,
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
      defaults,
      updateDefaultSetting,
      resetDefaults,
      governance,
      updateGovernanceSetting,
      documentation,
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
