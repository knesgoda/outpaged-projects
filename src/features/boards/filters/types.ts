export type BoardFilterField =
  | "search"
  | "assignee"
  | "priority"
  | "status"
  | "hierarchy"
  | "taskType"
  | "dueDate"
  | "tag"
  | "label"
  | "project"
  | "component"
  | "version"
  | "relation";

export type BoardFilterOperator =
  | "is"
  | "is_not"
  | "contains"
  | "not_contains"
  | "in"
  | "not_in"
  | "regex"
  | "relative_date"
  | "is_empty"
  | "is_not_empty";

export interface BoardFilterCondition {
  id: string;
  field: BoardFilterField;
  operator: BoardFilterOperator;
  value?: string | string[] | number | null;
  meta?: Record<string, unknown>;
}

export interface BoardFilterGroup {
  id: string;
  join: "AND" | "OR";
  conditions: BoardFilterCondition[];
  children: BoardFilterGroup[];
}

export interface BoardFilterDefinition {
  root: BoardFilterGroup;
}

export interface BoardQuickFilterDefinition {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  apply: (definition: BoardFilterDefinition) => BoardFilterDefinition;
  isActive?: (definition: BoardFilterDefinition) => boolean;
  clear?: (definition: BoardFilterDefinition) => BoardFilterDefinition;
}

export const DEFAULT_FILTER_DEFINITION: BoardFilterDefinition = {
  root: {
    id: "root",
    join: "AND",
    conditions: [],
    children: [],
  },
};
