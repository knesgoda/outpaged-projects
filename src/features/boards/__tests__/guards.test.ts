import {
  evaluateWipGuard,
  evaluateDefinitionChecklists,
  isDefinitionOfReadyMet,
  isDefinitionOfDoneMet,
  evaluateDependencyPolicy,
} from "@/features/boards/guards";
import type { ColumnBaseMetadata } from "@/types/boardColumns";
import type { Task } from "@/components/kanban/TaskCard";

describe("evaluateWipGuard", () => {
  const baseMetadata: ColumnBaseMetadata = {
    wip: {
      columnLimit: 2,
      laneLimits: {},
      policy: "allow_override",
    },
    checklists: { ready: [], done: [] },
    blockerPolicies: {
      enforceDependencyClearance: true,
      requireReasonForOverride: false,
    },
  };

  it("returns override when limits are exceeded and policy allows overrides", () => {
    const result = evaluateWipGuard({
      metadata: baseMetadata,
      totalInColumn: 2,
      totalInLane: 1,
      laneId: null,
    });

    expect(result.status).toBe("override");
    expect(result.reason).toBe("column");
    expect(result.limit).toBe(2);
  });

  it("returns blocked when policy is strict", () => {
    const strictMetadata: ColumnBaseMetadata = {
      ...baseMetadata,
      wip: {
        ...baseMetadata.wip,
        policy: "strict",
      },
    };

    const result = evaluateWipGuard({
      metadata: strictMetadata,
      totalInColumn: 3,
      totalInLane: 3,
      laneId: "lane-1",
    });

    expect(result.status).toBe("blocked");
    expect(result.reason).toBe("column");
  });

  it("honors lane limits before column limits", () => {
    const metadata: ColumnBaseMetadata = {
      ...baseMetadata,
      wip: {
        columnLimit: 5,
        laneLimits: { "lane-1": 1 },
        policy: "allow_override",
      },
    };

    const result = evaluateWipGuard({
      metadata,
      totalInColumn: 2,
      totalInLane: 2,
      laneId: "lane-1",
    });

    expect(result.status).toBe("override");
    expect(result.reason).toBe("lane");
    expect(result.limit).toBe(1);
  });

  it("returns ok when no limits are configured", () => {
    const result = evaluateWipGuard({
      metadata: {
        ...baseMetadata,
        wip: { columnLimit: null, laneLimits: {}, policy: "allow_override" },
      },
      totalInColumn: 10,
      totalInLane: 10,
      laneId: null,
    });

    expect(result.status).toBe("ok");
    expect(result.limit).toBeNull();
  });
});

describe("definition checklist evaluation", () => {
  const checklistMetadata: ColumnBaseMetadata = {
    wip: { columnLimit: null, laneLimits: {}, policy: "allow_override" },
    blockerPolicies: {
      enforceDependencyClearance: true,
      requireReasonForOverride: false,
    },
    checklists: {
      ready: [
        { id: "ready-description", label: "Description present", field: "description" },
        { id: "ready-assignee", label: "Assignee chosen", field: "assignees" },
      ],
      done: [
        { id: "done-rollup", label: "Rollup complete", field: "rollupCompleted" },
        { id: "done-blockers", label: "No blockers", field: "blocked", invert: true },
      ],
    },
  };

  const baseTask: Task = {
    id: "task-1",
    title: "Example",
    status: "todo",
    priority: "low",
    hierarchy_level: "task",
    task_type: "task",
    tags: [],
    assignees: [],
    relations: [],
    subitems: [],
  };

  it("marks checklist items as satisfied only when criteria are met", () => {
    const result = evaluateDefinitionChecklists(checklistMetadata, {
      ...baseTask,
      description: "Detailed description",
      assignees: [{ id: "user-1", name: "Jane", initials: "J" }],
      rollup: { total: 1, completed: 1, progress: 100, weightedTotal: 1, weightedCompleted: 1 },
      blocked: false,
    });

    expect(result.ready.every((item) => item.satisfied)).toBe(true);
    expect(result.done.every((item) => item.satisfied)).toBe(true);
    expect(isDefinitionOfReadyMet(result)).toBe(true);
    expect(isDefinitionOfDoneMet(result)).toBe(true);
  });

  it("identifies unmet checklist requirements", () => {
    const result = evaluateDefinitionChecklists(checklistMetadata, {
      ...baseTask,
      description: "",
      assignees: [],
      rollup: { total: 2, completed: 1, progress: 50, weightedTotal: 2, weightedCompleted: 1 },
      blocked: true,
    });

    expect(result.ready.map((item) => item.satisfied)).toEqual([false, false]);
    expect(result.done.map((item) => item.satisfied)).toEqual([false, false]);
    expect(isDefinitionOfReadyMet(result)).toBe(false);
    expect(isDefinitionOfDoneMet(result)).toBe(false);
  });
});

describe("dependency policy evaluation", () => {
  const metadata: ColumnBaseMetadata = {
    wip: { columnLimit: null, laneLimits: {}, policy: "allow_override" },
    checklists: { ready: [], done: [] },
    blockerPolicies: {
      enforceDependencyClearance: true,
      requireReasonForOverride: false,
    },
  };

  const baseTask: Task = {
    id: "task-2",
    title: "Blocked task",
    status: "in_progress",
    priority: "medium",
    hierarchy_level: "task",
    task_type: "task",
    tags: [],
    relations: [],
    subitems: [],
  };

  it("blocks movement when dependencies exist", () => {
    const result = evaluateDependencyPolicy(metadata, {
      ...baseTask,
      relations: [{
        id: "rel-1",
        type: "blocked_by",
        direction: "incoming",
        relatedTaskId: "task-99",
        relatedTaskTitle: "Upstream",
        relatedTaskStatus: "in_progress",
      }],
    });

    expect(result.blocked).toBe(true);
    expect(result.reason).toBeDefined();
  });

  it("returns custom blocking reason when provided", () => {
    const reason = "Awaiting security review";
    const result = evaluateDependencyPolicy(metadata, {
      ...baseTask,
      blocked: true,
      blocking_reason: reason,
    });

    expect(result.blocked).toBe(true);
    expect(result.reason).toBe(reason);
  });

  it("allows progress when enforcement disabled", () => {
    const result = evaluateDependencyPolicy(
      {
        ...metadata,
        blockerPolicies: { ...metadata.blockerPolicies, enforceDependencyClearance: false },
      },
      {
        ...baseTask,
        blocked: true,
      }
    );

    expect(result.blocked).toBe(false);
    expect(result.reason).toBeNull();
  });
});
