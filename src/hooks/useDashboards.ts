import { useMemo } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Dashboard, DashboardWidget } from "@/types";
import {
  createDashboard,
  createWidget,
  deleteDashboard,
  deleteWidget,
  getDashboard,
  listDashboards,
  listWidgets,
  updateDashboard,
  updateWidget,
} from "@/services/dashboards";

const dashboardsKey = (projectId?: string) => ["dashboards", { projectId: projectId ?? null }];
const dashboardKey = (dashboardId?: string) => ["dashboard", dashboardId ?? ""];
const widgetsKey = (dashboardId: string) => ["dashboard-widgets", dashboardId];

export function useDashboards(projectId?: string) {
  return useQuery<Dashboard[]>({
    queryKey: dashboardsKey(projectId),
    queryFn: () => listDashboards(projectId),
    staleTime: 1000 * 60,
  });
}

export function useDashboard(dashboardId?: string) {
  return useQuery<Dashboard | null>({
    queryKey: dashboardKey(dashboardId),
    queryFn: () => (dashboardId ? getDashboard(dashboardId) : Promise.resolve(null)),
    enabled: Boolean(dashboardId),
    staleTime: 1000 * 30,
  });
}

export function useDashboardMutations() {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createDashboard,
    onSuccess: (dashboard) => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      queryClient.setQueryData(dashboardKey(dashboard.id), dashboard);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<Dashboard, "name" | "layout" | "project_id">> }) =>
      updateDashboard(id, patch),
    onSuccess: (dashboard) => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
      queryClient.setQueryData(dashboardKey(dashboard.id), dashboard);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDashboard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboards"] });
    },
  });

  return {
    createDashboard: createMutation.mutateAsync,
    updateDashboard: updateMutation.mutateAsync,
    deleteDashboard: deleteMutation.mutateAsync,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,
  };
}

export function useDashboardWidgets(dashboardId?: string) {
  return useQuery<DashboardWidget[]>({
    queryKey: widgetsKey(dashboardId ?? ""),
    queryFn: () => (dashboardId ? listWidgets(dashboardId) : Promise.resolve([])),
    enabled: Boolean(dashboardId),
    staleTime: 1000 * 30,
  });
}

export function useDashboardWidgetMutations(dashboardId: string) {
  const queryClient = useQueryClient();
  const key = useMemo(() => widgetsKey(dashboardId), [dashboardId]);

  const createMutation = useMutation({
    mutationFn: (input: Parameters<typeof createWidget>[1]) => createWidget(dashboardId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Pick<DashboardWidget, "title" | "config" | "position">> }) =>
      updateWidget(id, patch),
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DashboardWidget[]>(key);
      if (previous && (patch.position || patch.title || patch.config)) {
        queryClient.setQueryData<DashboardWidget[]>(key, (old = []) =>
          old.map((widget) =>
            widget.id === id
              ? {
                  ...widget,
                  ...patch,
                  updated_at: new Date().toISOString(),
                }
              : widget
          )
        );
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWidget,
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DashboardWidget[]>(key);
      queryClient.setQueryData<DashboardWidget[]>(key, (old = []) => old.filter((widget) => widget.id !== id));
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(key, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  return {
    createWidget: createMutation.mutateAsync,
    updateWidget: updateMutation.mutateAsync,
    deleteWidget: deleteMutation.mutateAsync,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,
  };
}
