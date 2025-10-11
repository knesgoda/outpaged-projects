import type {
  ConnectColumnMetadata,
  MirrorColumnMetadata,
  RollupColumnMetadata,
} from "@/types/boardColumns";
import type { TaskConnectionSummary } from "@/types/tasks";

type ContextRecord = Record<string, unknown>;

const PLACEHOLDER_REGEX = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
const SAFE_EXPRESSION_REGEX = /^[0-9+\-*/().,%!<>=&|?\s:]*$/;

const getValueByPath = (record: ContextRecord, path: string) => {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as ContextRecord)) {
      return (acc as ContextRecord)[key];
    }
    return undefined;
  }, record);
};

const coerceFormulaValue = (value: unknown): string => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "1" : "0";
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      return String(numeric);
    }
  }
  return "0";
};

export function evaluateFormula(
  formula: string,
  context: ContextRecord
): number | string | null {
  const trimmed = formula.trim();
  if (!trimmed) {
    return null;
  }

  const substituted = trimmed.replace(
    PLACEHOLDER_REGEX,
    (_match, key: string) => coerceFormulaValue(getValueByPath(context, key))
  );

  if (!SAFE_EXPRESSION_REGEX.test(substituted)) {
    throw new Error("Formula contains unsupported tokens");
  }

  try {
    const fn = new Function(`return (${substituted});`);
    return fn();
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Unable to evaluate formula"
    );
  }
}

export interface RollupComputation {
  count: number;
  value: number | null;
  completed?: number;
  total?: number;
  progress?: number;
}

const isRecord = (value: unknown): value is ContextRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isConnectionSummary = (value: unknown): value is TaskConnectionSummary =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.recordId === "string" &&
  (typeof value.boardId === "string" || typeof value.relationshipName === "string");

const extractConnections = (value: unknown): TaskConnectionSummary[] => {
  if (Array.isArray(value)) {
    return value.filter(isConnectionSummary);
  }

  if (isRecord(value) && Array.isArray(value.connections)) {
    return value.connections.filter(isConnectionSummary);
  }

  return [];
};

const matchesConnection = (
  connection: TaskConnectionSummary,
  metadata: MirrorColumnMetadata | RollupColumnMetadata
): boolean => {
  const boardId = (metadata as MirrorColumnMetadata).sourceBoardId;
  const columnId = (metadata as MirrorColumnMetadata).sourceColumnId;
  const collection = (metadata as RollupColumnMetadata).sourceCollection;

  const boardMatches = boardId ? connection.boardId === boardId : true;
  const columnMatches = columnId ? connection.sourceColumnId === columnId : true;
  const collectionMatches = collection
    ? connection.boardId === collection || connection.relationshipName === collection
    : true;

  return boardMatches && columnMatches && collectionMatches;
};

const selectConnection = <T extends MirrorColumnMetadata | RollupColumnMetadata>(
  connections: TaskConnectionSummary[],
  metadata: T
): TaskConnectionSummary | null => {
  if (!connections.length) {
    return null;
  }

  const matched = connections.find((connection) => matchesConnection(connection, metadata));
  return matched ?? connections[0];
};

interface RollupSourceDescriptor {
  records: ContextRecord[];
  aggregation?: RollupColumnMetadata["aggregation"];
  targetField?: string;
}

const toRollupSource = (
  value: unknown,
  metadata: RollupColumnMetadata
): RollupSourceDescriptor => {
  const connections = extractConnections(value);
  const connection = selectConnection(connections, metadata);

  if (connection?.rollup?.records?.length) {
    return {
      records: connection.rollup.records.filter(isRecord),
      aggregation: connection.rollup.aggregation,
      targetField: connection.rollup.targetField,
    };
  }

  if (connection?.fields) {
    const payload = connection.fields;
    if (Array.isArray((payload as { records?: unknown }).records)) {
      return {
        records: (payload as { records: unknown[] }).records.filter(isRecord),
      };
    }
  }

  if (Array.isArray(value) && value.every(isRecord)) {
    return { records: value };
  }

  if (isRecord(value) && Array.isArray(value.records)) {
    return {
      records: value.records.filter(isRecord),
      aggregation:
        typeof value.aggregation === "string"
          ? (value.aggregation as RollupColumnMetadata["aggregation"])
          : undefined,
      targetField: typeof value.targetField === "string" ? value.targetField : undefined,
    };
  }

  return { records: [] };
};

