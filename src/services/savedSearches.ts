import { supabase, supabaseConfigured } from "@/integrations/supabase/client";

export type SavedSearch = {
  id: string;
  name: string;
  query: string;
  filters: Record<string, unknown>;
  created_at: string;
};

type CreateSavedSearchInput = {
  name: string;
  query: string;
  filters?: Record<string, unknown>;
};

export const listSavedSearches = async (): Promise<SavedSearch[]> => {
  if (!supabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from("saved_searches")
    .select("id, name, query, filters, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const createSavedSearch = async (
  input: CreateSavedSearchInput
): Promise<SavedSearch> => {
  if (!supabaseConfigured) {
    throw new Error("Supabase is not configured");
  }

  const { data, error } = await supabase
    .from("saved_searches")
    .insert({
      name: input.name,
      query: input.query,
      filters: input.filters ?? {},
    })
    .select("id, name, query, filters, created_at")
    .single();

  if (error) {
    throw error;
  }

  return data;
};

export const deleteSavedSearch = async (id: string): Promise<void> => {
  if (!supabaseConfigured) {
    throw new Error("Supabase is not configured");
  }

  const { error } = await supabase.from("saved_searches").delete().eq("id", id);

  if (error) {
    throw error;
  }
};
