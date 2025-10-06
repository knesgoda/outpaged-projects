import { supabase } from "@/integrations/supabase/client";

export type ProjectSummary = {
  id: string;
  name: string;
  code?: string | null;
};

export async function listProjects(): Promise<ProjectSummary[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, code")
    .order("name", { ascending: true });

  if (error) {
    console.error("[projects] Failed to load projects", error);
    return [];
  }

  return (data ?? []).map((project) => ({
    id: project.id,
    name: project.name ?? "Untitled project",
    code: project.code ?? null,
  }));
}

export async function getProject(id: string): Promise<ProjectSummary | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, code")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[projects] Failed to load project", error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    name: data.name ?? "Untitled project",
    code: data.code ?? null,
  };
}