const numericField = (record: ContextRecord, field: string): number | null => {
  const value = getValueByPath(record, field);
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export function calculateRollup(
  value: unknown,
  metadata: RollupColumnMetadata
): RollupComputation | null {
  const source = toRollupSource(value, metadata);
  const records = source.records;

  if (!records.length) {
    return null;
  }

  const targetField = source.targetField ?? metadata.targetField;
  const aggregation = source.aggregation ?? metadata.aggregation;

  const values = records
    .map((record) => numericField(record, targetField))
    .filter((value): value is number => value !== null);

  const count = records.length;
  if (aggregation === "count") {
    return { count, value: count, progress: 1 };
  }

  if (values.length === 0) {
    return { count, value: null };
  }

  const sum = values.reduce((acc, current) => acc + current, 0);
  const computation: RollupComputation = {
    count,
    value: null,
  };

  switch (aggregation) {
    case "sum":
      computation.value = sum;
      break;
    case "avg":
      computation.value = sum / values.length;
      break;
    case "min":
      computation.value = Math.min(...values);
      break;
    case "max":
      computation.value = Math.max(...values);
      break;
    default:
      computation.value = sum;
      break;
  }

  const completed = records.filter((record) => {
    const value = getValueByPath(record, targetField);
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      return value > 0;
    }
    if (typeof value === "string") {
      const normalized = value.toLowerCase();
      return normalized === "done" || normalized === "complete";
    }
    return false;
  }).length;

  computation.completed = completed;
  computation.total = count;
  computation.progress = count > 0 ? completed / count : undefined;

  return computation;
}

const toMirrorSource = (
  value: unknown,
  metadata: MirrorColumnMetadata
): ContextRecord | null => {
  if (isRecord(value)) {
    return value;
  }

  const connections = extractConnections(value);
  const connection = selectConnection(connections, metadata);
  if (!connection) {
    return null;
  }

  if (connection.mirrorFields && isRecord(connection.mirrorFields)) {
    return connection.mirrorFields;
  }

  if (connection.fields && isRecord(connection.fields)) {
    return connection.fields;
  }

  const fallback: ContextRecord = {
    id: connection.recordId,
    title: connection.recordTitle,
    status: connection.status,
  };

  return fallback;
};

export function hydrateMirrorData(
  source: ContextRecord | TaskConnectionSummary[] | { connections?: TaskConnectionSummary[] } | null | undefined,
  metadata: MirrorColumnMetadata
): ContextRecord {
  const base = toMirrorSource(source, metadata);

  if (!base) {
    return {};
  }

  const result: ContextRecord = {};
  for (const field of metadata.displayFields ?? []) {
    result[field] = getValueByPath(base, field);
  }
  return result;
}

export function buildConnectionPayload(
  connections: unknown,
  metadata: ConnectColumnMetadata
): { targetBoardId: string; ids: string[]; allowMultiple: boolean } {
  const ids = Array.isArray(connections)
    ? connections
        .map((value) => {
          if (typeof value === "string") {
            return value;
          }
          if (value && typeof value === "object" && "id" in value) {
            return String((value as { id: unknown }).id);
          }
          return null;
        })
        .filter((value): value is string => Boolean(value))
    : [];

  return {
    targetBoardId: metadata.targetBoardId,
    ids,
    allowMultiple: metadata.allowMultiple,
  };
}
