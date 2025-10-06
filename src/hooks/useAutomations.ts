import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAutomation,
  deleteAutomation,
  enqueueTestRun,
  getAutomation,
  listAutomationRuns,
  listAutomations,
  updateAutomation,
} from "@/services/automations";
import { Automation, AutomationRun } from "@/types";
import { useToast } from "@/hooks/use-toast";

type AutomationsKey = ["automations", { projectId?: string | null }];

type AutomationRunsKey = ["automation-runs", string];

export function useAutomations(projectId?: string) {
  const { toast } = useToast();

  return useQuery<Automation[], Error>({
    queryKey: ["automations", { projectId: projectId ?? null }] as AutomationsKey,
    queryFn: () => listAutomations(projectId),
    staleTime: 60_000,
    onError: (error) => {
      toast({
        title: "Failed to load automations",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useAutomation(automationId?: string) {
  const { toast } = useToast();

  return useQuery<Automation | null, Error>({
    queryKey: ["automation", automationId ?? "unknown"],
    queryFn: () => {
      if (!automationId) {
        return Promise.resolve(null);
      }
      return getAutomation(automationId);
    },
    enabled: Boolean(automationId),
    staleTime: 30_000,
    onError: (error) => {
      toast({
        title: "Failed to load automation",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useCreateAutomation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createAutomation,
    onSuccess: (automation) => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast({ title: "Automation created" });
      return automation;
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create automation",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateAutomation(automationId?: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (
      patch: Partial<
        Pick<
          Automation,
          "name" | "enabled" | "trigger_type" | "trigger_config" | "action_type" | "action_config"
        >
      >
    ) => {
      if (!automationId) {
        throw new Error("Automation id is required to update.");
      }
      return updateAutomation(automationId, patch);
    },
    onSuccess: (automation) => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      if (automationId) {
        queryClient.invalidateQueries({ queryKey: ["automation", automationId] });
      }
      toast({ title: "Automation updated" });
      return automation;
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update automation",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteAutomation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteAutomation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["automations"] });
      toast({ title: "Automation deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete automation",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useAutomationRuns(automationId?: string) {
  const { toast } = useToast();

  return useQuery<AutomationRun[], Error>({
    queryKey: ["automation-runs", automationId ?? "unknown"] as AutomationRunsKey,
    queryFn: () => {
      if (!automationId) {
        return Promise.resolve([]);
      }
      return listAutomationRuns(automationId);
    },
    enabled: Boolean(automationId),
    staleTime: 10_000,
    onError: (error) => {
      toast({
        title: "Failed to load test runs",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useEnqueueTestRun() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: enqueueTestRun,
    onSuccess: (_data, automationId) => {
      queryClient.invalidateQueries({ queryKey: ["automation-runs", automationId] });
      toast({ title: "Test run queued" });
    },
    onError: (error: Error) => {
      toast({
        title: "Test run failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
