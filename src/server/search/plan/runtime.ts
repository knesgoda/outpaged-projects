import { performance } from "node:perf_hooks";

import {
  type Expression,
  type FunctionExpression,
  type IdentifierExpression,
  formatExpression,
} from "@/lib/opql/parser";

import type { MaterializedRow } from "../repository";

import type { LogicalPlan, PlanExecutionContext, RuntimeRow } from "./types";

interface CursorPayload {
  id: string;
  order: unknown[];
}

export function timeStage<T>(context: PlanExecutionContext, name: string, fn: () => T): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    const duration = performance.now() - start;
    context.metrics.stages.push({ name, duration });
  }
}

export function timeStageAsync<T>(context: PlanExecutionContext, name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  return fn().finally(() => {
    const duration = performance.now() - start;
    context.metrics.stages.push({ name, duration });
  });
}

export function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

export function cloneRuntimeRow(row: RuntimeRow): RuntimeRow {
  const cloned: RuntimeRow = {
    base: row.base ? cloneMaterializedRow(row.base) : null,
    aliases: {},
    computed: { ...row.computed },
    maskedFields: new Set(row.maskedFields),
  };
  for (const [alias, value] of Object.entries(row.aliases)) {
    cloned.aliases[alias] = value ? cloneMaterializedRow(value) : null;
  }
  return cloned;
}

function cloneMaterializedRow(row: MaterializedRow): MaterializedRow {
  return {
    entityId: row.entityId,
    entityType: row.entityType,
    workspaceId: row.workspaceId,
    score: row.score,
    values: { ...row.values },
    maskedFields: [...row.maskedFields],
  };
}

export function compareValues(left: unknown, right: unknown): number {
  if (left === right) return 0;
  if (left === undefined || left === null) return right === undefined || right === null ? 0 : -1;
  if (right === undefined || right === null) return 1;

  if (typeof left === "number" && typeof right === "number") {
    return left === right ? 0 : left < right ? -1 : 1;
  }

  const leftTime = maybeTimestamp(left);
  const rightTime = maybeTimestamp(right);
  if (leftTime !== undefined && rightTime !== undefined) {
    return leftTime === rightTime ? 0 : leftTime < rightTime ? -1 : 1;
  }

  const leftString = String(left).toLowerCase();
  const rightString = String(right).toLowerCase();
  if (leftString < rightString) return -1;
  if (leftString > rightString) return 1;
  return 0;
}

