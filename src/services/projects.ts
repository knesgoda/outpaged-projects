import { supabase } from "@/integrations/supabase/client";
import type { ProjectMeta } from "@/types";

const PROJECT_TABLE = "projects";

export async function getProjectMeta(projectId: string): Promise<ProjectMeta | null> {
  if (!projectId) {
    return null;
  }

  const { data, error } = await supabase
    .from(PROJECT_TABLE)
    .select("id, name, code")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch project", error);
    throw error;
  }

  if (!data) {
    return null;
  }

  return data as ProjectMeta;
}
