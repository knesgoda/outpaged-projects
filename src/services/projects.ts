import { supabase } from "@/integrations/supabase/client";

export type ProjectSummary = {
  id: string;
  name: string | null;
};

export async function listProjects(): Promise<ProjectSummary[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ProjectSummary[];
}

export async function getProject(projectId: string): Promise<ProjectSummary | null> {
  if (!projectId) {
    return null;
  }

  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as ProjectSummary | null) ?? null;
}
