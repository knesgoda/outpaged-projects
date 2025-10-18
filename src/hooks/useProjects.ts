import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveProject,
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
  type CreateProjectInput,
  type ProjectListParams,
  type ProjectListResponse,
  type ProjectRecord,
  type ProjectSort,
  type ProjectStatus,
  type ProjectSummary,
  type SortDirection,
  type UpdateProjectInput,
} from "@/services/projects";
import { useDomainClient } from "@/domain/client";
import { useTelemetry } from "@/components/telemetry/TelemetryProvider";

export type { ProjectStatus, ProjectSort, SortDirection, ProjectSummary } from "@/services/projects";

export interface ProjectsQueryInput extends Omit<ProjectListParams, "status"> {
  status?: ProjectStatus | "all";
}

const projectsKey = ["projects"] as const;
const projectKey = (id: string) => ["project", id] as const;

const applyProjectToListCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  project: ProjectRecord,
) => {
  queryClient.setQueriesData<ProjectListResponse>({ queryKey: projectsKey }, previous => {
    if (!previous) {
      return previous;
    }

    const nextData = previous.data.map(item =>
      item.id === project.id
        ? {
            ...item,
            name: project.name,
            description: project.description,
            status: project.status,
            updated_at: project.updated_at,
            created_at: project.created_at,
          }
        : item,
    );

    return {
      ...previous,
      data: nextData,
    };
  });
};

const removeProjectFromListCache = (
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
) => {
  queryClient.setQueriesData<ProjectListResponse>({ queryKey: projectsKey }, previous => {
    if (!previous) {
      return previous;
    }

    const nextData = previous.data.filter(item => item.id !== projectId);
    if (nextData.length === previous.data.length) {
      return previous;
    }

    return {
      ...previous,
      data: nextData,
      total: Math.max(previous.total - 1, 0),
    };
  });
};

const toServiceParams = (params: ProjectsQueryInput): ProjectListParams => ({
  q: params.q?.trim() || undefined,
  status: params.status && params.status !== "all" ? params.status : undefined,
  page: params.page,
  pageSize: params.pageSize,
  sort: params.sort,
  dir: params.dir,
  portfolioId: params.portfolioId?.trim() || undefined,
});

export function useProjects(params: ProjectsQueryInput) {
  const serviceParams = toServiceParams(params);
  const domainClient = useDomainClient();
  const workspaceKey = domainClient.tenant.workspaceId ?? "no-workspace";
  const telemetry = useTelemetry();

  return useQuery({
    queryKey: [projectsKey[0], workspaceKey, serviceParams],
    queryFn: () => telemetry.measure("projects.list", () => listProjects(serviceParams, { client: domainClient })),
    placeholderData: previous => previous as any,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });
}

export function useProject(projectId?: string) {
  const domainClient = useDomainClient();
  return useQuery({
    queryKey: projectKey(projectId ?? "unknown"),
    queryFn: async () => {
      if (!projectId) {
        throw new Error("Missing projectId");
      }
      return getProject(projectId, { client: domainClient });
    },
    enabled: Boolean(projectId),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const domainClient = useDomainClient();
  const telemetry = useTelemetry();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => telemetry.measure(
      "projects.create",
      () => createProject(input, { client: domainClient }),
    ),
    onSuccess: project => {
      queryClient.invalidateQueries({ queryKey: projectsKey });
      queryClient.setQueryData(projectKey(project.id), project);
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const domainClient = useDomainClient();
  const telemetry = useTelemetry();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateProjectInput }) => telemetry.measure(
      "projects.update",
      () => updateProject(id, patch, { client: domainClient }),
    ),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: projectKey(id), exact: true });
      await queryClient.cancelQueries({ queryKey: projectsKey });

      const previousProject = queryClient.getQueryData<ProjectRecord>(projectKey(id));
      if (previousProject) {
        const optimistic: ProjectRecord = {
          ...previousProject,
          ...patch,
          updated_at: new Date().toISOString(),
        };
        queryClient.setQueryData(projectKey(id), optimistic);
        applyProjectToListCache(queryClient, optimistic);
      }

      return { previousProject };
    },
    onError: (_error, variables, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData(projectKey(variables.id), context.previousProject);
        applyProjectToListCache(queryClient, context.previousProject);
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKey(variables.id), exact: true });
      queryClient.invalidateQueries({ queryKey: projectsKey });
    },
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();
  const domainClient = useDomainClient();
  const telemetry = useTelemetry();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => telemetry.measure(
      "projects.archive",
      () => archiveProject(id, { client: domainClient }),
    ),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: projectKey(id), exact: true });
      await queryClient.cancelQueries({ queryKey: projectsKey });

      const previousProject = queryClient.getQueryData<ProjectRecord>(projectKey(id));
      if (previousProject) {
        const optimistic: ProjectRecord = {
          ...previousProject,
          status: "archived",
          updated_at: new Date().toISOString(),
        };
        queryClient.setQueryData(projectKey(id), optimistic);
        applyProjectToListCache(queryClient, optimistic);
      }

      return { previousProject };
    },
    onError: (_error, variables, context) => {
      if (context?.previousProject) {
        queryClient.setQueryData(projectKey(variables.id), context.previousProject);
        applyProjectToListCache(queryClient, context.previousProject);
      }
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: projectKey(variables.id), exact: true });
      queryClient.invalidateQueries({ queryKey: projectsKey });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const domainClient = useDomainClient();
  const telemetry = useTelemetry();
  return useMutation({
    mutationFn: ({ id }: { id: string }) => telemetry.measure(
      "projects.delete",
      () => deleteProject(id, { client: domainClient }),
    ),
    onMutate: async ({ id }) => {
      await queryClient.cancelQueries({ queryKey: projectsKey });
      await queryClient.cancelQueries({ queryKey: projectKey(id), exact: true });

      const previousProject = queryClient.getQueryData<ProjectRecord>(projectKey(id));
      const previousLists = queryClient.getQueriesData<ProjectListResponse>({ queryKey: projectsKey });

      removeProjectFromListCache(queryClient, id);
      queryClient.removeQueries({ queryKey: projectKey(id), exact: true });

      return { previousProject, previousLists };
    },
    onError: (_error, variables, context) => {
      if (!context) return;
      if (context.previousProject) {
        queryClient.setQueryData(projectKey(variables.id), context.previousProject);
      }
      context.previousLists?.forEach(([key, data]) => {
        queryClient.setQueryData(key, data);
      });
    },
    onSettled: (_data, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: projectsKey });
      queryClient.invalidateQueries({ queryKey: projectKey(variables.id), exact: true });
    },
  });
}
