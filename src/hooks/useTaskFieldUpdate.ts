import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface UpdateTaskFieldParams {
  taskId: string;
  field: string;
  value: any;
}

export function useTaskFieldUpdate() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ taskId, field, value }: UpdateTaskFieldParams) => {
      const { data, error } = await supabase
        .from("tasks")
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq("id", taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch task queries
      queryClient.invalidateQueries({ queryKey: ["task", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      
      toast.success("Saved", {
        duration: 2000,
      });
    },
    onError: (error: any) => {
      console.error("Failed to update task:", error);
      toast.error("Failed to save changes");
    },
  });

  return mutation;
}
