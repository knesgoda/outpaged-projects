import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createGoal,
  createGoalUpdate,
  createKeyResult,
  deleteGoal,
  deleteKeyResult,
  getGoal,
  listGoalUpdates,
  listGoals,
  listKeyResults,
  recalculateGoalProgress,
  updateGoal,
  updateKeyResult,
} from "@/services/goals";
import type { Goal, GoalUpdate, KeyResult } from "@/types";
import { useToast } from "@/components/ui/use-toast";

const goalKeys = {
  all: ["goals"] as const,
  lists: (params?: Record<string, unknown>) => ["goals", "list", params] as const,
  detail: (id: string) => ["goals", "detail", id] as const,
  keyResults: (goalId: string) => ["goals", "key-results", goalId] as const,
  updates: (goalId: string) => ["goals", "updates", goalId] as const,
};

export function useGoals(params?: {
  projectId?: string;
  cycleId?: string;
  q?: string;
  status?: string;
  includeArchived?: boolean;
}) {
  return useQuery({
    queryKey: goalKeys.lists(params),
    queryFn: () => listGoals(params),
    staleTime: 30_000,
    keepPreviousData: true,
  });
}

export function useGoal(goalId?: string) {
  return useQuery({
    queryKey: goalKeys.detail(goalId ?? ""),
    queryFn: () => (goalId ? getGoal(goalId) : Promise.resolve(null)),
    enabled: Boolean(goalId),
    staleTime: 30_000,
  });
}

export function useGoalKeyResults(goalId?: string) {
  return useQuery({
    queryKey: goalKeys.keyResults(goalId ?? ""),
    queryFn: () => (goalId ? listKeyResults(goalId) : Promise.resolve([] as KeyResult[])),
    enabled: Boolean(goalId),
    staleTime: 15_000,
  });
}

export function useGoalUpdates(goalId?: string) {
  return useQuery({
    queryKey: goalKeys.updates(goalId ?? ""),
    queryFn: () => (goalId ? listGoalUpdates(goalId) : Promise.resolve([] as GoalUpdate[])),
    enabled: Boolean(goalId),
    staleTime: 10_000,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createGoal,
    onSuccess: async (goal) => {
      toast({ title: "Goal created", description: goal.title });
      await queryClient.invalidateQueries({ queryKey: goalKeys.all });
      if (goal.id) {
        await queryClient.invalidateQueries({ queryKey: goalKeys.detail(goal.id) });
      }
    },
    onError: (error: any) => {
      toast({ title: "Failed to create goal", description: error.message ?? String(error), variant: "destructive" });
    },
  });
}

export function useUpdateGoal(goalId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (patch: Parameters<typeof updateGoal>[1]) => updateGoal(goalId, patch),
    onSuccess: async (goal) => {
      toast({ title: "Goal updated", description: goal.title });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: goalKeys.detail(goalId) }),
        queryClient.invalidateQueries({ queryKey: goalKeys.all }),
      ]);
    },
    onError: (error: any) => {
      toast({ title: "Failed to update goal", description: error.message ?? String(error), variant: "destructive" });
    },
  });
}

export function useDeleteGoal(goalId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => deleteGoal(goalId),
    onSuccess: async () => {
      toast({ title: "Goal deleted" });
      await queryClient.invalidateQueries({ queryKey: goalKeys.all });
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete goal", description: error.message ?? String(error), variant: "destructive" });
    },
  });
}

export function useCreateKeyResult(goalId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: Parameters<typeof createKeyResult>[1]) => createKeyResult(goalId, input),
    onSuccess: async () => {
      toast({ title: "Key result added" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: goalKeys.keyResults(goalId) }),
        queryClient.invalidateQueries({ queryKey: goalKeys.detail(goalId) }),
      ]);
      await recalculateGoalProgress(goalId);
      await queryClient.invalidateQueries({ queryKey: goalKeys.detail(goalId) });
    },
    onError: (error: any) => {
      toast({ title: "Failed to add key result", description: error.message ?? String(error), variant: "destructive" });
    },
  });
}

export function useUpdateKeyResult(goalId: string, keyResultId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (patch: Parameters<typeof updateKeyResult>[1]) => updateKeyResult(keyResultId, patch),
    onSuccess: async () => {
      toast({ title: "Key result updated" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: goalKeys.keyResults(goalId) }),
        queryClient.invalidateQueries({ queryKey: goalKeys.detail(goalId) }),
      ]);
      await recalculateGoalProgress(goalId);
      await queryClient.invalidateQueries({ queryKey: goalKeys.detail(goalId) });
    },
    onError: (error: any) => {
      toast({ title: "Failed to update key result", description: error.message ?? String(error), variant: "destructive" });
    },
  });
}

export function useDeleteKeyResult(goalId: string, keyResultId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => deleteKeyResult(keyResultId),
    onSuccess: async () => {
      toast({ title: "Key result removed" });
      await queryClient.invalidateQueries({ queryKey: goalKeys.keyResults(goalId) });
      await recalculateGoalProgress(goalId);
      await queryClient.invalidateQueries({ queryKey: goalKeys.detail(goalId) });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove key result", description: error.message ?? String(error), variant: "destructive" });
    },
  });
}

export function useCreateGoalUpdate(goalId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (input: Parameters<typeof createGoalUpdate>[1]) => createGoalUpdate(goalId, input),
    onSuccess: async () => {
      toast({ title: "Update logged" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: goalKeys.updates(goalId) }),
        queryClient.invalidateQueries({ queryKey: goalKeys.detail(goalId) }),
      ]);
    },
    onError: (error: any) => {
      toast({ title: "Failed to log update", description: error.message ?? String(error), variant: "destructive" });
    },
  });
}
