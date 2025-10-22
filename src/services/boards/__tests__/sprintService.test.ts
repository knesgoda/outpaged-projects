import "@testing-library/jest-dom";
import { describe, expect, it, beforeEach, afterEach } from "@jest/globals";
import { enqueueFrom, resetSupabaseMocks, supabaseMock } from "@/testing/supabaseHarness";
import * as sprintService from "../sprintService";

type TaskRow = {
  id: string;
  sprint_id: string | null;
  project_id: string;
  status?: string;
  status_category?: string;
  story_points?: number | null;
  estimate_hours?: number | null;
};

function enqueueTaskQuery(tasks: TaskRow[]) {
  const order = jest.fn().mockResolvedValue({ data: tasks, error: null });
  const projectEq = jest.fn().mockReturnValue({ order });
  const sprintEq = jest.fn().mockReturnValue({ eq: projectEq, order });
  const select = jest.fn().mockReturnValue({ eq: sprintEq });

  enqueueFrom("tasks", { select });

  return { select, sprintEq, projectEq, order };
}

describe("sprintService", () => {
  beforeEach(() => {
    resetSupabaseMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getSprintTasks", () => {
    it("filters by sprint id and excludes non-matching rows", async () => {
      const tasks: TaskRow[] = [
        {
          id: "task-1",
          sprint_id: "sprint-123",
          project_id: "project-456",
          status: "in_progress",
          story_points: 5,
          estimate_hours: 3,
        },
        {
          id: "task-2",
          sprint_id: "sprint-999",
          project_id: "project-456",
          status: "todo",
          story_points: 8,
          estimate_hours: 5,
        },
      ];

      const { select, sprintEq, projectEq, order } = enqueueTaskQuery(tasks);

      const result = await sprintService.getSprintTasks("sprint-123");

      expect(supabaseMock.from).toHaveBeenCalledWith("tasks");
      expect(select).toHaveBeenCalledWith("*");
      expect(sprintEq).toHaveBeenCalledWith("sprint_id", "sprint-123");
      expect(projectEq).not.toHaveBeenCalled();
      expect(order).toHaveBeenCalledWith("created_at", { ascending: false });

      expect(result).toEqual([
        expect.objectContaining({ id: "task-1", sprint_id: "sprint-123" }),
      ]);
    });

    it("applies project filter when provided", async () => {
      const tasks: TaskRow[] = [
        {
          id: "task-1",
          sprint_id: "sprint-123",
          project_id: "project-456",
          status: "in_progress",
        },
        {
          id: "task-2",
          sprint_id: "sprint-123",
          project_id: "project-789",
          status: "todo",
        },
      ];

      const { projectEq } = enqueueTaskQuery(tasks);

      const result = await sprintService.getSprintTasks("sprint-123", "project-456");

      expect(projectEq).toHaveBeenCalledWith("project_id", "project-456");
      expect(result).toEqual([
        expect.objectContaining({ id: "task-1", project_id: "project-456" }),
      ]);
    });
  });

  describe("getSprintMetrics", () => {
    it("computes metrics using only tasks from the requested sprint", async () => {
      const tasks: TaskRow[] = [
        {
          id: "task-1",
          sprint_id: "sprint-123",
          project_id: "project-456",
          status: "done",
          story_points: 5,
          estimate_hours: 4,
        },
        {
          id: "task-2",
          sprint_id: "sprint-123",
          project_id: "project-456",
          status_category: "Done",
          story_points: 3,
          estimate_hours: 6,
        },
        {
          id: "task-3",
          sprint_id: "sprint-999",
          project_id: "project-456",
          status: "done",
          story_points: 8,
          estimate_hours: 7,
        },
      ];

      const { projectEq } = enqueueTaskQuery(tasks);

      const metrics = await sprintService.getSprintMetrics("sprint-123", "project-456");

      expect(projectEq).toHaveBeenCalledWith("project_id", "project-456");
      expect(metrics).toEqual({
        totalTasks: 2,
        completedTasks: 2,
        totalPoints: 8,
        completedPoints: 8,
        totalHours: 10,
        completedHours: 10,
      });
    });
  });
});
