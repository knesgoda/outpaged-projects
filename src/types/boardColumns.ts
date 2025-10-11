import type { Database } from "@/integrations/supabase/types";

export type KanbanColumnType =
  Database["public"]["Enums"]["kanban_column_type"];

export interface DependencyColumnMetadata {
  dependencyField: string;
  showStatus: boolean;
  showBlockingBadge: boolean;
}

export interface FormulaColumnMetadata {
  expression: string;
  precision: number;
  format: "number" | "percent" | "currency";
}

export interface RollupColumnMetadata {
  sourceCollection: string;
  targetField: string;
  aggregation: "sum" | "avg" | "min" | "max" | "count";
  precision: number;
}

export interface MirrorColumnMetadata {
  sourceBoardId: string;
  sourceColumnId: string;
  displayFields: string[];
}

export interface ConnectColumnMetadata {
  targetBoardId: string;
  relationshipName: string;
  allowMultiple: boolean;
  createLinkedRecord: boolean;
}

export type ColumnMetadataByType = {
  dependency: DependencyColumnMetadata;
  formula: FormulaColumnMetadata;
  rollup: RollupColumnMetadata;
  mirror: MirrorColumnMetadata;
  connect: ConnectColumnMetadata;
  status: Record<string, never>;
  assignee: Record<string, never>;
};

export type ColumnMetadataForType<T extends KanbanColumnType> =
  T extends keyof ColumnMetadataByType
    ? ColumnMetadataByType[T]
    : Record<string, never>;

export type ColumnMetadataValue = ColumnMetadataByType[keyof ColumnMetadataByType];

export const DEFAULT_DEPENDENCY_METADATA: DependencyColumnMetadata = {
  dependencyField: "blocked_by",
  showStatus: true,
  showBlockingBadge: true,
};

export const DEFAULT_FORMULA_METADATA: FormulaColumnMetadata = {
  expression: "({{completed}} / {{total}}) * 100",
  precision: 2,
  format: "percent",
};

export const DEFAULT_ROLLUP_METADATA: RollupColumnMetadata = {
  sourceCollection: "subtasks",
  targetField: "completed",
  aggregation: "sum",
  precision: 0,
};

export const DEFAULT_MIRROR_METADATA: MirrorColumnMetadata = {
  sourceBoardId: "",
  sourceColumnId: "",
  displayFields: ["status", "assignee"],
};

export const DEFAULT_CONNECT_METADATA: ConnectColumnMetadata = {
  targetBoardId: "",
  relationshipName: "Linked work",
  allowMultiple: true,
  createLinkedRecord: false,
};

export function getDefaultMetadata(type: KanbanColumnType): ColumnMetadataValue {
  switch (type) {
    case "dependency":
      return DEFAULT_DEPENDENCY_METADATA;
    case "formula":
      return DEFAULT_FORMULA_METADATA;
    case "rollup":
      return DEFAULT_ROLLUP_METADATA;
    case "mirror":
      return DEFAULT_MIRROR_METADATA;
    case "connect":
      return DEFAULT_CONNECT_METADATA;
    default:
      return {};
  }
}

export function isAdvancedColumnType(
  type: KanbanColumnType
): type is Exclude<
  KanbanColumnType,
  "status" | "assignee"
> {
  return type !== "status" && type !== "assignee";
}
