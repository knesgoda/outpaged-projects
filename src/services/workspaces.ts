import { supabase } from "@/integrations/supabase/client";
import type { SpaceSummary, WorkspaceSummary } from "@/types/workspace";

export async function fetchWorkspaces(): Promise<WorkspaceSummary[]> {
  const { data, error } = await (supabase as any)
    .from("workspaces")
    .select("id, name, slug, description, settings, created_at, updated_at")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as WorkspaceSummary[]) ?? [];
}

export async function fetchSpaces(workspaceId: string): Promise<SpaceSummary[]> {
  if (!workspaceId) {
    return [];
  }

  const { data, error } = await (supabase as any)
    .from("spaces")
    .select(
      "id, workspace_id, name, slug, description, space_type, settings, icon, color, position, created_at, updated_at"
    )
    .eq("workspace_id", workspaceId)
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as SpaceSummary[]) ?? [];
}
