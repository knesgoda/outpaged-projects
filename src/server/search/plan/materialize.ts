import type { PlanExecutionContext } from "./types";

import type { FieldMaskRule, MaterializedRow, RepositoryRow } from "../repository";

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

