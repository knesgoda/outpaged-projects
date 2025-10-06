import { useQuery } from "@tanstack/react-query";
import { getProject, listProjects, type ProjectSummary } from "@/services/projects";

export function useProjectList(options?: { enabled?: boolean }) {
  return useQuery<ProjectSummary[]>({
    queryKey: ["project-list"],
    queryFn: () => listProjects(),
    staleTime: 5 * 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useProjectSummary(projectId?: string) {
  return useQuery<ProjectSummary | null>({
    queryKey: ["project-summary", projectId ?? "none"],
    queryFn: () => (projectId ? getProject(projectId) : Promise.resolve(null)),
    enabled: Boolean(projectId),
    staleTime: 2 * 60_000,
  });
}
