import "@testing-library/jest-dom";
import { describe, expect, it } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { StandardizedTaskCard, type StandardizedTask } from "@/components/ui/standardized-task-card";

describe("StandardizedTaskCard", () => {
  const baseTask: StandardizedTask = {
    id: "task-123",
    title: "Ship searchable task views",
    description: "Expose full task rollups in Kanban",
    status: "in_progress",
    priority: "high",
    hierarchy_level: "task",
    task_type: "change",
    parent_id: null,
    project_id: "project-1",
    swimlane_id: null,
    assignees: [],
    dueDate: undefined,
    due_date: "2024-03-15",
    start_date: "2024-03-01",
    end_date: "2024-03-20",
    estimated_hours: 24,
    actual_hours: 12,
    tags: ["delivery", "kanban"],
    tagDetails: [
      { id: "tag-1", label: "delivery", color: "#2563eb" },
      { id: "tag-2", label: "kanban", color: "#10b981" },
    ],
    comments: 3,
    attachments: 2,
    children: [],
    story_points: 5,
    blocked: false,
    blocking_reason: null,
    project: { name: "Velocity", code: "VEL" },
    ticket_number: 101,
    created_at: "2024-03-01T00:00:00.000Z",
    updated_at: "2024-03-05T00:00:00.000Z",
    links: [],
    files: [],
    relations: [
      {
        id: "rel-1",
        type: "blocks",
        direction: "outgoing",
        relatedTaskId: "task-abc",
        relatedTaskTitle: "Seed search index",
        relatedTaskStatus: "in_progress",
      },
    ],
    subitems: [
      {
        id: "sub-1",
        title: "Design rollup API",
        status: "done",
        completed: true,
        rollupWeight: 2,
        estimatedHours: 8,
        actualHours: 6,
        storyPoints: 3,
      },
      {
        id: "sub-2",
        title: "QA new board hydration",
        status: "in_progress",
        completed: false,
        rollupWeight: 1,
        estimatedHours: 4,
        actualHours: 2,
        storyPoints: 2,
      },
    ],
    rollup: {
      total: 2,
      completed: 1,
      progress: 2 / 3,
      weightedTotal: 3,
      weightedCompleted: 2,
    },
    externalLinks: ["https://example.com/spec"],
    integrations: [
      {
        id: "git",
        type: "git",
        status: "connected",
        label: "Git synced",
        tooltip: "Latest branch linked",
      },
      {
        id: "ci",
        type: "ci",
        status: "warning",
        label: "CI flaky",
        tooltip: "Last run failed",
      },
    ],
  };

  it("renders rollup progress information when provided", () => {
    render(<StandardizedTaskCard task={baseTask} />);

    expect(screen.getByText("Subitems")).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
  });

  it("shows relation chips for linked work", () => {
    render(<StandardizedTaskCard task={baseTask} />);

    expect(screen.getByText(/blocks/i)).toBeInTheDocument();
  });

  it("renders integration badges with tooltips", async () => {
    render(<StandardizedTaskCard task={baseTask} />);

    expect(screen.getByText("Git synced")).toBeInTheDocument();
    expect(screen.getByText("CI flaky")).toBeInTheDocument();
  });

  it("does not append ellipsis for short descriptions", () => {
    render(<StandardizedTaskCard task={baseTask} />);

    expect(screen.getByText(baseTask.description ?? "")).toBeInTheDocument();
  });

  it("truncates long descriptions with an ellipsis", () => {
    const longDescription = "A".repeat(120);

    render(
      <StandardizedTaskCard
        task={{
          ...baseTask,
          description: longDescription,
        }}
      />
    );

    expect(screen.getByText(`${"A".repeat(60)}…`)).toBeInTheDocument();
  });
});
