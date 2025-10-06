import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Report } from "@/types";
import {
  createReport,
  deleteReport,
  getReport,
  listReports,
  runReport,
  updateReport,
} from "@/services/reports";

const REPORTS_KEY = ["reports"] as const;
const listKey = (projectId?: string | null) => [
  ...REPORTS_KEY,
  "list",
  projectId ?? "all",
];
const detailKey = (id: string) => [...REPORTS_KEY, "detail", id];

type ListOptions = {
  projectId?: string;
  enabled?: boolean;
};

export function useReportsList(options: ListOptions = {}) {
  const { projectId, enabled = true } = options;
  return useQuery({
    queryKey: listKey(projectId ?? null),
    queryFn: () => listReports(projectId),
    enabled,
    staleTime: 1000 * 60,
    keepPreviousData: true,
  });
}

export function useReport(reportId?: string) {
  return useQuery({
    queryKey: reportId ? detailKey(reportId) : [...REPORTS_KEY, "detail", "unknown"],
    queryFn: () => {
      if (!reportId) {
        throw new Error("Report id is required");
      }
      return getReport(reportId);
    },
    enabled: Boolean(reportId),
  });
}

export function useCreateReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createReport,
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: REPORTS_KEY });
      toast({ title: "Report created", description: "Your report is ready." });
      return report;
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to create report.";
      toast({ title: "Create failed", description: message, variant: "destructive" });
    },
  });
}

export function useUpdateReport(reportId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (patch: Partial<
      Pick<Report, "name" | "description" | "config" | "project_id">
    >) => updateReport(reportId, patch),
    onSuccess: (report) => {
      queryClient.setQueryData(detailKey(reportId), report);
      queryClient.invalidateQueries({ queryKey: REPORTS_KEY });
      toast({ title: "Report saved", description: "Changes stored." });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to save report.";
      toast({ title: "Save failed", description: message, variant: "destructive" });
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteReport,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: detailKey(id) });
      queryClient.invalidateQueries({ queryKey: REPORTS_KEY });
      toast({ title: "Report deleted", description: "The report has been removed." });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to delete report.";
      toast({ title: "Delete failed", description: message, variant: "destructive" });
    },
  });
}

export function useDuplicateReport() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (report: Report) => {
      const suffix = "Copy";
      const name = report.name.includes(suffix)
        ? report.name
        : `${report.name} ${suffix}`;
      return createReport({
        name,
        description: report.description ?? undefined,
        projectId: report.project_id ?? undefined,
        config: report.config,
      });
    },
    onSuccess: (duplicate) => {
      queryClient.invalidateQueries({ queryKey: REPORTS_KEY });
      toast({ title: "Report duplicated", description: "A copy was created." });
      return duplicate;
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to duplicate report.";
      toast({ title: "Duplicate failed", description: message, variant: "destructive" });
    },
  });
}

export function useRunReport() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: runReport,
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to run report.";
      toast({ title: "Run failed", description: message, variant: "destructive" });
    },
  });
}
