import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type SlackDmType = "mention" | "assignment" | "approval";

export interface SlackDmPayload {
  itemId: string;
  itemTitle: string;
  status: string;
  dueDate?: string;
  actions: Array<"open" | "approve" | "snooze">;
}

export interface SlackDmMessage extends SlackDmPayload {
  id: string;
  userId: string;
  sentAt: string;
}

export interface SlackUnfurl {
  url: string;
  itemId: string;
  title: string;
  status: string;
  assignee?: string;
  dueDate?: string;
  restricted: boolean;
}

export type SlackProjectEvent = "new_item" | "release" | "status_change" | "sla_breach";

export interface SlackChannelConfig {
  channelId: string;
  events: SlackProjectEvent[];
}

export interface SlackAuditEntry {
  id: string;
  channelId: string;
  event: SlackProjectEvent;
  itemId: string;
  deliveredAt: string;
}

interface SlackPreferences {
  dmEnabled: boolean;
  mutedDmTypes: SlackDmType[];
}

interface SlackContextValue {
  dms: SlackDmMessage[];
  unfurls: SlackUnfurl[];
  auditLog: SlackAuditEntry[];
  userPreferences: Record<string, SlackPreferences>;
  setUserPreferences: (userId: string, prefs: Partial<SlackPreferences>) => void;
  sendDirectMessage: (userId: string, type: SlackDmType, payload: SlackDmPayload) => SlackDmMessage | null;
  generateUnfurl: (input: Omit<SlackUnfurl, "restricted"> & { viewerHasAccess: boolean }) => SlackUnfurl;
  configureProjectChannel: (projectId: string, config: SlackChannelConfig) => void;
  postProjectEvent: (projectId: string, event: SlackProjectEvent, itemId: string) => SlackAuditEntry | null;
}

const SlackContext = createContext<SlackContextValue | null>(null);

const STORAGE_KEY = "slack_state_v1";

interface SlackState {
  dms: SlackDmMessage[];
  unfurls: SlackUnfurl[];
  auditLog: SlackAuditEntry[];
  userPreferences: Record<string, SlackPreferences>;
  projectChannels: Record<string, SlackChannelConfig>;
}

const defaultState: SlackState = {
  dms: [],
  unfurls: [],
  auditLog: [],
  userPreferences: {},
  projectChannels: {},
};

const createId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export function SlackProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SlackState>(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (!raw) return defaultState;
    try {
      const parsed = JSON.parse(raw) as SlackState;
      return { ...defaultState, ...parsed };
    } catch {
      return defaultState;
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const value = useMemo<SlackContextValue>(() => ({
    dms: state.dms,
    unfurls: state.unfurls,
    auditLog: state.auditLog,
    userPreferences: state.userPreferences,
    setUserPreferences: (userId, prefs) => {
      setState((prev) => ({
        ...prev,
        userPreferences: {
          ...prev.userPreferences,
          [userId]: {
            dmEnabled: prefs.dmEnabled ?? prev.userPreferences[userId]?.dmEnabled ?? true,
            mutedDmTypes: prefs.mutedDmTypes ?? prev.userPreferences[userId]?.mutedDmTypes ?? [],
          },
        },
      }));
    },
    sendDirectMessage: (userId, type, payload) => {
      const prefs = state.userPreferences[userId] ?? { dmEnabled: true, mutedDmTypes: [] };
      if (!prefs.dmEnabled || prefs.mutedDmTypes.includes(type)) {
        return null;
      }
      if (!payload.dueDate) {
        throw new Error("Slack DM payload must include a due date");
      }
      const message: SlackDmMessage = {
        id: createId(),
        userId,
        sentAt: new Date().toISOString(),
        ...payload,
      };
      const requiredActions: SlackDmPayload["actions"] = ["open", "approve", "snooze"];
      const missing = requiredActions.filter((action) => !payload.actions.includes(action));
      if (missing.length > 0) {
        throw new Error(`Slack DM must include actions: ${missing.join(", ")}`);
      }
      setState((prev) => ({ ...prev, dms: [...prev.dms, message] }));
      return message;
    },
    generateUnfurl: ({ viewerHasAccess, ...rest }) => {
      const unfurl: SlackUnfurl = {
        ...rest,
        restricted: !viewerHasAccess,
      };
      setState((prev) => ({ ...prev, unfurls: [...prev.unfurls, unfurl] }));
      return unfurl;
    },
    configureProjectChannel: (projectId, config) => {
      setState((prev) => ({
        ...prev,
        projectChannels: {
          ...prev.projectChannels,
          [projectId]: config,
        },
      }));
    },
    postProjectEvent: (projectId, event, itemId) => {
      const config = state.projectChannels[projectId];
      if (!config || !config.events.includes(event)) {
        return null;
      }
      const entry: SlackAuditEntry = {
        id: createId(),
        channelId: config.channelId,
        event,
        itemId,
        deliveredAt: new Date().toISOString(),
      };
      setState((prev) => ({ ...prev, auditLog: [...prev.auditLog, entry] }));
      return entry;
    },
  }), [state]);

  return <SlackContext.Provider value={value}>{children}</SlackContext.Provider>;
}

export function useSlack() {
  const context = useContext(SlackContext);
  if (!context) {
    throw new Error("useSlack must be used within a SlackProvider");
  }
  return context;
}
