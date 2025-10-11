import { addCondition, addGroup, removeConditions, removeGroupById, cloneDefinition } from "../BoardFilterBuilder";
import { DEFAULT_FILTER_DEFINITION } from "../types";

describe("BoardFilterBuilder helpers", () => {
  it("adds conditions to a group", () => {
    const definition = cloneDefinition(DEFAULT_FILTER_DEFINITION);
    const result = addCondition(definition, definition.root.id, {
      field: "priority",
      operator: "is",
      value: "high",
    });

    expect(result.root.conditions).toHaveLength(1);
    expect(result.root.conditions[0]).toMatchObject({ field: "priority", operator: "is" });
  });

  it("adds nested groups", () => {
    const definition = cloneDefinition(DEFAULT_FILTER_DEFINITION);
    const result = addGroup(definition, definition.root.id, "OR");

    expect(result.root.children).toHaveLength(1);
    expect(result.root.children[0].join).toBe("OR");
  });

  it("removes conditions using a predicate", () => {
    const definition = cloneDefinition(DEFAULT_FILTER_DEFINITION);
    const withCondition = addCondition(definition, definition.root.id, {
      field: "status",
      operator: "is",
      value: "blocked",
    });

    const cleared = removeConditions(withCondition, (condition) => condition.field === "status");
    expect(cleared.root.conditions).toHaveLength(0);
  });

  it("removes nested groups by id", () => {
    const definition = cloneDefinition(DEFAULT_FILTER_DEFINITION);
    const withGroup = addGroup(definition, definition.root.id, "AND");
    const childId = withGroup.root.children[0].id;

    const pruned = removeGroupById(withGroup, childId);
    expect(pruned.root.children).toHaveLength(0);
  });
});
