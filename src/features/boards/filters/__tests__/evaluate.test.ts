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
});
