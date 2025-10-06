import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createReport,
  deleteReport,
  getReport,
  listReports,
  runReport,
  updateReport,
} from "@/services/reports";
import { Report } from "@/types";
import { useToast } from "@/hooks/use-toast";

type ReportsKey = ["reports", { projectId?: string | null }];

type RunResult = Awaited<ReturnType<typeof runReport>>;

export function useReports(projectId?: string) {
  const { toast } = useToast();

  return useQuery<Report[], Error>({
    queryKey: ["reports", { projectId: projectId ?? null }] as ReportsKey,
    queryFn: () => listReports(projectId),
    staleTime: 60_000,
    onError: (error) => {
      toast({
        title: "Failed to load reports",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useReport(reportId?: string) {
  const { toast } = useToast();

  return useQuery<Report | null, Error>({
    queryKey: ["report", reportId ?? "unknown"],
    queryFn: () => {
      if (!reportId) {
        return Promise.resolve(null);
      }
      return getReport(reportId);
    },
    enabled: Boolean(reportId),
    staleTime: 30_000,
    onError: (error) => {
      toast({
        title: "Failed to load report",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCreateReport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createReport,
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast({ title: "Report created" });
      return report;
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create report",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateReport(reportId: string) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: Partial<Pick<Report, "name" | "description" | "config" | "project_id">>) =>
      updateReport(reportId, patch),
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["report", reportId] });
      toast({ title: "Report updated" });
      return report;
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update report",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteReport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteReport,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      toast({ title: "Report deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete report",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useRunReport() {
  const { toast } = useToast();

  return useMutation<RunResult, Error, any>({
    mutationFn: runReport,
    onError: (error) => {
      toast({
        title: "Report run failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
