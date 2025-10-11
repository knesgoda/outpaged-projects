import type { Database } from "@/integrations/supabase/types";

export type KanbanColumnType =
  Database["public"]["Enums"]["kanban_column_type"];

export type ColumnWipPolicyMode = "strict" | "allow_override";

export interface ColumnWipOverrideDetails {
  active: boolean;
  grantedBy?: string | null;
  grantedAt?: string | null;
  reason?: string | null;
  expiresAt?: string | null;
  laneId?: string | null;
}

export interface ColumnWipOverrideState {
  column?: ColumnWipOverrideDetails | null;
  lanes: Record<string, ColumnWipOverrideDetails | undefined>;
}

export interface ColumnWipConfig {
  columnLimit: number | null;
  laneLimits: Record<string, number>;
  policy: ColumnWipPolicyMode;
  overrides: ColumnWipOverrideState;
}

export interface ColumnChecklistItem {
  id: string;
  label: string;
  field:
    | "description"
    | "assignees"
    | "blocked"
    | "rollupCompleted"
    | "attachmentsOrLinks";
  invert?: boolean;
  helpText?: string;
}

export interface ColumnChecklistConfig {
  ready: ColumnChecklistItem[];
  done: ColumnChecklistItem[];
}

export interface ColumnBlockerPolicy {
  enforceDependencyClearance: boolean;
  requireReasonForOverride: boolean;
}

export interface ColumnBaseMetadata {
  wip: ColumnWipConfig;
  checklists: ColumnChecklistConfig;
  blockerPolicies: ColumnBlockerPolicy;
}

export interface DependencyColumnMetadata extends ColumnBaseMetadata {
  dependencyField: string;
  showStatus: boolean;
  showBlockingBadge: boolean;
}

export interface FormulaColumnMetadata extends ColumnBaseMetadata {
  expression: string;
  precision: number;
  format: "number" | "percent" | "currency";
}

export interface RollupColumnMetadata extends ColumnBaseMetadata {
  sourceCollection: string;
  targetField: string;
  aggregation: "sum" | "avg" | "min" | "max" | "count";
  precision: number;
}

export interface MirrorColumnMetadata extends ColumnBaseMetadata {
  sourceBoardId: string;
  sourceColumnId: string;
  displayFields: string[];
}

export interface ConnectColumnMetadata extends ColumnBaseMetadata {
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
  status: ColumnBaseMetadata;
  assignee: ColumnBaseMetadata;
};

export type ColumnMetadataForType<T extends KanbanColumnType> =
  T extends keyof ColumnMetadataByType
    ? ColumnMetadataByType[T]
    : ColumnBaseMetadata;

export type ColumnMetadataValue = ColumnMetadataByType[keyof ColumnMetadataByType];

const DEFAULT_CHECKLIST_READY: ColumnChecklistItem[] = [
  {
    id: "ready-description",
    label: "Story details captured",
    field: "description",
    helpText: "Provide enough context for the team to act on the work item.",
  },
  {
    id: "ready-assignee",
    label: "Owner assigned",
    field: "assignees",
    helpText: "Assign a directly responsible individual or team.",
  },
  {
    id: "ready-unblocked",
    label: "Dependencies cleared",
    field: "blocked",
    invert: true,
    helpText: "Resolve upstream blockers or mark them with a reason.",
  },
];

const DEFAULT_CHECKLIST_DONE: ColumnChecklistItem[] = [
  {
    id: "done-subitems",
    label: "Acceptance criteria satisfied",
    field: "rollupCompleted",
    helpText: "All tracked subitems or acceptance criteria are complete.",
  },
  {
    id: "done-unblocked",
    label: "No blockers remain",
    field: "blocked",
    invert: true,
    helpText: "Outstanding dependency holds have been cleared.",
  },
  {
    id: "done-evidence",
    label: "Evidence attached",
    field: "attachmentsOrLinks",
    helpText: "Attach supporting artifacts, links, or documentation.",
  },
];

