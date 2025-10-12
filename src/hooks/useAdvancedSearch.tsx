import { useCallback, useEffect, useMemo, useState } from "react";

import { toast } from "@/hooks/use-toast";
import type { SearchResult as BaseSearchResult } from "@/types";
import {
  SearchAbuseError,
  deleteSavedSearch,
  listSavedSearches,
  searchAll,
  upsertSavedSearch,
} from "@/services/search";
import type { SavedSearchRecord } from "@/server/search/routes";

export type AdvancedSearchResult = BaseSearchResult & {
  description?: string;
  match_field: string;
  relevance_score: number;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export interface SearchFilters {
  types: ("project" | "task" | "comment" | "team_member")[];
  status?: string[];
  priority?: string[];
  assignee?: string[];
  project?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  tags?: string[];
}

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: SearchFilters;
  created_at: string;
  masked_fields: string[];
}

function mapSearchResult(result: BaseSearchResult): AdvancedSearchResult {
  const timestamp = result.updated_at ?? new Date().toISOString();
  const matchField = result.snippet ? "snippet" : "title";
  return {
    ...result,
    description: result.snippet ?? undefined,
    match_field: matchField,
    relevance_score: typeof result.score === "number" ? Number(result.score) : 0,
    metadata: {
      entityType: result.type,
      projectId: result.project_id,
    },
    created_at: timestamp,
    updated_at: timestamp,
  } satisfies AdvancedSearchResult;
}

function mapSavedSearch(record: SavedSearchRecord): SavedSearch {
  return {
    id: record.id,
    name: record.name,
    query: record.opql,
    filters: (record.filters as any) ?? { types: ["project", "task"] },
    created_at: record.createdAt,
    masked_fields: record.maskedFields,
  } as SavedSearch;
}

function loadRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem("recent_searches");
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((value): value is string => typeof value === "string");
    }
    return [];
  } catch (_error) {
    return [];
  }
}

function storeRecentSearches(values: string[]) {
  try {
    localStorage.setItem("recent_searches", JSON.stringify(values.slice(0, 10)));
  } catch (_error) {
    // ignore persistence issues
  }
}

export function useAdvancedSearch() {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AdvancedSearchResult[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => loadRecentSearches());
  const [partialResult, setPartialResult] = useState(false);

  const refreshSavedSearches = useCallback(() => {
    const records = listSavedSearches();
    setSavedSearches(records.map(mapSavedSearch));
  }, []);

  useEffect(() => {
    refreshSavedSearches();
  }, [refreshSavedSearches]);

  const search = useCallback(
    async (query: string, filters: SearchFilters = { types: ["project", "task", "comment", "team_member"] }) => {
      const trimmed = query.trim();
      if (!trimmed) {
        setSearchResults([]);
        setPartialResult(false);
        return;
      }

      setIsSearching(true);
      try {
        const types = filters.types.length ? filters.types : (["project", "task"] as any);
        const result = await searchAll({ q: trimmed, types: types as any, limit: 40, timeoutMs: 3000, explain: true });
        const enriched = result.items.map(mapSearchResult);
        setSearchResults(enriched);
        setPartialResult(result.partial || Boolean(result.metrics.timeout));
        setRecentSearches((current) => {
          const next = [trimmed, ...current.filter((entry) => entry !== trimmed)];
          storeRecentSearches(next);
          return next.slice(0, 10);
        });
        if (result.partial || result.metrics.timeout) {
          toast({
            title: "Partial results returned",
            description: "The search completed near the timeout. Some results may be missing.",
            variant: "default",
          });
        }
      } catch (error) {
        if (error instanceof SearchAbuseError) {
          toast({
            title: "Search temporarily throttled",
            description: `Too many requests. Try again in ${error.retryAfter} seconds.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Search failed",
            description: "We were unable to fetch results. Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        setIsSearching(false);
      }
    },
    [],
  );

  const saveSearch = useCallback(
    (name: string, query: string, filters: SearchFilters) => {
      const record = upsertSavedSearch({
        name,
        opql: query,
        filters: filters as any,
        maskedFields: [],
      });
      toast({ title: "Saved search created", description: `${record.name} is now available to your workspace.` });
      refreshSavedSearches();
    },
    [refreshSavedSearches],
  );

  const removeSavedSearch = useCallback(
    (id: string) => {
      deleteSavedSearch(id);
      toast({ title: "Saved search deleted" });
      refreshSavedSearches();
    },
    [refreshSavedSearches],
  );

  const clearSearchResults = useCallback(() => {
    setSearchResults([]);
    setPartialResult(false);
  }, []);

  const partialExplain = useMemo(
    () => (partialResult ? "partial-results" : undefined),
    [partialResult],
  );

  return {
    isSearching,
    searchResults,
    savedSearches,
    recentSearches,
    partialExplain,
    search,
    saveSearch,
    deleteSavedSearch: removeSavedSearch,
    clearSearchResults,
  };
}
