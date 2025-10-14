// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import { mapSupabaseError } from "@/services/utils";

export interface TaskWatcherRecord {
  id?: string;
  task_id: string;
  user_id: string;
  added_by?: string | null;
  created_at?: string;
}

interface AddTaskWatchersOptions {
  taskId: string;
  userIds: string[];
  addedBy?: string | null;
}

export async function addTaskWatchers({
  taskId,
  userIds,
  addedBy,
}: AddTaskWatchersOptions): Promise<TaskWatcherRecord[]> {
  if (!taskId || userIds.length === 0) {
    return [];
  }

  const records = Array.from(new Set(userIds)).map((userId) => ({
    task_id: taskId,
    user_id: userId,
    added_by: addedBy ?? null,
  }));

  const { data, error } = await supabase
    .from("task_watchers")
    .upsert(records, {
      onConflict: "task_id,user_id",
      ignoreDuplicates: false,
    })
    .select();

  if (error) {
    throw mapSupabaseError(error, "Unable to update task watchers");
  }

  return data ?? [];
}
