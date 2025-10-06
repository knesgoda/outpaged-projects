import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { mapSupabaseError } from "@/services/utils";

export type ProjectOption = { id: string; name: string | null };

const PROJECT_OPTIONS_KEY = ["projects", "options"] as const;

async function fetchProjectOptions(): Promise<ProjectOption[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    throw mapSupabaseError(error, "Unable to load projects.");
  }

  return (data ?? []) as ProjectOption[];
}

async function fetchProjectSummary(projectId: string): Promise<ProjectOption | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw mapSupabaseError(error, "Unable to load project.");
  }

  return (data as ProjectOption | null) ?? null;
}

export function useProjectOptions(enabled = true) {
  return useQuery({
    queryKey: PROJECT_OPTIONS_KEY,
    queryFn: fetchProjectOptions,
    enabled,
    staleTime: 1000 * 60 * 10,
  });
}

export function useProjectSummary(projectId?: string) {
  return useQuery({
    queryKey: ["project", "summary", projectId ?? "unknown"],
    queryFn: () => {
      if (!projectId) {
        throw new Error("Project id is required");
      }
      return fetchProjectSummary(projectId);
    },
    enabled: Boolean(projectId),
    staleTime: 1000 * 60 * 5,
  });
}
