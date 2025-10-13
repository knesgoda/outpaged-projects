import type { PlanExecutionContext } from "./types";

import type {
  FieldMaskRule,
  HistoryLog,
  HistorySegment,
  MaterializedHistory,
  MaterializedRow,
  RepositoryRow,
} from "../repository";

import { ensureArray } from "./runtime";

function applyFieldMask(
  values: Record<string, unknown>,
  rules: Record<string, FieldMaskRule>,
  context: PlanExecutionContext
) {
  const masked: string[] = [];
  const result: Record<string, unknown> = { ...values };
  for (const [field, rule] of Object.entries(rules)) {
    if (!rule.required || context.principal.permissions.includes(rule.required)) {
      continue;
    }
    masked.push(field);
    result[field] = rule.mask ?? null;
  }
  return { values: result, masked };
}

export function materializeRepositoryRow(row: RepositoryRow, context: PlanExecutionContext): MaterializedRow | null {
  if (!context.principal.allowAll) {
    const required = ensureArray(row.permissions?.required);
    if (required.length) {
      const perms = new Set(context.principal.permissions);
      if (!required.every((perm) => perms.has(perm))) {
        return null;
      }
    }
  }

  const masked = row.permissions?.fieldMasks
    ? applyFieldMask(row.values, row.permissions.fieldMasks, context)
    : { values: row.values, masked: [] };

  return {
    entityId: row.entityId,
    entityType: row.entityType,
    workspaceId: row.workspaceId,
    score: row.score,
    values: masked.values,
    maskedFields: masked.masked,
    history: buildHistoryTimeline(row.history),
  };
}

export function materializeRows(rows: RepositoryRow[], context: PlanExecutionContext): MaterializedRow[] {
  const output: MaterializedRow[] = [];
  for (const row of rows) {
    const materialized = materializeRepositoryRow(row, context);
    if (materialized) {
      output.push(materialized);
    }
  }
  return output;
}

function buildHistoryTimeline(log: HistoryLog | undefined): MaterializedHistory | undefined {
  if (!log) return undefined;

  const segments: Record<string, HistorySegment[]> = {};
  const active = new Map<string, HistorySegment>();

  const sortedEvents = [...log.events]
    .map((event) => ({
      at: event.at,
      actor: event.actor,
      changes: event.changes.map((change) => ({
        field: change.field,
        from: change.from,
        to: change.to,
      })),
    }))
    .sort((left, right) => Date.parse(left.at) - Date.parse(right.at));

  const ensureSegments = (field: string) => {
    const key = field.toLowerCase();
    if (!segments[key]) {
      segments[key] = [];
    }
    return segments[key]!;
  };

  const startSegment = (field: string, segment: HistorySegment) => {
    const key = field.toLowerCase();
    const list = ensureSegments(key);
    list.push(segment);
    active.set(key, segment);
  };

  if (log.initial?.values) {
    const startIso = log.initial.at ? new Date(log.initial.at).toISOString() : null;
    for (const [field, value] of Object.entries(log.initial.values)) {
      startSegment(field, {
        field: field.toLowerCase(),
        value,
        start: startIso,
        end: null,
        actor: log.initial.actor,
        changedAt: startIso,
      });
    }
  }

  for (const event of sortedEvents) {
    const eventTime = new Date(event.at);
    const eventIso = eventTime.toISOString();
    for (const change of event.changes) {
      const key = change.field.toLowerCase();
      const current = active.get(key);
      if (current) {
        current.end = eventIso;
      } else if (change.from !== undefined) {
        ensureSegments(key).push({
          field: key,
          value: change.from,
          start: null,
          end: eventIso,
          actor: undefined,
          changedAt: null,
        });
      }

      startSegment(key, {
        field: key,
        value: change.to ?? null,
        start: eventIso,
        end: null,
        actor: event.actor,
        changedAt: eventIso,
      });
    }
  }

  return { events: sortedEvents, segments } satisfies MaterializedHistory;
}

