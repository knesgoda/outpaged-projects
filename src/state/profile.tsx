// @ts-nocheck
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

import { getMyProfile, type Profile } from "@/lib/profile";
import {
  getMyProfilePreferences,
  updateMyProfilePreferences,
  type ProfilePreferencesPayload,
} from "@/services/profilePreferences";
import {
  enqueueProfilePreferenceMutation,
  getProfilePreferenceSnapshot,
  listProfilePreferenceMutations,
  processProfilePreferenceQueue,
  saveProfilePreferenceSnapshot,
  type ProfilePreferenceRecord,
  type SyncOutcome,
} from "@/services/offline";

export type ProfileSyncState = "idle" | "saving" | "queued" | "error";

export interface WhiteboardNotePreference {
  id: string;
  text: string;
  color: string;
}

export interface WhiteboardPreference {
  notes?: WhiteboardNotePreference[];
}

export interface ProfileViewPreferences {
  table?: { visibleColumns?: string[] };
  calendar?: { mode?: "agenda" | "week" | "day" };
  timeline?: { zoom?: number };
  whiteboard?: WhiteboardPreference;
  [key: string]: unknown;
}

export interface ProfilePreferences {
  favorites: string[];
  viewSettings: Record<string, ProfileViewPreferences>;
  layoutSelections: Record<string, string>;
  updatedAt: string;
}

export interface ProfilePreferencesPatch {
  favorites?: string[];
  viewSettings?: Record<string, Partial<ProfileViewPreferences>>;
  layoutSelections?: Record<string, string | null>;
}

export type ProfileContextValue = {
  profile: Profile | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  preferences: ProfilePreferences;
  preferencesLoading: boolean;
  preferencesError: Error | null;
  updatePreferences: (patch: ProfilePreferencesPatch) => Promise<void>;
  toggleFavorite: (resourceId: string) => Promise<void>;
  setLayoutSelection: (key: string, value: string | null) => Promise<void>;
  syncState: ProfileSyncState;
  queueLength: number;
  refreshPreferences: () => Promise<void>;
};

