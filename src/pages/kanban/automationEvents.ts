import { enqueueAutomationEvent } from "@/services/automations";

export interface TaskMovementContext {
  fromColumnId: string | null;
  toColumnId: string;
  fromStatus: string;
  toStatus: string;
}

export async function queueAutomationForTaskMovement(options: {
  projectId: string;
  taskId: string;
  userId?: string | null;
  context: TaskMovementContext;
}) {
  const { projectId, taskId, userId, context } = options;

  await enqueueAutomationEvent({
    projectId,
    type: "task.moved",
    taskId,
    actorId: userId ?? undefined,
    context,
  });

  await enqueueAutomationEvent({
    projectId,
    type: "task.status_changed",
    taskId,
    actorId: userId ?? undefined,
    context,
  });
}
