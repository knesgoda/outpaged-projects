import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { mapSupabaseError, requireUserId } from "./utils";

type SavedSearchRow = Database["public"]["Tables"]["saved_searches"]["Row"];
type SavedSearchInsert = Database["public"]["Tables"]["saved_searches"]["Insert"];

export type SavedSearch = {
  id: SavedSearchRow["id"];
  name: SavedSearchRow["name"];
  query: SavedSearchRow["query"];
  filters: Record<string, unknown>;
  created_at: SavedSearchRow["created_at"];
};

export type CreateSavedSearchInput = Pick<
  SavedSearchInsert,
  "name" | "query" | "filters"
> & { filters?: Record<string, unknown> | null };

const SAVED_SEARCH_FIELDS = "id, name, query, filters, created_at";

const normalizeFilters = (filters: SavedSearchRow["filters"]) => {
  if (filters && typeof filters === "object") {
    return filters as Record<string, unknown>;
  }
  return {};
};

export const listSavedSearches = async (): Promise<SavedSearch[]> => {
  const userId = await requireUserId();

  const { data, error } = await supabase
    .from("saved_searches")
    .select(SAVED_SEARCH_FIELDS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw mapSupabaseError(error, "Unable to load saved searches.");
  }

  const rows = (data ?? []) as SavedSearchRow[];

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    query: row.query,
    filters: normalizeFilters(row.filters),
    created_at: row.created_at,
  }));
};

export const createSavedSearch = async (
  input: CreateSavedSearchInput
): Promise<SavedSearch> => {
  const userId = await requireUserId();

  const name = input.name?.trim();
  if (!name) {
    throw new Error("A name is required to save the search.");
  }

  const query = input.query?.trim();
  if (!query) {
    throw new Error("A query is required to save the search.");
  }

  const payload: SavedSearchInsert = {
    name,
    query,
    filters: (input.filters ?? {}) as SavedSearchInsert["filters"],
    user_id: userId,
  };

  const { data, error } = await supabase
    .from("saved_searches")
    .insert(payload)
    .select(SAVED_SEARCH_FIELDS)
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to save the search.");
  }

  if (!data) {
    throw new Error("Unable to save the search.");
  }

  const row = data as SavedSearchRow;

  return {
    id: row.id,
    name: row.name,
    query: row.query,
    filters: normalizeFilters(row.filters),
    created_at: row.created_at,
  };
};

export const deleteSavedSearch = async (id: string): Promise<void> => {
  const trimmedId = id?.trim();
  if (!trimmedId) {
    throw new Error("A saved search id is required.");
  }

  const userId = await requireUserId();

  const { error } = await supabase
    .from("saved_searches")
    .delete()
    .eq("id", trimmedId)
    .eq("user_id", userId);

  if (error) {
    throw mapSupabaseError(error, "Unable to delete the saved search.");
  }
};
