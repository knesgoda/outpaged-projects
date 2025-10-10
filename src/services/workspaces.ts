import { supabase } from "@/integrations/supabase/client";
import type { SpaceSummary, WorkspaceSummary } from "@/types/workspace";

export async function fetchWorkspaces(organizationId?: string | null): Promise<WorkspaceSummary[]> {
  let query = (supabase as any)
    .from("workspaces")
    .select(
      "id, name, slug, description, settings, organization_id, icon, color, position, archived_at, created_at, updated_at"
    )
    .order("name", { ascending: true });

  if (organizationId) {
    query = query.eq("organization_id", organizationId);
  }

  const { data, error } = await query;

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
