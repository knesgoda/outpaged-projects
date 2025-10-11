import { addCondition, removeConditions } from "./BoardFilterBuilder";
import type {
  BoardFilterDefinition,
  BoardQuickFilterDefinition,
  BoardQuickFilterCombination,
} from "./types";

function ensureRoot(definition: BoardFilterDefinition): BoardFilterDefinition {
  if (!definition.root) {
    return {
      root: {
        id: "root",
        join: "AND",
        conditions: [],
        children: [],
      },
    };
  }
  return definition;
}

export const QUICK_FILTERS: BoardQuickFilterDefinition[] = [
  {
    id: "me",
    label: "Assigned to me",
    description: "Shows tasks assigned to the current user.",
    apply: (definition) => {
      const next = ensureRoot(definition);
      return addCondition(next, next.root.id, {
        field: "assignee",
        operator: "is",
        value: "me",
        meta: { quick: true },
      });
    },
    isActive: (definition) =>
      definition.root.conditions.some(
        (condition) =>
          condition.field === "assignee" &&
          condition.operator === "is" &&
          condition.value === "me"
      ),
    clear: (definition) =>
      removeConditions(definition, (condition) =>
        condition.field === "assignee" && condition.operator === "is" && condition.value === "me"
      ),
  },
  {
    id: "overdue",
    label: "Overdue",
    description: "Tasks past their due date.",
    apply: (definition) => {
      const next = ensureRoot(definition);
      return addCondition(next, next.root.id, {
        field: "dueDate",
        operator: "relative_date",
        value: "overdue",
        meta: { quick: true },
      });
    },
    isActive: (definition) =>
      definition.root.conditions.some(
        (condition) =>
          condition.field === "dueDate" &&
          condition.operator === "relative_date" &&
          condition.value === "overdue"
      ),
    clear: (definition) =>
      removeConditions(definition, (condition) =>
        condition.field === "dueDate" &&
        condition.operator === "relative_date" &&
        condition.value === "overdue"
      ),
  },
  {
    id: "blocked",
    label: "Blocked",
    description: "Tasks that are currently blocked.",
    apply: (definition) => {
      const next = ensureRoot(definition);
      return addCondition(next, next.root.id, {
        field: "status",
        operator: "is",
        value: "blocked",
        meta: { quick: true },
      });
    },
    isActive: (definition) =>
      definition.root.conditions.some(
        (condition) =>
          condition.field === "status" &&
          condition.operator === "is" &&
          condition.value === "blocked"
      ),
    clear: (definition) =>
      removeConditions(definition, (condition) =>
        condition.field === "status" && condition.operator === "is" && condition.value === "blocked"
      ),
  },
  {
    id: "high_priority",
    label: "High priority",
    description: "Highlights tasks marked as high priority.",
    apply: (definition) => {
      const next = ensureRoot(definition);
      return addCondition(next, next.root.id, {
        field: "priority",
        operator: "is",
        value: "high",
        meta: { quick: true },
      });
    },
    isActive: (definition) =>
      definition.root.conditions.some(
        (condition) =>
          condition.field === "priority" &&
          condition.operator === "is" &&
          condition.value === "high"
      ),
    clear: (definition) =>
      removeConditions(definition, (condition) =>
        condition.field === "priority" && condition.operator === "is" && condition.value === "high"
      ),
  },
];

export const QUICK_FILTER_COMBINATIONS: BoardQuickFilterCombination[] = [
  {
    id: "my_blocked",
    label: "My blocked",
    filters: ["me", "blocked"],
    description: "Work assigned to me that cannot progress.",
  },
  {
    id: "overdue_priority",
    label: "Overdue & high priority",
    filters: ["overdue", "high_priority"],
    description: "Critical items that are past due.",
  },
];
