import { matchesBoardFilter } from "../evaluate";
import { addCondition, cloneDefinition } from "../BoardFilterBuilder";
import { DEFAULT_FILTER_DEFINITION } from "../types";

describe("matchesBoardFilter", () => {
  it("returns true when no filters are defined", () => {
    expect(matchesBoardFilter(null, { foo: "bar" })).toBe(true);
  });

  it("supports AND/OR logic", () => {
    const definition = cloneDefinition(DEFAULT_FILTER_DEFINITION);
    const withStatus = addCondition(definition, definition.root.id, {
      field: "status",
      operator: "is",
      value: "blocked",
    });

    expect(
      matchesBoardFilter(withStatus, { status: "blocked" })
    ).toBe(true);

    expect(
      matchesBoardFilter(withStatus, { status: "ready" })
    ).toBe(false);
  });

  it("evaluates quick filter shortcuts", () => {
    const definition = cloneDefinition(DEFAULT_FILTER_DEFINITION);
    const withAssignee = addCondition(definition, definition.root.id, {
      field: "assignee",
      operator: "is",
      value: "me",
    });

    expect(
      matchesBoardFilter(withAssignee, { assignee: ["user-123"] }, { currentUserId: "user-123" })
    ).toBe(true);

    expect(
      matchesBoardFilter(withAssignee, { assignee: ["user-456"] }, { currentUserId: "user-123" })
    ).toBe(false);
  });

  it("handles relative date conditions", () => {
    const definition = cloneDefinition(DEFAULT_FILTER_DEFINITION);
    const overdue = addCondition(definition, definition.root.id, {
      field: "dueDate",
      operator: "relative_date",
      value: "overdue",
    });

    expect(
      matchesBoardFilter(overdue, { dueDate: new Date(Date.now() - 86400000).toISOString() })
    ).toBe(true);

    expect(
      matchesBoardFilter(overdue, { dueDate: new Date(Date.now() + 86400000).toISOString() })
    ).toBe(false);
  });

  it("evaluates project/component/version specific filters", () => {
    const definition = cloneDefinition(DEFAULT_FILTER_DEFINITION);
    const withProject = addCondition(definition, definition.root.id, {
      field: "project",
      operator: "in",
      value: ["proj-1"],
    });

    expect(
      matchesBoardFilter(withProject, { project_id: "proj-1", components: ["api"], versions: ["1.0"] })
    ).toBe(true);

    expect(
      matchesBoardFilter(withProject, { project_id: "proj-2" })
    ).toBe(false);
  });

  it("supports relation filters using parent and linked connections", () => {
    const parentDefinition = cloneDefinition(DEFAULT_FILTER_DEFINITION);
    const parentFilter = addCondition(parentDefinition, parentDefinition.root.id, {
      field: "relation",
      operator: "contains",
      value: "task-123",
      meta: { relationType: "parent" },
    });

    expect(matchesBoardFilter(parentFilter, { parent_id: "task-123" })).toBe(true);
    expect(matchesBoardFilter(parentFilter, { parent_id: "task-999" })).toBe(false);

    const connectionDefinition = cloneDefinition(DEFAULT_FILTER_DEFINITION);
    const connectionFilter = addCondition(connectionDefinition, connectionDefinition.root.id, {
      field: "relation",
      operator: "contains",
      value: "task-abc",
      meta: { relationType: "linked" },
    });

    expect(
      matchesBoardFilter(connectionFilter, {
        connections: [{ recordId: "task-abc", relationshipName: "linked" }],
      })
    ).toBe(true);
  });
});
