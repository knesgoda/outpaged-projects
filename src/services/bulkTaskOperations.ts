import { supabase } from "@/integrations/supabase/client";
import { mapSupabaseError } from "./utils";
import type { TaskDependencyType } from "@/types/tasks";

type BulkAction =
  | "update_status"
  | "update_priority"
  | "assign_assignee"
  | "move_to_group"
  | "add_to_sprint"
  | "assign_label"
  | "update_watchers"
  | "link_dependency"
  | "delete_tasks";

interface InvokeOptions<TPayload extends Record<string, unknown>> {
  action: BulkAction;
  taskIds: string[];
  payload: TPayload;
  fallbackMessage: string;
}

const FUNCTION_NAME = "perform_bulk_task_operation";
const EDGE_FUNCTION_NAME = "bulk-task-operations";

async function invokeBulkOperation<TPayload extends Record<string, unknown>>({
  action,
  taskIds,
  payload,
  fallbackMessage,
}: InvokeOptions<TPayload>) {
  if (taskIds.length === 0) {
    return;
  }

  const rpcPayload = {
    action,
    task_ids: taskIds,
    payload,
  } as const;

  const rpcResult = await supabase.rpc(FUNCTION_NAME, rpcPayload);

  if (!rpcResult.error) {
    return rpcResult.data;
  }

  const errorMessage = rpcResult.error.message?.toLowerCase() ?? "";
  const functionMissing = errorMessage.includes("function") && errorMessage.includes("does not exist");

  if (!functionMissing) {
    throw mapSupabaseError(rpcResult.error, fallbackMessage);
  }

  const edgeResult = await supabase.functions.invoke(EDGE_FUNCTION_NAME, {
    body: {
      action,
      taskIds,
      payload,
    },
  });

  if (edgeResult.error) {
    throw mapSupabaseError(edgeResult.error, fallbackMessage);
  }

  return edgeResult.data;
}

export async function bulkUpdateStatus(taskIds: string[], status: string) {
  return invokeBulkOperation({
    action: "update_status",
    taskIds,
    payload: { status },
    fallbackMessage: "Unable to update task status",
  });
}

export async function bulkUpdatePriority(taskIds: string[], priority: string) {
  return invokeBulkOperation({
    action: "update_priority",
    taskIds,
    payload: { priority },
    fallbackMessage: "Unable to update task priority",
  });
}

export async function bulkAssignAssignee(taskIds: string[], assigneeId: string) {
  return invokeBulkOperation({
    action: "assign_assignee",
    taskIds,
    payload: { assigneeId },
    fallbackMessage: "Unable to assign tasks",
  });
}

export async function bulkMoveTasksToGroup(taskIds: string[], swimlaneId: string) {
  return invokeBulkOperation({
    action: "move_to_group",
    taskIds,
    payload: { swimlaneId },
    fallbackMessage: "Unable to move tasks to the selected group",
  });
}

export async function bulkAddTasksToSprint(taskIds: string[], sprintId: string) {
  return invokeBulkOperation({
    action: "add_to_sprint",
    taskIds,
    payload: { sprintId },
    fallbackMessage: "Unable to add tasks to the sprint",
  });
}

export async function bulkAssignLabels(taskIds: string[], labelId: string) {
  return invokeBulkOperation({
    action: "assign_label",
    taskIds,
    payload: { labelId },
    fallbackMessage: "Unable to assign the selected label",
  });
}

export async function bulkUpdateWatchers(taskIds: string[], watcherIds: string[]) {
  return invokeBulkOperation({
    action: "update_watchers",
    taskIds,
    payload: { watcherIds },
    fallbackMessage: "Unable to update watchers",
  });
}

export async function bulkLinkDependency(
  taskIds: string[],
  relatedTaskId: string,
  dependencyType: TaskDependencyType,
) {
  return invokeBulkOperation({
    action: "link_dependency",
    taskIds,
    payload: { relatedTaskId, dependencyType },
    fallbackMessage: "Unable to link dependency",
  });
}

export async function bulkDeleteTasks(taskIds: string[]) {
  return invokeBulkOperation({
    action: "delete_tasks",
    taskIds,
    payload: {},
    fallbackMessage: "Unable to delete tasks",
  });
}
