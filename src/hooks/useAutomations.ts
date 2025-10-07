import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { Automation } from "@/types";
import {
  createAutomation,
  deleteAutomation,
  enqueueTestRun,
  getAutomation,
  listAutomationRuns,
  listAutomations,
  updateAutomation,
} from "@/services/automations";

const AUTOMATIONS_KEY = ["automations"] as const;
const automationsListKey = (projectId?: string | null) => [
  ...AUTOMATIONS_KEY,
  "list",
  projectId ?? "all",
];
const automationDetailKey = (id: string) => [...AUTOMATIONS_KEY, "detail", id];
const automationRunsKey = (id: string) => [...AUTOMATIONS_KEY, "runs", id];

type ListOptions = {
  projectId?: string;
  enabled?: boolean;
};

export function useAutomationsList(options: ListOptions = {}) {
  const { projectId, enabled = true } = options;
  return useQuery({
    queryKey: automationsListKey(projectId ?? null),
    queryFn: () => listAutomations(projectId),
    enabled,
    staleTime: 1000 * 30,
    placeholderData: (previous) => previous as any,
  });
}

export function useAutomation(automationId?: string) {
  return useQuery({
    queryKey: automationId
      ? automationDetailKey(automationId)
      : [...AUTOMATIONS_KEY, "detail", "unknown"],
    queryFn: () => {
      if (!automationId) {
        throw new Error("Automation id is required");
      }
      return getAutomation(automationId);
    },
    enabled: Boolean(automationId),
  });
}

export function useCreateAutomation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createAutomation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: AUTOMATIONS_KEY });
      toast({ title: "Automation created", description: "Automation saved." });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to create automation.";
      toast({ title: "Create failed", description: message, variant: "destructive" });
    },
  });
}

export function useUpdateAutomation(automationId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (
      patch: Partial<
        Pick<
          Automation,
          "name" | "enabled" | "trigger_type" | "trigger_config" | "action_type" | "action_config" | "project_id"
        >
      >
    ) => updateAutomation(automationId, patch),
    onSuccess: (automation) => {
      queryClient.setQueryData(automationDetailKey(automationId), automation);
      queryClient.invalidateQueries({ queryKey: AUTOMATIONS_KEY });
      toast({ title: "Automation saved", description: "Changes have been stored." });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to save automation.";
      toast({ title: "Save failed", description: message, variant: "destructive" });
    },
  });
}

export function useDeleteAutomation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteAutomation,
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: automationDetailKey(id) });
      queryClient.removeQueries({ queryKey: automationRunsKey(id) });
      queryClient.invalidateQueries({ queryKey: AUTOMATIONS_KEY });
      toast({ title: "Automation deleted", description: "The automation has been removed." });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to delete automation.";
      toast({ title: "Delete failed", description: message, variant: "destructive" });
    },
  });
}

export function useAutomationRuns(automationId?: string) {
  return useQuery({
    queryKey: automationId ? automationRunsKey(automationId) : [...AUTOMATIONS_KEY, "runs", "unknown"],
    queryFn: () => {
      if (!automationId) {
        throw new Error("Automation id is required");
      }
      return listAutomationRuns(automationId);
    },
    enabled: Boolean(automationId),
    staleTime: 1000 * 10,
  });
}

export function useEnqueueAutomationTest() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: enqueueTestRun,
    onSuccess: (_data, automationId) => {
      if (automationId) {
        queryClient.invalidateQueries({ queryKey: automationRunsKey(automationId) });
      }
      toast({ title: "Test run queued", description: "A test run record was created." });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unable to queue test run.";
      toast({ title: "Test failed", description: message, variant: "destructive" });
    },
  });
}
