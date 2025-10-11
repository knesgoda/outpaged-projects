import type { SuggestionHistoryEntry, SuggestionKind } from "@/types";

export const OPQL_HISTORY_STORAGE_KEY = "commandk:opql-history";

export const loadOpqlHistory = (): SuggestionHistoryEntry[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const stored = window.localStorage.getItem(OPQL_HISTORY_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as SuggestionHistoryEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is SuggestionHistoryEntry =>
        Boolean(entry)
        && typeof entry.id === "string"
        && typeof entry.kind === "string"
        && typeof entry.lastUsed === "string"
        && typeof entry.frequency === "number"
    );
  } catch (_error) {
    return [];
  }
};

export const persistOpqlHistory = (history: SuggestionHistoryEntry[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      OPQL_HISTORY_STORAGE_KEY,
      JSON.stringify(history.slice(0, 25))
    );
  } catch (_error) {
    // Ignore persistence failures in restricted environments.
  }
};

export const recordOpqlSelection = (
  history: SuggestionHistoryEntry[],
  kind: SuggestionKind,
  id: string
): SuggestionHistoryEntry[] => {
  const now = new Date().toISOString();
  const index = history.findIndex((entry) => entry.kind === kind && entry.id === id);
  if (index >= 0) {
    const next = [...history];
    const existing = next[index];
    next[index] = {
      ...existing,
      lastUsed: now,
      frequency: existing.frequency + 1,
    };
    return next
      .sort((a, b) => Date.parse(b.lastUsed) - Date.parse(a.lastUsed))
      .slice(0, 25);
  }
  return [{ id, kind, lastUsed: now, frequency: 1 }, ...history].slice(0, 25);
};
