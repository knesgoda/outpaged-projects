import { queueAutomationForTaskMovement } from "@/pages/kanban/automationEvents";
import { enqueueAutomationEvent } from "@/services/automations";

jest.mock("@/services/automations", () => ({
  ...jest.requireActual("@/services/automations"),
  enqueueAutomationEvent: jest.fn().mockResolvedValue(undefined),
}));

describe("KanbanBoard automation hooks", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("queues automation events when a task is moved", async () => {
    await queueAutomationForTaskMovement({
      projectId: "project-1",
      taskId: "task-123",
      userId: "user-9",
      context: {
        fromColumnId: "column-a",
        toColumnId: "column-b",
        fromStatus: "todo",
        toStatus: "in_progress",
      },
    });

    expect(enqueueAutomationEvent).toHaveBeenCalledTimes(2);
    expect(enqueueAutomationEvent).toHaveBeenNthCalledWith(1, {
      projectId: "project-1",
      type: "task.moved",
      taskId: "task-123",
      actorId: "user-9",
      context: {
        fromColumnId: "column-a",
        toColumnId: "column-b",
        fromStatus: "todo",
        toStatus: "in_progress",
      },
    });
    expect(enqueueAutomationEvent).toHaveBeenNthCalledWith(2, {
      projectId: "project-1",
      type: "task.status_changed",
      taskId: "task-123",
      actorId: "user-9",
      context: {
        fromColumnId: "column-a",
        toColumnId: "column-b",
        fromStatus: "todo",
        toStatus: "in_progress",
      },
    });
  });
});
