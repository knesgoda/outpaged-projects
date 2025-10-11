import "@testing-library/jest-dom";
import { describe, expect, it } from "@jest/globals";
import { serializeTaskRow, calculateRollup, type TaskRow } from "@/services/tasksService";

const baseRow = (): TaskRow => ({
  id: "task-1",
  title: "Improve onboarding flow",
  description: "Refine steps for new users",
  status: "in_progress",
  priority: "high",
  hierarchy_level: "task",
  task_type: "change",
  project_id: "project-1",
  parent_id: null,
  swimlane_id: null,
  assignee_id: null,
  blocked: false,
  blocking_reason: null,
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-02T00:00:00.000Z",
  reporter_id: "user-1",
  sprint_id: null,
  story_points: 5,
  ticket_number: 42,
  due_date: "2024-02-01",
  start_date: "2024-01-15",
  end_date: "2024-02-15",
  completed_at: null,
  estimated_hours: 16,
  actual_hours: 12,
  external_links: ["https://example.com/spec"] as any,
  // The generated types expect optional properties that may not exist in runtime rows
  projects: {
    id: "project-1",
    name: "Growth Experiments",
    code: "GROW",
  },
} as TaskRow);

describe("tasksService serialization", () => {
  it("hydrates scheduling and estimate fields from the raw row", () => {
    const task = serializeTaskRow(baseRow());

    expect(task.start_date).toEqual("2024-01-15");
    expect(task.end_date).toEqual("2024-02-15");
    expect(task.due_date).toEqual("2024-02-01");
    expect(task.estimated_hours).toEqual(16);
    expect(task.actual_hours).toEqual(12);
    expect(task.externalLinks).toEqual(["https://example.com/spec"]);
    expect(task.project?.code).toEqual("GROW");
  });
});

describe("calculateRollup", () => {
  it("returns aggregate progress using weights when provided", () => {
    const rollup = calculateRollup([
      {
        id: "sub-1",
        title: "Draft customer journey",
        status: "done",
        completed: true,
        rollupWeight: 2,
        estimatedHours: 4,
        actualHours: 5,
        storyPoints: 3,
      },
      {
        id: "sub-2",
        title: "Run qualitative interviews",
        status: "in_progress",
        completed: false,
        rollupWeight: 1,
        estimatedHours: 6,
        actualHours: 3,
        storyPoints: 2,
      },
    ]);

    expect(rollup).toBeDefined();
    expect(rollup?.total).toBe(2);
    expect(rollup?.completed).toBe(1);
    expect(rollup?.weightedTotal).toBeCloseTo(3);
    expect(rollup?.weightedCompleted).toBeCloseTo(2);
    expect(rollup?.progress).toBeCloseTo(2 / 3);
  });

  it("returns undefined when no subitems are provided", () => {
    expect(calculateRollup([])).toBeUndefined();
  });
});
