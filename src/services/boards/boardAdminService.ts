import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { handleSupabaseError } from "@/services/utils";

export type BoardGovernanceSettingsRow = Database["public"]["Tables"]["board_governance_settings"]["Row"];
export type BoardTemplateRow = Database["public"]["Tables"]["board_templates"]["Row"];

export async function ensureBoardGovernanceSettings(workspaceId: string) {
  const existing = await supabase
    .from("board_governance_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (existing.error && existing.error.code !== "PGRST116") {
    handleSupabaseError(existing.error, "Unable to load governance settings.");
  }

  if (existing.data) {
    return existing.data as BoardGovernanceSettingsRow;
  }

  const inserted = await supabase
    .from("board_governance_settings")
    .insert({ workspace_id: workspaceId })
    .select("*")
    .single();

  if (inserted.error) {
    handleSupabaseError(inserted.error, "Unable to initialize governance settings.");
  }

  return inserted.data as BoardGovernanceSettingsRow;
}

export async function updateBoardGovernanceSettings(
  workspaceId: string,
  updates: Partial<BoardGovernanceSettingsRow>
) {
  const { data, error } = await supabase
    .from("board_governance_settings")
    .update(updates)
    .eq("workspace_id", workspaceId)
    .select("*")
    .single();

  if (error) {
    handleSupabaseError(error, "Unable to update governance settings.");
  }

  return data as BoardGovernanceSettingsRow;
}

export async function listBoardTemplates() {
  const { data, error } = await supabase
    .from("board_templates")
    .select("id, name, description, tags, type, visibility")
    .order("name", { ascending: true });

  if (error) {
    handleSupabaseError(error, "Unable to load board templates.");
  }

  return (data ?? []) as Pick<BoardTemplateRow, "id" | "name" | "description" | "tags" | "type" | "visibility">[];
}
