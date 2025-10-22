import { buildProjectAnalytics } from "../useProjectAnalytics";
import type { TaskWithDetails } from "@/types/tasks";
import { resetProjectSLA } from "@/services/projects/projectSLAService";
import { resetProjectNotifications } from "@/services/projects/projectNotificationService";

describe("buildProjectAnalytics", () => {
  beforeEach(() => {
    resetProjectSLA("project-1");
    resetProjectNotifications("project-1");
  });

  const baseTask: TaskWithDetails = {
    id: "task-1",
    title: "Sample",
    description: null,
    status: "todo",
    priority: "P2",
    hierarchy_level: "task",
    task_type: "task",
    project_id: "project-1",
    parent_id: null,
    swimlane_id: null,
    start_date: null,
    end_date: null,
    due_date: null,
    completed_at: undefined,
    estimated_hours: undefined,
    actual_hours: undefined,
    story_points: undefined,
    blocked: false,
    blocking_reason: undefined,
    ticket_number: undefined,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    project: null,
    assignees: [],
    tags: [],
    tagNames: [],
    files: [],
    links: [],
    relations: [],
    connections: [],
    subitems: [],
    rollup: undefined,
    commentCount: 0,
    attachmentCount: 0,
    externalLinks: [],
    customFields: {},
    customFieldHistory: [],
  };

  it("summarises workload, risks, and SLA metrics", () => {
    const tasks: TaskWithDetails[] = [
      {
        ...baseTask,
        id: "task-urgent",
        title: "Urgent blocked",
        priority: "P0",
        blocked: true,
        due_date: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        assignees: [{ id: "user-1", name: "Alex", initials: "A" }],
      },
      {
        ...baseTask,
        id: "task-high",
        title: "High priority",
        priority: "P1",
        due_date: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
        assignees: [{ id: "user-2", name: "Mira", initials: "M" }],
        customFields: { "customer_tier": "Enterprise" },
      },
      {
        ...baseTask,
        id: "task-done",
        title: "Completed",
        status: "done",
        completed_at: new Date().toISOString(),
      },
    ];

    const analytics = buildProjectAnalytics("project-1", tasks, new Date());

    expect(analytics.openTasks).toBe(2);
    expect(analytics.workload.find((entry) => entry.assigneeId === "user-1")?.urgent).toBe(1);
    expect(analytics.risks.some((risk) => risk.taskId === "task-urgent")).toBe(true);
    expect(analytics.customFieldInsights[0].field).toBe("customer_tier");
    expect(analytics.sla.totals.onTrack + analytics.sla.totals.atRisk + analytics.sla.totals.breached + analytics.sla.totals.met)
      .toBeGreaterThanOrEqual(1);
  });
});
