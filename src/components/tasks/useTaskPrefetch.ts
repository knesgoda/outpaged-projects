import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const TASK_SUMMARY_QUERY = (taskId: string) => ["task", taskId, "summary"] as const;

async function fetchTaskSummary(taskId: string) {
  if (!taskId) return null;
  const { data, error } = await supabase
    .from("tasks")
    .select("id, title, description, status, priority, updated_at, project_id")
    .eq("id", taskId)
    .limit(1)
    .single();

  if (error) throw error;

  const { data: comments } = await supabase
    .from("comments")
    .select("id, body, created_at, author_id")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true })
    .limit(3);

  return { task: data, comments: comments ?? [] };
}

export function useTaskPrefetch(taskId?: string | null) {
  const queryClient = useQueryClient();

  const prefetch = useCallback(() => {
    if (!taskId) return;
    queryClient.prefetchQuery({
      queryKey: TASK_SUMMARY_QUERY(taskId),
      queryFn: () => fetchTaskSummary(taskId),
    });
  }, [taskId, queryClient]);

  return {
    onPointerEnter: prefetch,
    onFocus: prefetch,
  };
}

export function useTaskSummary(taskId?: string | null) {
  const queryClient = useQueryClient();
  if (!taskId) {
    return { data: null };
  }
  const cached = queryClient.getQueryData(TASK_SUMMARY_QUERY(taskId));
  return { data: cached as Awaited<ReturnType<typeof fetchTaskSummary>> | null };
}