function maybeTimestamp(value: unknown): number | undefined {
  if (value instanceof Date) {
    return value.getTime();
  }
  if (typeof value === "string" && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/u.test(value)) {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

export function evaluateBoolean(expression: Expression, row: RuntimeRow, context: PlanExecutionContext): boolean {
  const value = evaluateValue(expression, row, context);
  if (typeof value === "boolean") return value;
  return Boolean(value);
}

export function evaluateValue(expression: Expression, row: RuntimeRow, context: PlanExecutionContext): unknown {
  switch (expression.kind) {
    case "literal":
      return expression.value;
    case "identifier":
      return evaluateIdentifier(expression, row, context);
    case "binary": {
      const left = evaluateValue(expression.left, row, context);
      const right = evaluateValue(expression.right, row, context);
      return evaluateBinary(expression.operator, left, right);
    }
    case "unary": {
      if (expression.operator === "NOT") {
        return !evaluateBoolean(expression.operand, row, context);
      }
      if (expression.operator === "-") {
        const value = evaluateValue(expression.operand, row, context);
        return typeof value === "number" ? -value : value;
      }
      return undefined;
    }
    case "between": {
      const value = evaluateValue(expression.value, row, context);
      const lower = evaluateValue(expression.lower, row, context);
      const upper = evaluateValue(expression.upper, row, context);
      const comparison = compareValues(lower, value) <= 0 && compareValues(value, upper) <= 0;
      return expression.negated ? !comparison : comparison;
    }
    case "in": {
      const value = evaluateValue(expression.value, row, context);
      const options = expression.options.map((option) => evaluateValue(option, row, context));
      const match = options.some((option) => compareValues(option, value) === 0);
      return expression.negated ? !match : match;
    }
    case "function":
      return evaluateFunction(expression, row, context);
    case "history":
    case "temporal":
    case "date_math":
    case "duration":
      return undefined;
    default:
      return undefined;
  }
}

function evaluateIdentifier(
  expression: IdentifierExpression,
  row: RuntimeRow,
  context: PlanExecutionContext
): unknown {
  const name = expression.name;
  if (name === "*") {
    return row.base?.values;
  }
  if (!expression.path?.length) {
    const computed = row.computed[name];
    if (computed !== undefined) {
      return computed;
    }
    const primary = row.aliases[normalizeAlias(context.rootAlias)] ?? row.base;
    const fromBase = primary ? lookupFieldValue(primary, name) : undefined;
    if (fromBase !== undefined) {
      return fromBase;
    }
    for (const alias of Object.keys(row.aliases)) {
      const aliasRow = row.aliases[alias];
      if (!aliasRow) continue;
      const value = lookupFieldValue(aliasRow, name);
      if (value !== undefined) {
        return value;
      }
    }
    return undefined;
  }

  const alias = normalizeAlias(name);
  const scoped = alias === normalizeAlias(context.rootAlias)
    ? row.aliases[alias] ?? row.base
    : row.aliases[alias] ?? null;
  if (!scoped) return undefined;

  return expression.path.reduce<unknown>((current, segment) => {
    if (current === undefined || current === null) return undefined;
    if (typeof current !== "object") return undefined;
    const record = current as Record<string, unknown>;
    const direct = record[segment];
    if (direct !== undefined) return direct;
    const lower = record[segment.toLowerCase()];
    return lower;
  }, lookupFieldValue(scoped, expression.path[0]!));
}

function lookupFieldValue(row: MaterializedRow, name: string): unknown {
  if (name === "id" || name === "entity_id") {
    return row.entityId;
  }
  if (name === "entityId") {
    return row.entityId;
  }
  if (name === "type" || name === "entity_type") {
    return row.entityType;
  }
  if (name === "workspace_id") {
    return row.workspaceId;
  }
  if (name === "score") {
    return row.score;
  }
  if (Object.prototype.hasOwnProperty.call(row.values, name)) {
    return row.values[name];
  }
  const lower = name.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(row.values, lower)) {
    return row.values[lower];
  }
  return undefined;
}

export function normalizeAlias(alias: string): string {
  return alias.toLowerCase();
}

function evaluateBinary(operator: string, left: unknown, right: unknown): unknown {
  switch (operator) {
    case "AND":
      return Boolean(left) && Boolean(right);
    case "OR":
      return Boolean(left) || Boolean(right);
    case "=":
    case "==":
      return compareValues(left, right) === 0;
    case "!=":
    case "<>":
      return compareValues(left, right) !== 0;
    case ">":
      return compareValues(left, right) > 0;
    case ">=":
      return compareValues(left, right) >= 0;
    case "<":
      return compareValues(left, right) < 0;
    case "<=":
      return compareValues(left, right) <= 0;
    case "LIKE":
    case "ILIKE": {
      if (typeof left !== "string" || typeof right !== "string") return false;
      const pattern = right.replace(/%/g, "").toLowerCase();
      return left.toLowerCase().includes(pattern);
    }
    case "CONTAINS": {
      if (typeof left === "string" && typeof right === "string") {
        return left.toLowerCase().includes(right.toLowerCase());
      }
      if (Array.isArray(left)) {
        return left.some((item) => String(item).toLowerCase() === String(right).toLowerCase());
      }
      return false;
    }
    default:
      return undefined;
  }
}

function evaluateFunction(expression: FunctionExpression, row: RuntimeRow, context: PlanExecutionContext): unknown {
  const name = expression.name.toLowerCase();
  if (name === "contains" && expression.args.length >= 2) {
    const haystack = evaluateValue(expression.args[0]!, row, context);
    const needles = expression.args.slice(1).map((arg) => evaluateValue(arg, row, context));
    const normalizedHaystack = Array.isArray(haystack)
      ? haystack.map((value) => String(value).toLowerCase())
      : String(haystack ?? "").toLowerCase();
    return needles.every((needle) => {
      const value = String(needle ?? "").toLowerCase();
      if (Array.isArray(normalizedHaystack)) {
        return normalizedHaystack.includes(value);
      }
      return normalizedHaystack.includes(value);
    });
  }
  if (name === "match" && expression.args.length === 2) {
    const field = evaluateValue(expression.args[0]!, row, context);
    const target = evaluateValue(expression.args[1]!, row, context);
    return String(field ?? "").toLowerCase().includes(String(target ?? "").toLowerCase());
  }
  if (name === "array") {
    return expression.args.map((arg) => evaluateValue(arg, row, context));
  }
  const formatted = formatExpression(expression);
  if (Object.prototype.hasOwnProperty.call(row.computed, formatted)) {
    return row.computed[formatted];
  }
  return undefined;
}

export function decodeCursor(cursor: string | undefined): CursorPayload | undefined {
  if (!cursor) return undefined;
  try {
    const json = Buffer.from(cursor, "base64").toString("utf8");
    const parsed = JSON.parse(json) as CursorPayload;
    if (parsed && typeof parsed.id === "string" && Array.isArray(parsed.order)) {
      return parsed;
    }
    return undefined;
  } catch (_error) {
    return undefined;
  }
}

export function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

export function compareByOrder(left: RuntimeRow, right: RuntimeRow, order: OrderFieldResolver[]): number {
  for (const field of order) {
    const direction = field.direction === "DESC" ? -1 : 1;
    const leftValue = field.resolve(left);
    const rightValue = field.resolve(right);
    const comparison = compareValues(leftValue, rightValue);
    if (comparison !== 0) {
      return comparison * direction;
    }
  }
  const leftId = getPrimaryIdentifier(left);
  const rightId = getPrimaryIdentifier(right);
  return leftId.localeCompare(rightId);
}

export interface OrderFieldResolver {
  direction: "ASC" | "DESC";
  resolve(row: RuntimeRow): unknown;
}

export function buildOrderResolver(order: OrderFieldResolver[]): OrderFieldResolver[] {
  if (!order.length) {
    return [
      {
        direction: "DESC",
        resolve: (row) => row.base?.score ?? 0,
      },
      {
        direction: "ASC",
        resolve: (row) => getPrimaryIdentifier(row),
      },
    ];
  }
  return order;
}

export function buildOrderValues(row: RuntimeRow, order: OrderFieldResolver[]): unknown[] {
  if (!order.length) {
    return [row.base?.score ?? 0, getPrimaryIdentifier(row)];
  }
  const values = order.map((entry) => entry.resolve(row));
  values.push(getPrimaryIdentifier(row));
  return values;
}

export function findCursorIndex(rows: RuntimeRow[], cursor: CursorPayload, order: OrderFieldResolver[]): number {
  return rows.findIndex((row) => {
    const values = buildOrderValues(row, order);
    for (let index = 0; index < cursor.order.length; index += 1) {
      const comparison = compareValues(values[index], cursor.order[index]);
      if (comparison !== 0) {
        return false;
      }
    }
    return getPrimaryIdentifier(row) === cursor.id;
  });
}

export function getPrimaryIdentifier(row: RuntimeRow): string {
  if (row.base) {
    return row.base.entityId;
  }
  const firstAlias = Object.values(row.aliases).find((alias) => Boolean(alias));
  if (firstAlias) {
    return firstAlias.entityId;
  }
  return JSON.stringify(row.computed);
}

export function mergeMaskedFields(target: RuntimeRow, source: MaterializedRow | null | undefined) {
  if (!source) return;
  source.maskedFields.forEach((field) => target.maskedFields.add(field));
}

export interface StageAwarePlan<T> extends LogicalPlan<T> {
  stage: string;
}

export function describe<T>(plan: LogicalPlan<T>, name: string): string[] {
  return [...plan.describe(), name];
}

export function formatProjectionName(expression: Expression): string {
  return formatExpression(expression);
}

export function attachAlias(row: RuntimeRow, alias: string, materialized: MaterializedRow | null): RuntimeRow {
  const cloned = cloneRuntimeRow(row);
  cloned.aliases[normalizeAlias(alias)] = materialized ? cloneMaterializedRow(materialized) : null;
  if (!cloned.base && materialized) {
    cloned.base = cloneMaterializedRow(materialized);
  }
  mergeMaskedFields(cloned, materialized ?? undefined);
  return cloned;
}

export function createRuntimeRow(row: MaterializedRow, alias: string): RuntimeRow {
  return {
    base: cloneMaterializedRow(row),
    aliases: { [normalizeAlias(alias)]: cloneMaterializedRow(row) },
    computed: {},
    maskedFields: new Set(row.maskedFields),
  };
}

export function createEmptyRuntimeRow(): RuntimeRow {
  return {
    base: null,
    aliases: {},
    computed: {},
    maskedFields: new Set(),
  };
}

export function setComputed(row: RuntimeRow, key: string, value: unknown): void {
  row.computed[key] = value;
}