const DEFAULT_PREFERENCES: ProfilePreferences = {
  favorites: [],
  viewSettings: {},
  layoutSelections: {},
  updatedAt: new Date(0).toISOString(),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function deepClone<T>(value: T): T {
  if (typeof value === "undefined" || value === null) {
    return value;
  }
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeViewPreferences(value: Record<string, unknown>): ProfileViewPreferences {
  const next: ProfileViewPreferences = {};

  const table = value.table;
  if (isRecord(table)) {
    const columns = Array.isArray(table.visibleColumns)
      ? table.visibleColumns.filter(isString)
      : undefined;
    if (columns) {
      next.table = { visibleColumns: [...columns] };
    }
  }

  const calendar = value.calendar;
  if (isRecord(calendar) && typeof calendar.mode === "string") {
    const mode = calendar.mode;
    if (mode === "agenda" || mode === "week" || mode === "day") {
      next.calendar = { mode };
    }
  }

  const timeline = value.timeline;
  if (isRecord(timeline) && typeof timeline.zoom === "number") {
    next.timeline = { zoom: timeline.zoom };
  }

  const whiteboard = value.whiteboard;
  if (isRecord(whiteboard) && Array.isArray(whiteboard.notes)) {
    const notes = whiteboard.notes
      .filter(isRecord)
      .map((note) => {
        if (typeof note.id !== "string" || typeof note.text !== "string" || typeof note.color !== "string") {
          return null;
        }
        return { id: note.id, text: note.text, color: note.color } satisfies WhiteboardNotePreference;
      })
      .filter((note): note is WhiteboardNotePreference => Boolean(note));
    next.whiteboard = { notes };
  }

  for (const [key, raw] of Object.entries(value)) {
    if (key === "table" || key === "calendar" || key === "timeline" || key === "whiteboard") {
      continue;
    }
    if (Array.isArray(raw)) {
      next[key] = raw.map((entry) => (isRecord(entry) ? { ...entry } : entry));
    } else if (isRecord(raw)) {
      next[key] = { ...raw };
    } else {
      next[key] = raw;
    }
  }

  return next;
}

function toStorePreferences(
  payload?: ProfilePreferencesPayload | ProfilePreferenceRecord | null
): ProfilePreferences {
  if (!payload) {
    return { ...DEFAULT_PREFERENCES };
  }

  const favorites = Array.isArray(payload.favorites)
    ? Array.from(new Set(payload.favorites.filter(isString)))
    : [];

  const viewSettings: Record<string, ProfileViewPreferences> = {};
  if (isRecord(payload.viewSettings)) {
    for (const [scope, value] of Object.entries(payload.viewSettings)) {
      if (isRecord(value)) {
        viewSettings[scope] = normalizeViewPreferences(value);
      }
    }
  }

  const layoutSelections: Record<string, string> = {};
  if (isRecord(payload.layoutSelections)) {
    for (const [key, value] of Object.entries(payload.layoutSelections)) {
      if (isString(value)) {
        layoutSelections[key] = value;
      }
    }
  }

  return {
    favorites,
    viewSettings,
    layoutSelections,
    updatedAt:
      typeof payload.updatedAt === "string"
        ? payload.updatedAt
        : typeof (payload as Record<string, unknown>).updated_at === "string"
          ? ((payload as Record<string, unknown>).updated_at as string)
          : DEFAULT_PREFERENCES.updatedAt,
  } satisfies ProfilePreferences;
}

function mergeViewPreferences(
  base: ProfileViewPreferences,
  patch: Partial<ProfileViewPreferences>
): ProfileViewPreferences {
  const next = deepClone(base);

  if (patch.table) {
    next.table = {
      ...(base.table ?? {}),
      ...(patch.table ?? {}),
    };
    if (patch.table.visibleColumns) {
      next.table.visibleColumns = [...patch.table.visibleColumns];
    }
  }

  if (patch.calendar) {
    next.calendar = {
      ...(base.calendar ?? {}),
      ...(patch.calendar ?? {}),
    };
  }

  if (patch.timeline) {
    next.timeline = {
      ...(base.timeline ?? {}),
      ...(patch.timeline ?? {}),
    };
  }

  if (patch.whiteboard) {
    const existing = base.whiteboard ?? {};
    const merged: WhiteboardPreference = { ...existing, ...patch.whiteboard };
    if (patch.whiteboard.notes) {
      merged.notes = patch.whiteboard.notes.map((note) => ({ ...note }));
    }
    next.whiteboard = merged;
  }

  for (const [key, value] of Object.entries(patch)) {
    if (key === "table" || key === "calendar" || key === "timeline" || key === "whiteboard") {
      continue;
    }
    if (value == null) {
      delete next[key];
    } else if (isRecord(value)) {
      next[key] = {
        ...(isRecord(base[key]) ? (base[key] as Record<string, unknown>) : {}),
        ...value,
      };
    } else {
      next[key] = value;
    }
  }

  return next;
}

function mergePreferences(base: ProfilePreferences, patch: ProfilePreferencesPatch): ProfilePreferences {
  const next: ProfilePreferences = {
    favorites: [...base.favorites],
    viewSettings: deepClone(base.viewSettings),
    layoutSelections: { ...base.layoutSelections },
    updatedAt: base.updatedAt,
  };

  if (patch.favorites) {
    next.favorites = Array.from(new Set(patch.favorites.filter(isString)));
  }

  if (patch.viewSettings) {
    for (const [scope, value] of Object.entries(patch.viewSettings)) {
      const current = next.viewSettings[scope] ?? {};
      next.viewSettings[scope] = mergeViewPreferences(current, value ?? {});
    }
  }

  if (patch.layoutSelections) {
    for (const [key, value] of Object.entries(patch.layoutSelections)) {
      if (value == null) {
        delete next.layoutSelections[key];
      } else {
        next.layoutSelections[key] = value;
      }
    }
  }

  return next;
}

function stripTimestamp(preferences: ProfilePreferences) {
  return {
    favorites: preferences.favorites,
    viewSettings: preferences.viewSettings,
    layoutSelections: preferences.layoutSelections,
  };
}

function preferencesEqual(a: ProfilePreferences, b: ProfilePreferences) {
  return JSON.stringify(stripTimestamp(a)) === JSON.stringify(stripTimestamp(b));
}

function toPreferenceRecord(preferences: ProfilePreferences): ProfilePreferenceRecord {
  return {
    favorites: [...preferences.favorites],
    viewSettings: deepClone(preferences.viewSettings as Record<string, unknown>),
    layoutSelections: { ...preferences.layoutSelections },
    updatedAt: preferences.updatedAt,
  } satisfies ProfilePreferenceRecord;
}

function toPreferencePayload(preferences: ProfilePreferences): ProfilePreferencesPayload {
  return {
    favorites: [...preferences.favorites],
    viewSettings: deepClone(preferences.viewSettings as Record<string, unknown>),
    layoutSelections: { ...preferences.layoutSelections },
    updatedAt: preferences.updatedAt,
  } satisfies ProfilePreferencesPayload;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [preferences, setPreferences] = useState<ProfilePreferences>({ ...DEFAULT_PREFERENCES });
  const [preferencesLoading, setPreferencesLoading] = useState(true);
  const [preferencesError, setPreferencesError] = useState<Error | null>(null);
  const [syncState, setSyncState] = useState<ProfileSyncState>("idle");
  const [queueLength, setQueueLength] = useState(0);

  const preferencesRef = useRef(preferences);
  useEffect(() => {
    preferencesRef.current = preferences;
  }, [preferences]);

  const userIdRef = useRef<string | null>(null);
  useEffect(() => {
    userIdRef.current = profile?.user_id ?? null;
  }, [profile?.user_id]);

  const loadedUserIdRef = useRef<string | null>(null);
  const isFlushingRef = useRef(false);

  const persistSnapshot = useCallback(async (userId: string, current: ProfilePreferences) => {
    await saveProfilePreferenceSnapshot({
      id: `pref-${userId}`,
      userId,
      preferences: toPreferenceRecord(current),
      updatedAt: Date.now(),
    });
  }, []);

  const loadPreferences = useCallback(
    async (userId: string) => {
      setPreferencesLoading(true);
      let currentPreferences = preferencesRef.current;
      try {
        const remote = await getMyProfilePreferences();
        currentPreferences = toStorePreferences(remote);
        setPreferences(currentPreferences);
        preferencesRef.current = currentPreferences;
        setPreferencesError(null);
      } catch (loadError) {
        const errorInstance =
          loadError instanceof Error ? loadError : new Error("Failed to load preferences");
        console.warn("Failed to fetch profile preferences", errorInstance);
        setPreferencesError(errorInstance);
        try {
          const snapshot = await getProfilePreferenceSnapshot(userId);
          if (snapshot) {
            currentPreferences = toStorePreferences(snapshot.preferences);
            setPreferences(currentPreferences);
            preferencesRef.current = currentPreferences;
          } else {
            currentPreferences = { ...DEFAULT_PREFERENCES };
            setPreferences(currentPreferences);
            preferencesRef.current = currentPreferences;
          }
        } catch (snapshotError) {
          console.warn("Failed to read cached preference snapshot", snapshotError);
          currentPreferences = { ...DEFAULT_PREFERENCES };
          setPreferences(currentPreferences);
          preferencesRef.current = currentPreferences;
        }
      } finally {
        loadedUserIdRef.current = userId;
        await persistSnapshot(userId, currentPreferences);
        const queue = await listProfilePreferenceMutations(userId);
        setQueueLength(queue.length);
        setSyncState(queue.length > 0 ? "queued" : "idle");
        setPreferencesLoading(false);
      }
    },
    [persistSnapshot]
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMyProfile();
      setProfile(result);
      setError(null);
      if (result?.user_id) {
        await loadPreferences(result.user_id);
      } else {
        const reset = { ...DEFAULT_PREFERENCES };
        setPreferences(reset);
        preferencesRef.current = reset;
        setPreferencesError(null);
        setPreferencesLoading(false);
        setSyncState("idle");
        setQueueLength(0);
        loadedUserIdRef.current = null;
      }
    } catch (refreshError) {
      const errorInstance =
        refreshError instanceof Error ? refreshError : new Error("Failed to load profile");
      console.error("Failed to refresh profile", refreshError);
      setProfile(null);
      setError(errorInstance);
    } finally {
      setLoading(false);
    }
  }, [loadPreferences]);

  const refreshPreferences = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    await loadPreferences(userId);
  }, [loadPreferences]);

  const updatePreferences = useCallback(
    async (patch: ProfilePreferencesPatch) => {
      const userId = userIdRef.current;
      if (!userId) {
        throw new Error("Cannot update preferences without a user");
      }

      const base = preferencesRef.current ?? DEFAULT_PREFERENCES;
      const merged = mergePreferences(base, patch);
      if (preferencesEqual(base, merged)) {
        return;
      }

      const next: ProfilePreferences = { ...merged, updatedAt: new Date().toISOString() };
      setPreferences(next);
      preferencesRef.current = next;
      setPreferencesError(null);
      await persistSnapshot(userId, next);

      const online = typeof navigator === "undefined" ? true : navigator.onLine;
      if (online) {
        setSyncState("saving");
        try {
          const payload = toPreferencePayload(next);
          const remote = await updateMyProfilePreferences(payload);
          const normalized = toStorePreferences(remote);
          setPreferences(normalized);
          preferencesRef.current = normalized;
          await persistSnapshot(userId, normalized);
          const queue = await listProfilePreferenceMutations(userId);
          setQueueLength(queue.length);
          setSyncState(queue.length > 0 ? "queued" : "idle");
          return;
        } catch (error) {
          const errorInstance =
            error instanceof Error ? error : new Error("Failed to persist preferences remotely");
          console.warn("Preference update failed remotely, queueing", errorInstance);
          setPreferencesError(errorInstance);
        }
      }

      await enqueueProfilePreferenceMutation({ userId, payload: toPreferenceRecord(next) });
      const queue = await listProfilePreferenceMutations(userId);
      setQueueLength(queue.length);
      setSyncState("queued");
    },
    [persistSnapshot]
  );

  const flushPreferenceQueue = useCallback(async () => {
    if (isFlushingRef.current) return;
    const userId = userIdRef.current;
    if (!userId) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;

    const pending = await listProfilePreferenceMutations(userId);
    if (pending.length === 0) {
      setQueueLength(0);
      if (syncState === "queued") {
        setSyncState("idle");
      }
      return;
    }

    isFlushingRef.current = true;
    setSyncState("saving");
    try {
      const result = await processProfilePreferenceQueue(userId, async (mutation) => {
        try {
          const payload = toPreferencePayload(toStorePreferences(mutation.payload));
          const remote = await updateMyProfilePreferences(payload);
          const normalized = toStorePreferences(remote);
          setPreferences(normalized);
          preferencesRef.current = normalized;
          await persistSnapshot(userId, normalized);
          return { kind: "success" } as SyncOutcome;
        } catch (error) {
          console.warn("Failed to replay preference mutation", error);
          return { kind: "skipped" } as SyncOutcome;
        }
      });

      const queue = await listProfilePreferenceMutations(userId);
      setQueueLength(queue.length);
      if (result.conflicts.length > 0) {
        setSyncState("error");
        if (!preferencesError) {
          setPreferencesError(new Error("Preference sync conflict"));
        }
      } else if (queue.length === 0) {
        setSyncState("idle");
      } else {
        setSyncState("queued");
      }
    } finally {
      isFlushingRef.current = false;
    }
  }, [preferencesError, persistSnapshot, syncState]);

  const toggleFavorite = useCallback(
    async (resourceId: string) => {
      const favorites = preferencesRef.current?.favorites ?? [];
      const nextFavorites = favorites.includes(resourceId)
        ? favorites.filter((value) => value !== resourceId)
        : [...favorites, resourceId];
      await updatePreferences({ favorites: nextFavorites });
    },
    [updatePreferences]
  );

  const setLayoutSelection = useCallback(
    async (key: string, value: string | null) => {
      await updatePreferences({ layoutSelections: { [key]: value } });
    },
    [updatePreferences]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const userId = profile?.user_id;
    if (!userId) {
      loadedUserIdRef.current = null;
      setPreferences({ ...DEFAULT_PREFERENCES });
      preferencesRef.current = { ...DEFAULT_PREFERENCES };
      setPreferencesLoading(false);
      setQueueLength(0);
      setSyncState("idle");
      return;
    }
    if (loadedUserIdRef.current === userId) {
      return;
    }
    void loadPreferences(userId);
  }, [profile?.user_id, loadPreferences]);

  useEffect(() => {
    if (queueLength === 0) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return;
    void flushPreferenceQueue();
  }, [queueLength, flushPreferenceQueue]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => {
      void flushPreferenceQueue();
      void refreshPreferences();
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [flushPreferenceQueue, refreshPreferences]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleRefocus = () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return;
      }
      void refreshPreferences();
    };
    window.addEventListener("focus", handleRefocus);
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", handleRefocus);
    }
    return () => {
      window.removeEventListener("focus", handleRefocus);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", handleRefocus);
      }
    };
  }, [refreshPreferences]);

  const value = useMemo(
    () => ({
      profile,
      loading,
      error,
      refresh,
      preferences,
      preferencesLoading,
      preferencesError,
      updatePreferences,
      toggleFavorite,
      setLayoutSelection,
      syncState,
      queueLength,
      refreshPreferences,
    }),
    [
      profile,
      loading,
      error,
      refresh,
      preferences,
      preferencesLoading,
      preferencesError,
      updatePreferences,
      toggleFavorite,
      setLayoutSelection,
      syncState,
      queueLength,
      refreshPreferences,
    ]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }

  return context;
}

export function useProfilePreferencesScope(scope: string) {
  const { preferences, updatePreferences } = useProfile();
  const viewSettings = useMemo(() => preferences.viewSettings[scope] ?? {}, [preferences.viewSettings, scope]);

  const updateViewSettings = useCallback(
    async (patch: Partial<ProfileViewPreferences>) => {
      await updatePreferences({ viewSettings: { [scope]: patch } });
    },
    [scope, updatePreferences]
  );

  return { viewSettings, updateViewSettings };
}