export const DEFAULT_COLUMN_METADATA_BASE: ColumnBaseMetadata = {
  wip: {
    columnLimit: null,
    laneLimits: {},
    policy: "allow_override",
    overrides: { column: null, lanes: {} },
  },
  checklists: {
    ready: DEFAULT_CHECKLIST_READY,
    done: DEFAULT_CHECKLIST_DONE,
  },
  blockerPolicies: {
    enforceDependencyClearance: true,
    requireReasonForOverride: false,
  },
};

export const DEFAULT_DEPENDENCY_METADATA: DependencyColumnMetadata = {
  ...DEFAULT_COLUMN_METADATA_BASE,
  dependencyField: "blocked_by",
  showStatus: true,
  showBlockingBadge: true,
};

export const DEFAULT_FORMULA_METADATA: FormulaColumnMetadata = {
  ...DEFAULT_COLUMN_METADATA_BASE,
  expression: "({{completed}} / {{total}}) * 100",
  precision: 2,
  format: "percent",
};

export const DEFAULT_ROLLUP_METADATA: RollupColumnMetadata = {
  ...DEFAULT_COLUMN_METADATA_BASE,
  sourceCollection: "subtasks",
  targetField: "completed",
  aggregation: "sum",
  precision: 0,
};

export const DEFAULT_MIRROR_METADATA: MirrorColumnMetadata = {
  ...DEFAULT_COLUMN_METADATA_BASE,
  sourceBoardId: "",
  sourceColumnId: "",
  displayFields: ["status", "assignee"],
};

export const DEFAULT_CONNECT_METADATA: ConnectColumnMetadata = {
  ...DEFAULT_COLUMN_METADATA_BASE,
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
      return { ...DEFAULT_COLUMN_METADATA_BASE };
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

function mergeColumnMetadata<T extends KanbanColumnType>(
  type: T,
  metadata: unknown
): ColumnMetadataForType<T> {
  const base = getDefaultMetadata(type);

  if (!metadata || typeof metadata !== "object") {
    return { ...base } as ColumnMetadataForType<T>;
  }

  const incoming = metadata as Record<string, unknown>;
  const incomingOverrides = (incoming.wip as Record<string, unknown> | undefined)?.overrides;
  const baseOverrides = base.wip.overrides ?? { column: null, lanes: {} };
  const normalizedOverrides: ColumnWipOverrideState = {
    column:
      incomingOverrides && typeof (incomingOverrides as Record<string, unknown>).column === "object"
        ? ((incomingOverrides as { column?: ColumnWipOverrideDetails | null }).column ?? null)
        : baseOverrides.column ?? null,
    lanes: {
      ...baseOverrides.lanes,
      ...((incomingOverrides as { lanes?: Record<string, ColumnWipOverrideDetails> } | undefined)?.lanes ?? {}),
    },
  };

  const merged = {
    ...base,
    ...incoming,
    wip: {
      ...base.wip,
      ...(incoming.wip as Record<string, unknown> | undefined),
      laneLimits: {
        ...base.wip.laneLimits,
        ...(((incoming.wip as Record<string, unknown> | undefined)?.laneLimits ?? {}) as Record<string, number>),
      },
      overrides: normalizedOverrides,
    },
    checklists: {
      ready: Array.isArray((incoming.checklists as any)?.ready)
        ? ((incoming.checklists as any).ready as ColumnChecklistItem[])
        : base.checklists.ready,
      done: Array.isArray((incoming.checklists as any)?.done)
        ? ((incoming.checklists as any).done as ColumnChecklistItem[])
        : base.checklists.done,
    },
    blockerPolicies: {
      ...base.blockerPolicies,
      ...(incoming.blockerPolicies as Record<string, unknown> | undefined),
    },
  } as ColumnMetadataForType<T>;

  return merged;
}

export function normalizeColumnMetadata<T extends KanbanColumnType>(
  type: T,
  metadata: unknown
): ColumnMetadataForType<T> {
  return mergeColumnMetadata(type, metadata);
}

export function serializeColumnMetadata(
  metadata: ColumnMetadataValue
): Record<string, unknown> {
  return metadata as Record<string, unknown>;
}
