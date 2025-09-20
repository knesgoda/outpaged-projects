import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ReleaseState = "planning" | "ready" | "released";

export interface ReleaseChecklistItem {
  id: string;
  label: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface LinkedItemSummary {
  id: string;
  title: string;
  type: "story" | "bug" | "task" | "doc";
  summary: string;
}

export interface ReleaseRecord {
  id: string;
  name: string;
  version: string;
  state: ReleaseState;
  createdAt: string;
  updatedAt: string;
  checklist: ReleaseChecklistItem[];
  linkedItems: LinkedItemSummary[];
  notesDraft: string;
}

interface ReleaseContextValue {
  releases: ReleaseRecord[];
  createRelease: (input: { name: string; version: string; checklistTemplate?: string[] }) => ReleaseRecord;
  linkItemToRelease: (releaseId: string, item: LinkedItemSummary) => void;
  toggleChecklistItem: (releaseId: string, itemId: string, actor: string) => void;
  transitionRelease: (releaseId: string, nextState: ReleaseState) => void;
  updateNotesDraft: (releaseId: string, notes: string) => void;
  generateReleaseNotes: (releaseId: string) => string;
  getReleaseById: (releaseId: string) => ReleaseRecord | undefined;
}

const ReleaseContext = createContext<ReleaseContextValue | null>(null);

const STORAGE_KEY = "release_state_v1";

const createId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2));

const SEMVER_REGEX = /^(?:v)?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-.]+)?$/;

export function ReleaseProvider({ children }: { children: React.ReactNode }) {
  const [releases, setReleases] = useState<ReleaseRecord[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw) as ReleaseRecord[];
      return parsed.map((release) => ({
        ...release,
        checklist: release.checklist ?? [],
        linkedItems: release.linkedItems ?? [],
      }));
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(releases));
  }, [releases]);

  const value = useMemo<ReleaseContextValue>(() => ({
    releases,
    createRelease: ({ name, version, checklistTemplate }) => {
      if (!SEMVER_REGEX.test(version)) {
        throw new Error("Release version must follow semantic versioning");
      }
      const now = new Date().toISOString();
      const checklist: ReleaseChecklistItem[] = (checklistTemplate ?? []).map((label) => ({
        id: createId(),
        label,
        completed: false,
      }));
      const release: ReleaseRecord = {
        id: createId(),
        name,
        version,
        state: "planning",
        createdAt: now,
        updatedAt: now,
        checklist,
        linkedItems: [],
        notesDraft: "",
      };
      setReleases((prev) => [...prev, release]);
      return release;
    },
    linkItemToRelease: (releaseId, item) => {
      setReleases((prev) =>
        prev.map((release) =>
          release.id === releaseId
            ? {
                ...release,
                linkedItems: release.linkedItems.some((linked) => linked.id === item.id)
                  ? release.linkedItems
                  : [...release.linkedItems, item],
              }
            : release
        )
      );
    },
    toggleChecklistItem: (releaseId, itemId, actor) => {
      setReleases((prev) =>
        prev.map((release) =>
          release.id === releaseId
            ? {
                ...release,
                checklist: release.checklist.map((item) =>
                  item.id === itemId
                    ? {
                        ...item,
                        completed: !item.completed,
                        completedAt: !item.completed ? new Date().toISOString() : undefined,
                        completedBy: !item.completed ? actor : undefined,
                      }
                    : item
                ),
              }
            : release
        )
      );
    },
    transitionRelease: (releaseId, nextState) => {
      setReleases((prev) =>
        prev.map((release) => {
          if (release.id !== releaseId) return release;
          if (nextState === "released") {
            const hasIncomplete = release.checklist.some((item) => !item.completed);
            if (hasIncomplete) {
              throw new Error("All checklist items must be completed before releasing");
            }
          }
          return {
            ...release,
            state: nextState,
            updatedAt: new Date().toISOString(),
          };
        })
      );
    },
    updateNotesDraft: (releaseId, notes) => {
      setReleases((prev) =>
        prev.map((release) =>
          release.id === releaseId
            ? { ...release, notesDraft: notes }
            : release
        )
      );
    },
    generateReleaseNotes: (releaseId) => {
      const release = releases.find((item) => item.id === releaseId);
      if (!release) {
        throw new Error("Release not found");
      }
      const grouped = release.linkedItems.reduce<Record<LinkedItemSummary["type"], LinkedItemSummary[]>>((acc, item) => {
        if (!acc[item.type]) acc[item.type] = [];
        acc[item.type].push(item);
        return acc;
      }, {} as Record<LinkedItemSummary["type"], LinkedItemSummary[]>);
      const lines: string[] = [`# Release ${release.version}`, "", `State: ${release.state}`];
      Object.entries(grouped).forEach(([type, items]) => {
        lines.push("", `## ${type.charAt(0).toUpperCase()}${type.slice(1)}s`);
        items.forEach((item) => {
          lines.push(`- **${item.title}** — ${item.summary}`);
        });
      });
      if (release.notesDraft.trim()) {
        lines.push("", "## Additional Notes", release.notesDraft.trim());
      }
      return lines.join("\n");
    },
    getReleaseById: (releaseId) => releases.find((release) => release.id === releaseId),
  }), [releases]);

  return <ReleaseContext.Provider value={value}>{children}</ReleaseContext.Provider>;
}

export function useReleases() {
  const context = useContext(ReleaseContext);
  if (!context) {
    throw new Error("useReleases must be used within a ReleaseProvider");
  }
  return context;
}
