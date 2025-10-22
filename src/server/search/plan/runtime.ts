import { performance } from "node:perf_hooks";

import {
  type ComparisonOperator,
  type Expression,
  type FunctionExpression,
  type HistoryPredicateExpression,
  type HistoryQualifier,
  type IdentifierExpression,
  formatExpression,
} from "@/lib/opql/parser";

import type { HistorySegment, MaterializedHistory, MaterializedRow } from "../repository";

import type {
  HistoryScanSegment,
  LogicalPlan,
  PlanExecutionContext,
  RuntimeRow,
} from "./types";

const MIN_TEMPORAL_BOUND = new Date(-8.64e15);
const MAX_TEMPORAL_BOUND = new Date(8.64e15);

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
    history: cloneHistory(row.history),
  };
}

function cloneHistory(history: MaterializedHistory | undefined): MaterializedHistory | undefined {
  if (!history) return undefined;
  const clonedSegments: Record<string, HistorySegment[]> = {};
  for (const [field, list] of Object.entries(history.segments)) {
    clonedSegments[field] = list.map((segment) => ({ ...segment }));
  }
  return {
    events: history.events.map((event) => ({
      at: event.at,
      actor: event.actor,
      changes: event.changes.map((change) => ({
        field: change.field,
        from: change.from,
        to: change.to,
      })),
    })),
    segments: clonedSegments,
  } satisfies MaterializedHistory;
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
      return evaluateHistory(expression, row, context);
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

  return expression.path.reduce((current, segment) => {
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

interface ReducedHistoryEvent {
  at: string;
  actor?: string;
  changes: Array<{ from?: unknown; to?: unknown }>;
}

function evaluateHistory(
  expression: HistoryPredicateExpression,
  row: RuntimeRow,
  context: PlanExecutionContext
): boolean {
  const resolved = resolveHistorySource(expression.field, row, context);
  if (!resolved) return false;
  const timeline = resolved.materialized.history;
  if (!timeline) return false;

  const fieldKey = resolved.field.toLowerCase();
  const segments = timeline.segments[fieldKey] ?? [];
  const events: ReducedHistoryEvent[] = timeline.events
    .map((event) => ({
      at: event.at,
      actor: event.actor,
      changes: event.changes
        .filter((change) => change.field.toLowerCase() === fieldKey)
        .map((change) => ({ from: change.from, to: change.to })),
    }))
    .filter((event) => event.changes.length > 0);

  let matched = false;
  let scanned: HistoryScanSegment[] = [];

  if (expression.verb === "WAS") {
    const withQualifiers = applySegmentQualifiers(segments, expression.qualifiers, row, context);
    const { segments: comparableSegments, comparator } = applyHistoryComparison(
      withQualifiers,
      expression.comparison,
      row,
      context
    );
    matched = comparator
      ? comparableSegments.some((segment) => comparator(segment))
      : comparableSegments.length > 0;
    scanned = comparableSegments.map((segment) => ({
      start: segment.start,
      end: segment.end,
      value: segment.value,
      actor: segment.actor,
      changedAt: segment.changedAt,
    }));
  } else {
    const filteredEvents = applyEventQualifiers(events, expression.qualifiers, row, context);
    matched = filteredEvents.length > 0;
    scanned = filteredEvents.flatMap((event) =>
      event.changes.map((change) => ({
        start: event.at,
        end: event.at,
        value: change.to ?? null,
        from: change.from ?? null,
        to: change.to ?? null,
        actor: event.actor,
        changedAt: event.at,
      }))
    );
  }

  if (context.collectHistoryTrace) {
    context.historyTraces.push({
      entityId: resolved.materialized.entityId,
      entityType: resolved.materialized.entityType,
      alias: resolved.alias,
      field: resolved.field,
      verb: expression.verb,
      qualifiers: expression.qualifiers.map(formatHistoryQualifier),
      matched,
      segments: scanned,
    });
  }

  return matched;
}

function resolveHistorySource(
  expression: Expression,
  row: RuntimeRow,
  context: PlanExecutionContext
): { alias: string; field: string; materialized: MaterializedRow } | undefined {
  if (expression.kind !== "identifier") {
    return undefined;
  }

  if (expression.path?.length) {
    const alias = normalizeAlias(expression.name);
    const materialized = row.aliases[alias];
    if (!materialized) return undefined;
    const field = expression.path[expression.path.length - 1]!;
    return { alias, field, materialized };
  }

  const alias = normalizeAlias(context.rootAlias);
  const materialized = row.aliases[alias] ?? row.base;
  if (!materialized) return undefined;
  return { alias, field: expression.name, materialized };
}

function applySegmentQualifiers(
  segments: HistorySegment[],
  qualifiers: HistoryQualifier[],
  row: RuntimeRow,
  context: PlanExecutionContext
): HistorySegment[] {
  if (!segments.length) return [];

  const actors = new Set<string>();
  let requireActor = false;
  let after: Date | undefined;
  let before: Date | undefined;
  let onRange: { start: Date; end: Date } | undefined;
  let during: { start: Date; end: Date } | undefined;

  for (const qualifier of qualifiers) {
    switch (qualifier.type) {
      case "BY": {
        const values = normalizeQualifierValues(qualifier.value, row, context);
        if (values.length) {
          requireActor = true;
          values.forEach((value) => actors.add(value));
        }
        break;
      }
      case "AFTER": {
        const date = parseDateValue(evaluateValue(qualifier.value, row, context), context);
        if (date && (!after || date > after)) {
          after = date;
        }
        break;
      }
      case "BEFORE": {
        const date = parseDateValue(evaluateValue(qualifier.value, row, context), context);
        if (date && (!before || date < before)) {
          before = date;
        }
        break;
      }
      case "ON": {
        const date = parseDateValue(evaluateValue(qualifier.value, row, context), context);
        if (date) {
          onRange = computeDayRange(date, context);
        }
        break;
      }
      case "DURING": {
        const start = parseDateValue(evaluateValue(qualifier.start, row, context), context);
        const end = parseDateValue(evaluateValue(qualifier.end, row, context), context);
        if (start && end && start <= end) {
          if (!during) {
            during = { start, end };
          } else {
            during = {
              start: start > during.start ? start : during.start,
              end: end < during.end ? end : during.end,
            };
          }
        }
        break;
      }
      default:
        break;
    }
  }

  let filtered = segments.slice();

  if (requireActor) {
    filtered = filtered.filter((segment) => {
      if (!segment.actor) return false;
      return actors.has(String(segment.actor).toLowerCase());
    });
  }
  if (after) {
    filtered = filtered.filter((segment) => {
      const changedAt = parseDateString(segment.changedAt ?? segment.start);
      return changedAt ? changedAt >= after! : false;
    });
  }
  if (before) {
    filtered = filtered.filter((segment) => {
      const changedAt = parseDateString(segment.changedAt ?? segment.start);
      return changedAt ? changedAt <= before! : false;
    });
  }
  if (onRange) {
    filtered = filtered.filter((segment) => {
      const changedAt = parseDateString(segment.changedAt ?? segment.start);
      return changedAt ? changedAt >= onRange.start && changedAt <= onRange.end : false;
    });
  }
  if (during) {
    filtered = filtered.filter((segment) => {
      const start = parseDateString(segment.start) ?? MIN_TEMPORAL_BOUND;
      const end = parseDateString(segment.end) ?? MAX_TEMPORAL_BOUND;
      return rangesIntersect(start, end, during!.start, during!.end);
    });
  }

  return filtered;
}

function applyEventQualifiers(
  events: ReducedHistoryEvent[],
  qualifiers: HistoryQualifier[],
  row: RuntimeRow,
  context: PlanExecutionContext
): ReducedHistoryEvent[] {
  if (!events.length) return [];
  let current = events.map((event) => ({
    at: event.at,
    actor: event.actor,
    changes: event.changes.map((change) => ({ from: change.from, to: change.to })),
  }));

  const actors = new Set<string>();
  let requireActor = false;
  let after: Date | undefined;
  let before: Date | undefined;
  let onRange: { start: Date; end: Date } | undefined;
  let during: { start: Date; end: Date } | undefined;

  for (const qualifier of qualifiers) {
    switch (qualifier.type) {
      case "BY": {
        const values = normalizeQualifierValues(qualifier.value, row, context);
        if (values.length) {
          requireActor = true;
          values.forEach((value) => actors.add(value));
        }
        break;
      }
      case "AFTER": {
        const date = parseDateValue(evaluateValue(qualifier.value, row, context), context);
        if (date && (!after || date > after)) {
          after = date;
        }
        break;
      }
      case "BEFORE": {
        const date = parseDateValue(evaluateValue(qualifier.value, row, context), context);
        if (date && (!before || date < before)) {
          before = date;
        }
        break;
      }
      case "ON": {
        const date = parseDateValue(evaluateValue(qualifier.value, row, context), context);
        if (date) {
          onRange = computeDayRange(date, context);
        }
        break;
      }
      case "DURING": {
        const start = parseDateValue(evaluateValue(qualifier.start, row, context), context);
        const end = parseDateValue(evaluateValue(qualifier.end, row, context), context);
        if (start && end && start <= end) {
          if (!during) {
            during = { start, end };
          } else {
            during = {
              start: start > during.start ? start : during.start,
              end: end < during.end ? end : during.end,
            };
          }
        }
        break;
      }
      case "TO": {
        const comparator = buildComparisonEvaluator(
          qualifier.operator,
          qualifier.value,
          qualifier.values,
          row,
          context
        );
        if (comparator) {
          current = current
            .map((event) => ({
              ...event,
              changes: event.changes.filter((change) => comparator(change.to ?? null)),
            }))
            .filter((event) => event.changes.length > 0);
        }
        break;
      }
      case "FROM": {
        const comparator = buildComparisonEvaluator(
          qualifier.operator,
          qualifier.value,
          qualifier.values,
          row,
          context
        );
        if (comparator) {
          current = current
            .map((event) => ({
              ...event,
              changes: event.changes.filter((change) => comparator(change.from ?? null)),
            }))
            .filter((event) => event.changes.length > 0);
        }
        break;
      }
      default:
        break;
    }
  }

  if (!current.length) {
    return [];
  }

  if (requireActor) {
    current = current.filter((event) => {
      if (!event.actor) return false;
      return actors.has(String(event.actor).toLowerCase());
    });
  }
  if (after) {
    current = current.filter((event) => {
      const at = parseDateString(event.at);
      return at ? at >= after! : false;
    });
  }
  if (before) {
    current = current.filter((event) => {
      const at = parseDateString(event.at);
      return at ? at <= before! : false;
    });
  }
  if (onRange) {
    current = current.filter((event) => {
      const at = parseDateString(event.at);
      return at ? at >= onRange.start && at <= onRange.end : false;
    });
  }
  if (during) {
    current = current.filter((event) => {
      const at = parseDateString(event.at);
      return at ? at >= during!.start && at <= during!.end : false;
    });
  }

  return current;
}

function createHistoryComparator(
  comparison: HistoryPredicateExpression["comparison"] | undefined,
  row: RuntimeRow,
  context: PlanExecutionContext
): ((value: unknown) => boolean) | undefined {
  if (!comparison) return undefined;
  if (comparison.value?.kind === "temporal") {
    return undefined;
  }
  return buildComparisonEvaluator(comparison.operator, comparison.value, comparison.values, row, context);
}

function applyHistoryComparison(
  segments: HistorySegment[],
  comparison: HistoryPredicateExpression["comparison"] | undefined,
  row: RuntimeRow,
  context: PlanExecutionContext
): { segments: HistorySegment[]; comparator?: (segment: HistorySegment) => boolean } {
  if (!comparison) {
    return { segments };
  }
  if (comparison.value?.kind === "temporal") {
    return createTemporalSegmentComparator(segments, comparison, row, context);
  }
  const valueComparator = createHistoryComparator(comparison, row, context);
  if (!valueComparator) {
    return { segments };
  }
  return {
    segments,
    comparator: (segment) => valueComparator(segment.value),
  };
}

function createTemporalSegmentComparator(
  segments: HistorySegment[],
  comparison: HistoryPredicateExpression["comparison"],
  row: RuntimeRow,
  context: PlanExecutionContext
): { segments: HistorySegment[]; comparator?: (segment: HistorySegment) => boolean } {
  const temporal = comparison.value;
  if (!temporal || temporal.kind !== "temporal") {
    return { segments };
  }

  const rangeStart = parseDateValue(evaluateValue(temporal.range.start, row, context), context);
  const rangeEnd = parseDateValue(evaluateValue(temporal.range.end, row, context), context);
  const windowStart = rangeStart ?? MIN_TEMPORAL_BOUND;
  const windowEnd = rangeEnd ?? MAX_TEMPORAL_BOUND;

  const rangedSegments = segments.filter((segment) => {
    const segmentStart = parseDateString(segment.start) ?? MIN_TEMPORAL_BOUND;
    const segmentEnd = parseDateString(segment.end) ?? MAX_TEMPORAL_BOUND;
    return rangesIntersect(segmentStart, segmentEnd, windowStart, windowEnd);
  });

  const comparator = buildComparisonEvaluator(
    comparison.operator,
    temporal.value,
    comparison.values,
    row,
    context
  );

  return {
    segments: rangedSegments,
    comparator: (segment) => comparator(segment.value),
  };
}

function buildComparisonEvaluator(
  operator: ComparisonOperator,
  value: Expression | undefined,
  values: Expression[] | undefined,
  row: RuntimeRow,
  context: PlanExecutionContext
): (candidate: unknown) => boolean {
  const evaluatedValue = value !== undefined ? evaluateValue(value, row, context) : undefined;
  const evaluatedOptions = values?.map((option) => evaluateValue(option, row, context)) ?? [];
  const options = evaluatedOptions.flatMap((option) => (Array.isArray(option) ? option : [option]));

  switch (operator) {
    case "=":
    case "IS":
      return (candidate) => compareValues(candidate, evaluatedValue) === 0;
    case "!=":
    case "<>":
    case "IS NOT":
      return (candidate) => compareValues(candidate, evaluatedValue) !== 0;
    case "IN":
      return (candidate) => options.some((option) => compareValues(option, candidate) === 0);
    case "NOT IN":
      return (candidate) => !options.some((option) => compareValues(option, candidate) === 0);
    case "IS EMPTY":
      return (candidate) => candidate === null || candidate === undefined || candidate === "";
    case "IS NOT EMPTY":
      return (candidate) => !(candidate === null || candidate === undefined || candidate === "");
    case "IS NULL":
      return (candidate) => candidate === null || candidate === undefined;
    case "IS NOT NULL":
      return (candidate) => !(candidate === null || candidate === undefined);
    default:
      return () => false;
  }
}

function normalizeQualifierValues(valueExpr: Expression, row: RuntimeRow, context: PlanExecutionContext): string[] {
  const evaluated = evaluateValue(valueExpr, row, context);
  const values = Array.isArray(evaluated) ? evaluated : ensureArray(evaluated);
  return values
    .map((value) => (value === undefined || value === null ? undefined : String(value).toLowerCase()))
    .filter((value): value is string => Boolean(value));
}

function parseDateValue(value: unknown, context: PlanExecutionContext): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed);
    }
  }
  return undefined;
}

