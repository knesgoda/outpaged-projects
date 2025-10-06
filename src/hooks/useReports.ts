import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Report } from "@/types";
import {
  createReport,
  deleteReport,
  getReport,
  listReports,
  runReport,
  updateReport,
} from "@/services/reports";

type ReportsQueryOptions = {
  projectId?: string;
  enabled?: boolean;
};

type RunReportVariables = {
  config: any;
};

const reportsKeys = {
  all: ["reports"] as const,
  list: (projectId?: string) =>
    ["reports", "list", projectId ?? "all"] as const,
  detail: (id: string) => ["reports", "detail", id] as const,
  run: (id?: string) => ["reports", "run", id ?? "config"] as const,
};

export function useReports({ projectId, enabled = true }: ReportsQueryOptions = {}) {
  return useQuery({
    queryKey: reportsKeys.list(projectId),
    queryFn: () => listReports(projectId),
    staleTime: 1000 * 30,
    enabled,
  });
}

export function useReport(id?: string) {
  return useQuery({
    queryKey: id ? reportsKeys.detail(id) : ["reports", "detail", "missing"] as const,
    queryFn: () => getReport(id as string),
    staleTime: 1000 * 60,
    enabled: Boolean(id),
  });
}

export function useCreateReport(projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createReport,
    onSuccess: async (data) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: reportsKeys.all }),
        projectId
          ? queryClient.invalidateQueries({ queryKey: reportsKeys.list(projectId) })
          : Promise.resolve(),
      ]);
      queryClient.setQueryData(reportsKeys.detail(data.id), data);
    },
  });
}

export function useUpdateReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updateReport>[1] }) =>
      updateReport(id, patch),
    onSuccess: async (data) => {
      queryClient.setQueryData(reportsKeys.detail(data.id), data);
      await queryClient.invalidateQueries({ queryKey: reportsKeys.all });
    },
  });
}

export function useDeleteReport(projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteReport(id),
    onSuccess: async (_data, id) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: reportsKeys.all }),
        projectId
          ? queryClient.invalidateQueries({ queryKey: reportsKeys.list(projectId) })
          : Promise.resolve(),
      ]);
      queryClient.removeQueries({ queryKey: reportsKeys.detail(id) });
    },
  });
}

export function useRunReport(id?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: reportsKeys.run(id),
    mutationFn: ({ config }: RunReportVariables) => runReport(config),
    onSuccess: (_data, variables) => {
      if (!id) {
        return;
      }
      const cached = queryClient.getQueryData<Report | null>(reportsKeys.detail(id));
      if (cached) {
        const updated = {
          ...cached,
          config: variables.config,
          updated_at: new Date().toISOString(),
        };
        queryClient.setQueryData(reportsKeys.detail(id), updated);
      }
    },
  });
}

export function useReportSearch(
  reports: Report[] | undefined,
  searchTerm: string
) {
  return useMemo(() => {
    if (!reports) {
      return [];
    }
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return reports;
    }
    return reports.filter((report) => {
      return (
        report.name.toLowerCase().includes(term) ||
        (report.description ?? "").toLowerCase().includes(term)
      );
    });
  }, [reports, searchTerm]);
}
