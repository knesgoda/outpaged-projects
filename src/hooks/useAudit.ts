import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAuditLogs, recordAudit } from "@/services/audit";
import type { AuditLog } from "@/types";
import { useToast } from "@/components/ui/use-toast";

const AUDIT_QUERY_KEY = ["admin", "audit", "logs"] as const;

type AuditFilters = Parameters<typeof listAuditLogs>[0];

type RecordAuditArgs = {
  action: string;
  target?: { type?: string; id?: string };
  metadata?: any;
};

export function useAuditLogs(filters?: AuditFilters) {
  return useQuery({
    queryKey: [...AUDIT_QUERY_KEY, filters ?? {}],
    queryFn: () => listAuditLogs(filters),
    staleTime: 1000 * 60,
  });
}

export function useRecordAudit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ action, target, metadata }: RecordAuditArgs) => recordAudit(action, target, metadata),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUDIT_QUERY_KEY });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to record audit entry.";
      toast({
        title: "Audit logging failed",
        description: message,
        variant: "destructive",
      });
    },
  });
}

export function useAuditExport(filters?: AuditFilters) {
  return useQuery<AuditLog[]>({
    queryKey: [...AUDIT_QUERY_KEY, "export", filters ?? {}],
    queryFn: () => listAuditLogs(filters),
    staleTime: 0,
    enabled: false,
  });
}
