import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveProject as archiveProjectRequest,
  createProject as createProjectRequest,
  deleteProject as deleteProjectRequest,
  getProject,
  listProjects,
  updateProject as updateProjectRequest,
  type ArchiveProjectInput,
  type CreateProjectInput,
  type DeleteProjectInput,
  type ProjectListQuery,
  type ProjectListResult,
  type ProjectRecord,
  type ProjectStatus,
  type ProjectSummary,
  type UpdateProjectInput,
} from "@/services/projects";

const PROJECTS_QUERY_KEY = "projects" as const;
const PROJECT_QUERY_KEY = "project" as const;

type ListQueryEntry = [unknown, ProjectListResult | undefined];

type CreateContext = {
  previousListQueries: ListQueryEntry[];
  optimisticId: string;
};

type UpdateContext = {
  previousProject: ProjectRecord | null | undefined;
  previousListQueries: ListQueryEntry[];
};

type DeleteContext = UpdateContext;

const getListQueries = (queryClient: ReturnType<typeof useQueryClient>): ListQueryEntry[] => {
  return queryClient.getQueriesData<ProjectListResult>([PROJECTS_QUERY_KEY]);
};

const getQueryParams = (queryKey: unknown): ProjectListQuery | undefined => {
  if (!Array.isArray(queryKey)) return undefined;
  const maybeParams = queryKey[1];
  if (maybeParams && typeof maybeParams === "object") {
    return maybeParams as ProjectListQuery;
  }
  return undefined;
};

