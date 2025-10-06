import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import type { Report } from "@/types";
import { createReport, deleteReport, getReport, listReports, updateReport } from "@/services/reports";

const REPORTS_KEY = ["reports"] as const;
const reportKey = (id: string) => [...REPORTS_KEY, id] as const;

export function useReportsList() {
  return useQuery({
    queryKey: REPORTS_KEY,
    queryFn: listReports,
    staleTime: 1000 * 60,
  });
}

export function useReport(reportId?: string) {
  const key = reportId ? reportKey(reportId) : ([...REPORTS_KEY, "detail"] as const);
  return useQuery({
    queryKey: key,
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
      queryClient.setQueryData(REPORTS_KEY, (old: Report[] | undefined) =>
        old ? [report, ...old] : [report]
      );
      queryClient.setQueryData(reportKey(report.id), report);
      toast({ title: "Report created", description: "Your report is ready." });
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
    mutationFn: (patch: Partial<Pick<Report, "name" | "description" | "config">>) =>
      updateReport(reportId, patch),
    onSuccess: (report) => {
      queryClient.setQueryData(reportKey(reportId), report);
      queryClient.setQueryData(REPORTS_KEY, (old: Report[] | undefined) =>
        old ? old.map((item) => (item.id === report.id ? report : item)) : [report]
      );
      toast({ title: "Report saved", description: "Changes have been stored." });
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
      queryClient.removeQueries({ queryKey: reportKey(id) });
      queryClient.setQueryData(REPORTS_KEY, (old: Report[] | undefined) =>
        old ? old.filter((item) => item.id !== id) : []
      );
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
        config: report.config,
      });
    },
    onSuccess: (duplicate) => {
      queryClient.setQueryData(REPORTS_KEY, (old: Report[] | undefined) =>
        old ? [duplicate, ...old] : [duplicate]
      );
      queryClient.setQueryData(reportKey(duplicate.id), duplicate);
      toast({ title: "Report duplicated", description: "A copy was created." });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to duplicate report.";
      toast({ title: "Duplicate failed", description: message, variant: "destructive" });
    },
  });
}
