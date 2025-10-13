import "fake-indexeddb/auto";

import {
  clearOfflineIndex,
  executeOfflineQuery,
  planOfflineQuery,
  recordOpqlResponse,
} from "@/services/offline/opqlIndex";
import type { SearchResult } from "@/types";

const sampleHistory = {
  events: [
    {
      at: "2024-02-01T12:00:00.000Z",
      actor: "user:ava",
      changes: [
        { field: "status", from: "backlog", to: "in progress" },
        { field: "assignee", from: "user:ava", to: "user:ava" },
      ],
    },
  ],
  segments: {
    status: [
      {
        field: "status",
        value: "Backlog",
        start: "2024-01-01T00:00:00.000Z",
        end: "2024-02-01T12:00:00.000Z",
        actor: "user:ava",
        changedAt: "2024-02-01T12:00:00.000Z",
      },
      {
        field: "status",
        value: "In Progress",
        start: "2024-02-01T12:00:00.000Z",
        end: null,
        actor: "user:ava",
        changedAt: "2024-02-01T12:00:00.000Z",
      },
    ],
  },
} satisfies SearchResult["history"];

const taskOne: SearchResult = {
  id: "task-1",
  type: "task",
  title: "Implement offline planner",
  snippet: "*** masked ***",
  url: "/tasks/task-1",
  project_id: "proj-alpha",
  updated_at: "2024-02-01T12:00:00.000Z",
  score: 1.2,
  labels: ["search", "reliability"],
  assignees: [
    {
      id: "user:ava",
      name: "Ava Patel",
      email: "ava@example.com",
    },
  ],
  status: "In Progress",
  history: sampleHistory,
  permissions: { required: ["search.execute"] },
};

const taskTwo: SearchResult = {
  id: "task-2",
  type: "task",
  title: "Offline metrics summary",
  snippet: "Masked details",
  url: "/tasks/task-2",
  project_id: "proj-alpha",
  updated_at: "2024-02-10T15:00:00.000Z",
  score: 0.9,
  labels: ["analytics"],
  assignees: [
    {
      id: "user:ben",
      name: "Ben Ortiz",
      email: "ben@example.com",
    },
  ],
  status: "Blocked",
  history: {
    events: [
      {
        at: "2024-02-10T15:00:00.000Z",
        actor: "user:ben",
        changes: [{ field: "status", from: "in progress", to: "blocked" }],
      },
    ],
    segments: {
      status: [
        {
          field: "status",
          value: "In Progress",
          start: "2024-01-15T00:00:00.000Z",
          end: "2024-02-10T15:00:00.000Z",
          actor: "user:ben",
          changedAt: "2024-02-10T15:00:00.000Z",
        },
        {
          field: "status",
          value: "Blocked",
          start: "2024-02-10T15:00:00.000Z",
          end: null,
          actor: "user:ben",
          changedAt: "2024-02-10T15:00:00.000Z",
        },
      ],
    },
  },
  permissions: { required: ["search.comments.read"] },
};

const taskThree: SearchResult = {
  id: "task-3",
  type: "task",
  title: "Plan offline ranking tests",
  snippet: "Offline ranking coverage",
  url: "/tasks/task-3",
  project_id: "proj-beta",
  updated_at: "2024-01-20T09:30:00.000Z",
  score: 0.7,
  labels: ["search"],
  assignees: [
    {
      id: "user:cara",
      name: "Cara Kim",
    },
  ],
  status: "In Progress",
  history: {
    events: [],
    segments: { status: [] },
  },
  permissions: { required: ["search.execute"] },
};

describe("offline OPQL planning", () => {
  it("extracts structured filters from complex predicates", () => {
    const plan = planOfflineQuery(
      "FIND ITEMS WHERE project = 'proj-alpha' AND status IN ('In Progress','Blocked') AND labels IN ('search','priority') AND assignee = 'user:ava'",
    );
    expect(plan.filters.projectId).toBe("proj-alpha");
    expect(plan.filters.statuses).toEqual(expect.arrayContaining(["in progress", "blocked"]));
    expect(plan.filters.labels).toEqual(expect.arrayContaining(["search", "priority"]));
    expect(plan.filters.assignees).toEqual(expect.arrayContaining(["user:ava"]));
    expect(plan.unsupported).toHaveLength(0);
  });

  it("flags unsupported joins", () => {
    const plan = planOfflineQuery(
      "FIND ITEMS FROM tasks JOIN projects AS p ON p.id = tasks.project_id WHERE p.status = 'Active'",
    );
    expect(plan.unsupported).toEqual(expect.arrayContaining(["join:p"]));
  });

  it("flags aggregation clauses", () => {
    const plan = planOfflineQuery("AGGREGATE COUNT(*) FROM ITEMS GROUP BY status");
    expect(plan.unsupported).toEqual(expect.arrayContaining(["statement:aggregate", "aggregate:group_by"]));
  });
});

describe("offline query execution", () => {
  beforeEach(async () => {
    await clearOfflineIndex();
    await recordOpqlResponse({
      query: "FIND ITEMS WHERE status = 'In Progress'",
      projectId: null,
      types: ["task"],
      items: [taskOne, taskTwo, taskThree],
      partial: false,
      nextCursor: null,
    });
  });

  afterEach(async () => {
    await clearOfflineIndex();
  });

  it("filters results by facets and history while preserving masks", async () => {
    const result = await executeOfflineQuery({
      query: "FIND ITEMS WHERE status = 'In Progress' AND labels = 'search'",
      limit: 5,
      permissions: ["search.execute"],
    });
    expect(result.supported).toBe(true);
    expect(result.items).toHaveLength(2);
    expect(result.items.map((item) => item.id)).toEqual(expect.arrayContaining(["task-1", "task-3"]));
    expect(result.items.find((item) => item.id === "task-1")?.snippet).toBe("*** masked ***");
  });

  it("filters out results requiring unavailable permissions", async () => {
    const result = await executeOfflineQuery({
      query: "FIND ITEMS WHERE status = 'Blocked'",
      limit: 5,
      permissions: ["search.execute"],
    });
    expect(result.items).toHaveLength(0);
  });

  it("evaluates history predicates", async () => {
    const result = await executeOfflineQuery({
      query: "FIND ITEMS WHERE status WAS 'Backlog'",
      limit: 5,
      permissions: ["search.execute"],
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0].id).toBe("task-1");
  });

  it("ranks results using BM25 when no stored order exists", async () => {
    const result = await executeOfflineQuery({
      query: "FIND ITEMS WHERE title CONTAINS 'offline ranking plan'",
      limit: 3,
      permissions: ["search.execute"],
    });
    expect(result.items[0].id).toBe("task-3");
    expect(result.items).toHaveLength(2);
  });

  it("supports cursor-based paging", async () => {
    const first = await executeOfflineQuery({
      query: "FIND ITEMS WHERE status = 'In Progress'",
      limit: 1,
      permissions: ["search.execute"],
    });
    expect(first.items).toHaveLength(1);
    expect(first.nextCursor).toBe("offset:1");

    const second = await executeOfflineQuery({
      query: "FIND ITEMS WHERE status = 'In Progress'",
      limit: 1,
      cursor: first.nextCursor,
      permissions: ["search.execute"],
    });
    expect(second.items).toHaveLength(1);
    expect(second.items[0].id).not.toBe(first.items[0].id);
  });
});