function parseDateString(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return undefined;
  return new Date(parsed);
}

function computeDayRange(date: Date, context: PlanExecutionContext): { start: Date; end: Date } {
  const timezone = context.timezone;
  if (!timezone) {
    const start = new Date(date.getTime());
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime());
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value ?? "0");
  const month = Number(parts.find((part) => part.type === "month")?.value ?? "1");
  const day = Number(parts.find((part) => part.type === "day")?.value ?? "1");
  const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  return { start, end };
}

function rangesIntersect(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

function formatHistoryQualifier(qualifier: HistoryQualifier): string {
  switch (qualifier.type) {
    case "BY":
      return `BY ${formatExpression(qualifier.value)}`;
    case "AFTER":
      return `AFTER ${formatExpression(qualifier.value)}`;
    case "BEFORE":
      return `BEFORE ${formatExpression(qualifier.value)}`;
    case "ON":
      return `ON ${formatExpression(qualifier.value)}`;
    case "DURING":
      return `DURING (${formatExpression(qualifier.start)}, ${formatExpression(qualifier.end)})`;
    case "TO":
      if (qualifier.values) {
        return `TO (${qualifier.values.map((value) => formatExpression(value)).join(", ")})`;
      }
      return `TO ${qualifier.value ? formatExpression(qualifier.value) : ""}`.trim();
    case "FROM":
      if (qualifier.values) {
        return `FROM (${qualifier.values.map((value) => formatExpression(value)).join(", ")})`;
      }
      return `FROM ${qualifier.value ? formatExpression(qualifier.value) : ""}`.trim();
    default:
      return "";
  }
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

