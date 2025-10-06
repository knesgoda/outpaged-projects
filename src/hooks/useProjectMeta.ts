import { useQuery } from "@tanstack/react-query";
import { getProjectMeta } from "@/services/projects";
import type { ProjectMeta } from "@/types";

export const projectKeys = {
  detail: (projectId: string) => ["projects", "meta", projectId] as const,
};

export function useProjectMeta(projectId?: string, enabled = true) {
  return useQuery<ProjectMeta | null>({
    queryKey: projectId ? projectKeys.detail(projectId) : ["projects", "meta", "missing"],
    queryFn: () => getProjectMeta(projectId as string),
    enabled: Boolean(projectId) && enabled,
    staleTime: 1000 * 60 * 5,
  });
}
