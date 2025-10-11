import { applyBulkSprintMove, routeFormSubmissionToGroup } from "../boardService";

describe("board service helpers", () => {
  describe("routeFormSubmissionToGroup", () => {
    it("selects the first matching rule and respects defaults", () => {
      const submission = { priority: "high", type: "bug", project: "alpha" };
      const groupId = routeFormSubmissionToGroup(
        submission,
        [
          {
            groupId: "triage",
            conditions: [{ field: "type", equals: "bug" }, { field: "priority", equals: "critical" }],
          },
          {
            groupId: "priority-bugs",
            conditions: [
              { field: "type", equals: "bug" },
              { field: "priority", oneOf: ["high", "critical"] },
            ],
          },
          { groupId: "backlog", default: true },
        ],
        "fallback"
      );

      expect(groupId).toBe("priority-bugs");
    });

    it("falls back to default or explicit fallback when no rule matches", () => {
      const submission = { project: "alpha" };
      const groupId = routeFormSubmissionToGroup(
        submission,
        [
          {
            groupId: "design",
            conditions: [{ field: "type", equals: "design" }],
          },
          { groupId: "default", default: true },
        ]
      );

      expect(groupId).toBe("default");

      const fallback = routeFormSubmissionToGroup(submission, [], "fallback-group");
      expect(fallback).toBe("fallback-group");
    });
  });

  describe("applyBulkSprintMove", () => {
    it("updates items while skipping completed or not-ready work", () => {
      const items = [
        { id: "1", sprintId: null, status: "backlog", completed: false, ready: true },
        { id: "2", sprintId: "sprint-1", status: "in_sprint", completed: false, ready: true },
        { id: "3", sprintId: null, status: "backlog", completed: true, ready: true },
        { id: "4", sprintId: null, status: "backlog", completed: false, ready: false },
      ];

      const result = applyBulkSprintMove(items, {
        targetSprintId: "sprint-2",
      });

      expect(result.moved).toEqual(["1"]);
      expect(result.skipped).toEqual([
        { id: "2", reason: "already_in_sprint" },
        { id: "3", reason: "completed" },
        { id: "4", reason: "not_ready" },
      ]);
      expect(result.updatedItems.find((item) => item.id === "1")?.sprintId).toBe("sprint-2");
      expect(result.updatedItems.find((item) => item.id === "1")?.status).toBe("in_sprint");
    });

    it("can allow completed work when flagged", () => {
      const items = [{ id: "5", sprintId: null, completed: true, ready: true }];
      const result = applyBulkSprintMove(items, {
        targetSprintId: "sprint-99",
        allowCompleted: true,
        statusOnMove: "committed",
      });

      expect(result.moved).toEqual(["5"]);
      expect(result.updatedItems[0].status).toBe("committed");
    });

    it("optionally mutates original entries when mutateOriginal is enabled", () => {
      const items = [
        { id: "10", sprintId: null, status: "backlog", completed: false, ready: true },
      ];

      const result = applyBulkSprintMove(items, {
        targetSprintId: "sprint-88",
        mutateOriginal: true,
      });

      expect(result.moved).toEqual(["10"]);
      expect(items[0].sprintId).toBe("sprint-88");
      expect(result.updatedItems[0]).toBe(items[0]);
    });

    it("skips duplicate identifiers and records the reason", () => {
      const items = [
        { id: "11", sprintId: null, status: "backlog", completed: false, ready: true },
        { id: "11", sprintId: null, status: "backlog", completed: false, ready: true },
      ];

      const result = applyBulkSprintMove(items, { targetSprintId: "sprint-12" });

      expect(result.moved).toEqual(["11"]);
      expect(result.skipped).toContainEqual({ id: "11", reason: "duplicate" });
      expect(items[0].sprintId).toBeNull();
      expect(result.updatedItems[0]).not.toBe(items[0]);
    });

    it("respects readiness toggles when combined with completed work", () => {
      const items = [
        { id: "20", sprintId: null, status: "backlog", completed: true, ready: false },
        { id: "21", sprintId: null, status: "backlog", completed: false, ready: false },
      ];

      const result = applyBulkSprintMove(items, {
        targetSprintId: "sprint-200",
        allowCompleted: true,
        requireReady: false,
        statusOnMove: "planned",
      });

      expect(result.moved).toEqual(["20", "21"]);
      expect(result.updatedItems.every((item) => item.status === "planned")).toBe(true);
    });
  });
});
