import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCycle, deleteCycle, listCycles } from "@/services/okrCycles";
import type { OKRCycle } from "@/types";
import { useToast } from "@/components/ui/use-toast";

const cycleKeys = {
  all: ["okr-cycles"] as const,
};

export function useOKRCycles() {
  return useQuery({
    queryKey: cycleKeys.all,
    queryFn: (): Promise<OKRCycle[]> => listCycles(),
    staleTime: 60_000,
  });
}

export function useCreateCycle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: createCycle,
    onSuccess: async (cycle) => {
      toast({ title: "Cycle created", description: cycle.name });
      await queryClient.invalidateQueries({ queryKey: cycleKeys.all });
    },
    onError: (error: any) => {
      toast({ title: "Failed to create cycle", description: error.message ?? String(error), variant: "destructive" });
    },
  });
}

export function useDeleteCycle() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: deleteCycle,
    onSuccess: async () => {
      toast({ title: "Cycle removed" });
      await queryClient.invalidateQueries({ queryKey: cycleKeys.all });
    },
    onError: (error: any) => {
      toast({ title: "Failed to remove cycle", description: error.message ?? String(error), variant: "destructive" });
    },
  });
}
