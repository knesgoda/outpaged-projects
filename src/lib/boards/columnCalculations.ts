import type {
  ConnectColumnMetadata,
  MirrorColumnMetadata,
  RollupColumnMetadata,
} from "@/types/boardColumns";

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

const numericField = (record: ContextRecord, field: string): number | null => {
  const value = getValueByPath(record, field);
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export function calculateRollup(
  records: ContextRecord[],
  metadata: RollupColumnMetadata
): RollupComputation | null {
  if (!records.length) {
    return null;
  }

  const values = records
    .map((record) => numericField(record, metadata.targetField))
    .filter((value): value is number => value !== null);

  const count = records.length;
  if (metadata.aggregation === "count") {
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

  switch (metadata.aggregation) {
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
    const value = getValueByPath(record, metadata.targetField);
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

export function hydrateMirrorData(
  source: ContextRecord | null | undefined,
  metadata: MirrorColumnMetadata
): ContextRecord {
  if (!source) {
    return {};
  }

  const result: ContextRecord = {};
  for (const field of metadata.displayFields ?? []) {
    result[field] = getValueByPath(source, field);
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
