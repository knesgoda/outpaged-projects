import {
  bulkUpdateStatus,
  bulkUpdatePriority,
  bulkAssignAssignee,
  bulkMoveTasksToGroup,
  bulkAddTasksToSprint,
  bulkAssignLabels,
  bulkUpdateWatchers,
  bulkLinkDependency,
  bulkDeleteTasks,
} from "../bulkTaskOperations";

jest.mock("@/integrations/supabase/client", () => {
  const rpc = jest.fn();
  const invoke = jest.fn();
  return {
    supabase: {
      rpc,
      functions: {
        invoke,
      },
    },
  };
});

const mockedSupabase = jest.requireMock("@/integrations/supabase/client").supabase as {
  rpc: jest.Mock;
  functions: { invoke: jest.Mock };
};

describe("bulkTaskOperations", () => {
  beforeEach(() => {
    mockedSupabase.rpc.mockResolvedValue({ data: null, error: null });
    mockedSupabase.functions.invoke.mockResolvedValue({ data: null, error: null });
    jest.clearAllMocks();
  });

  it("calls RPC to update status", async () => {
    await bulkUpdateStatus(["t1", "t2"], "done");

    expect(mockedSupabase.rpc).toHaveBeenCalledWith("perform_bulk_task_operation", {
      action: "update_status",
      task_ids: ["t1", "t2"],
      payload: { status: "done" },
    });
  });

  it("calls RPC to update priority", async () => {
    await bulkUpdatePriority(["task"], "high");

    expect(mockedSupabase.rpc).toHaveBeenCalledWith("perform_bulk_task_operation", {
      action: "update_priority",
      task_ids: ["task"],
      payload: { priority: "high" },
    });
  });

  it("calls RPC to assign an assignee", async () => {
    await bulkAssignAssignee(["task"], "user-1");

    expect(mockedSupabase.rpc).toHaveBeenCalledWith("perform_bulk_task_operation", {
      action: "assign_assignee",
      task_ids: ["task"],
      payload: { assigneeId: "user-1" },
    });
  });

  it("calls RPC to move tasks to a group", async () => {
    await bulkMoveTasksToGroup(["task"], "group-1");

    expect(mockedSupabase.rpc).toHaveBeenCalledWith("perform_bulk_task_operation", {
      action: "move_to_group",
      task_ids: ["task"],
      payload: { swimlaneId: "group-1" },
    });
  });

  it("calls RPC to add tasks to a sprint", async () => {
    await bulkAddTasksToSprint(["task"], "sprint-1");

    expect(mockedSupabase.rpc).toHaveBeenCalledWith("perform_bulk_task_operation", {
      action: "add_to_sprint",
      task_ids: ["task"],
      payload: { sprintId: "sprint-1" },
    });
  });

  it("calls RPC to assign labels", async () => {
    await bulkAssignLabels(["task"], "label-1");

    expect(mockedSupabase.rpc).toHaveBeenCalledWith("perform_bulk_task_operation", {
      action: "assign_label",
      task_ids: ["task"],
      payload: { labelId: "label-1" },
    });
  });

  it("calls RPC to update watchers", async () => {
    await bulkUpdateWatchers(["task"], ["watcher-1", "watcher-2"]);

    expect(mockedSupabase.rpc).toHaveBeenCalledWith("perform_bulk_task_operation", {
      action: "update_watchers",
      task_ids: ["task"],
      payload: { watcherIds: ["watcher-1", "watcher-2"] },
    });
  });

  it("calls RPC to link dependencies", async () => {
    await bulkLinkDependency(["task"], "target-task", "blocks");

    expect(mockedSupabase.rpc).toHaveBeenCalledWith("perform_bulk_task_operation", {
      action: "link_dependency",
      task_ids: ["task"],
      payload: { relatedTaskId: "target-task", dependencyType: "blocks" },
    });
  });

  it("falls back to invoke when RPC is unavailable", async () => {
    mockedSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: "function perform_bulk_task_operation does not exist" },
    });

    await bulkDeleteTasks(["task-1"]);

    expect(mockedSupabase.functions.invoke).toHaveBeenCalledWith("bulk-task-operations", {
      body: {
        action: "delete_tasks",
        taskIds: ["task-1"],
        payload: {},
      },
    });
  });
});