export function useProjects(params: ProjectListQuery) {
  const query = useQuery({
    queryKey: [PROJECTS_QUERY_KEY, params],
    queryFn: () => listProjects(params),
    keepPreviousData: true,
  });

  return {
    data: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useProject(projectId: string | undefined) {
  const query = useQuery({
    queryKey: [PROJECT_QUERY_KEY, projectId],
    enabled: Boolean(projectId),
    queryFn: () => getProject(projectId!),
    retry: 1,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation<ProjectRecord, Error, CreateProjectInput, CreateContext>({
    mutationFn: (input) => createProjectRequest(input),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: [PROJECTS_QUERY_KEY] });
      const previousListQueries = getListQueries(queryClient);

      const optimisticId = `optimistic-${Date.now()}`;
      const now = new Date().toISOString();
      const optimisticProject: ProjectSummary = {
        id: optimisticId,
        name: variables.name,
        description: variables.description,
        status: "active",
        updated_at: now,
      };

      previousListQueries.forEach(([key, snapshot]) => {
        if (!snapshot) return;
        const params = getQueryParams(key);
        if (params && params.page && params.page !== 1) {
          return;
        }
        queryClient.setQueryData<ProjectListResult>(key, {
          data: [optimisticProject, ...snapshot.data].slice(0, snapshot.data.length),
          total: snapshot.total + 1,
        });
      });

      return { previousListQueries, optimisticId };
    },
    onError: (_error, _variables, context) => {
      context?.previousListQueries.forEach(([key, snapshot]) => {
        queryClient.setQueryData(key, snapshot);
      });
    },
    onSuccess: (data, _variables, context) => {
      if (!data) return;
      queryClient.setQueryData([PROJECT_QUERY_KEY, data.id], data);
      getListQueries(queryClient).forEach(([key, snapshot]) => {
        if (!snapshot) return;
        queryClient.setQueryData<ProjectListResult>(key, {
          data: snapshot.data.map((project) =>
            project.id === context?.optimisticId ? data : project
          ),
          total: snapshot.total,
        });
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation<ProjectRecord, Error, UpdateProjectInput, UpdateContext>({
    mutationFn: (input) => updateProjectRequest(input),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: [PROJECTS_QUERY_KEY] });
      await queryClient.cancelQueries({ queryKey: [PROJECT_QUERY_KEY, variables.id] });

      const previousProject = queryClient.getQueryData<ProjectRecord>([
        PROJECT_QUERY_KEY,
        variables.id,
      ]);
      const previousListQueries = getListQueries(queryClient);
      const now = new Date().toISOString();

      queryClient.setQueryData<ProjectRecord | null>(
        [PROJECT_QUERY_KEY, variables.id],
        (old) => (old ? { ...old, ...variables.patch, updated_at: now } : old),
      );

      previousListQueries.forEach(([key, snapshot]) => {
        if (!snapshot) return;
        queryClient.setQueryData<ProjectListResult>(key, {
          data: snapshot.data.map((project) =>
            project.id === variables.id
              ? ({ ...project, ...variables.patch, updated_at: now } as ProjectSummary)
              : project
          ),
          total: snapshot.total,
        });
      });

      return { previousProject, previousListQueries };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      if (context.previousProject) {
        queryClient.setQueryData([PROJECT_QUERY_KEY, context.previousProject.id], context.previousProject);
      }
      context.previousListQueries.forEach(([key, snapshot]) => {
        queryClient.setQueryData(key, snapshot);
      });
    },
    onSuccess: (data, variables) => {
      if (!data) return;
      queryClient.setQueryData([PROJECT_QUERY_KEY, variables.id], data);
      getListQueries(queryClient).forEach(([key, snapshot]) => {
        if (!snapshot) return;
        queryClient.setQueryData<ProjectListResult>(key, {
          data: snapshot.data.map((project) => (project.id === data.id ? data : project)),
          total: snapshot.total,
        });
      });
    },
    onSettled: (_result, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: [PROJECT_QUERY_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
    },
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();

  return useMutation<ProjectRecord, Error, ArchiveProjectInput, UpdateContext>({
    mutationFn: (input) => archiveProjectRequest(input),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: [PROJECTS_QUERY_KEY] });
      await queryClient.cancelQueries({ queryKey: [PROJECT_QUERY_KEY, variables.id] });

      const previousProject = queryClient.getQueryData<ProjectRecord>([
        PROJECT_QUERY_KEY,
        variables.id,
      ]);
      const previousListQueries = getListQueries(queryClient);
      const now = new Date().toISOString();

      queryClient.setQueryData<ProjectRecord | null>(
        [PROJECT_QUERY_KEY, variables.id],
        (old) => (old ? { ...old, status: "archived", updated_at: now } : old),
      );

      previousListQueries.forEach(([key, snapshot]) => {
        if (!snapshot) return;
        queryClient.setQueryData<ProjectListResult>(key, {
          data: snapshot.data.map((project) =>
            project.id === variables.id
              ? ({ ...project, status: "archived", updated_at: now } as ProjectSummary)
              : project
          ),
          total: snapshot.total,
        });
      });

      return { previousProject, previousListQueries };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      if (context.previousProject) {
        queryClient.setQueryData([PROJECT_QUERY_KEY, context.previousProject.id], context.previousProject);
      }
      context.previousListQueries.forEach(([key, snapshot]) => {
        queryClient.setQueryData(key, snapshot);
      });
    },
    onSuccess: (data) => {
      if (!data) return;
      queryClient.setQueryData([PROJECT_QUERY_KEY, data.id], data);
      getListQueries(queryClient).forEach(([key, snapshot]) => {
        if (!snapshot) return;
        queryClient.setQueryData<ProjectListResult>(key, {
          data: snapshot.data.map((project) => (project.id === data.id ? data : project)),
          total: snapshot.total,
        });
      });
    },
    onSettled: (_result, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: [PROJECT_QUERY_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, DeleteProjectInput, DeleteContext>({
    mutationFn: (input) => deleteProjectRequest(input),
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: [PROJECTS_QUERY_KEY] });
      await queryClient.cancelQueries({ queryKey: [PROJECT_QUERY_KEY, variables.id] });

      const previousProject = queryClient.getQueryData<ProjectRecord>([
        PROJECT_QUERY_KEY,
        variables.id,
      ]);
      const previousListQueries = getListQueries(queryClient);

      queryClient.removeQueries({ queryKey: [PROJECT_QUERY_KEY, variables.id], exact: true });

      previousListQueries.forEach(([key, snapshot]) => {
        if (!snapshot) return;
        queryClient.setQueryData<ProjectListResult>(key, {
          data: snapshot.data.filter((project) => project.id !== variables.id),
          total: Math.max(0, snapshot.total - 1),
        });
      });

      return { previousProject, previousListQueries };
    },
    onError: (_error, variables, context) => {
      if (!context) return;
      if (context.previousProject) {
        queryClient.setQueryData([PROJECT_QUERY_KEY, variables.id], context.previousProject);
      }
      context.previousListQueries.forEach(([key, snapshot]) => {
        queryClient.setQueryData(key, snapshot);
      });
    },
    onSettled: (_result, _error, variables) => {
      queryClient.invalidateQueries({ queryKey: [PROJECT_QUERY_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
    },
  });
}

export type { ProjectStatus, ProjectSummary, ProjectListQuery };
