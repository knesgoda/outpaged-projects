import type { BoardFilterCondition, BoardFilterDefinition, BoardFilterGroup } from "./types";

function normalizeString(value: unknown): string {
  if (typeof value === "string") return value.toLowerCase();
  if (typeof value === "number" || typeof value === "boolean") return String(value).toLowerCase();
  if (value instanceof Date) return value.toISOString().toLowerCase();
  return "";
}

function parseRelativeDate(value: string | undefined | null): { from?: Date; to?: Date; predicate?: (date: Date) => boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (value) {
    case "today":
      return { from: today, to: today };
    case "tomorrow": {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return { from: tomorrow, to: tomorrow };
    }
    case "yesterday": {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return { from: yesterday, to: yesterday };
    }
    case "this_week": {
      const start = new Date(today);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: start, to: end };
    }
    case "next_week": {
      const start = new Date(today);
      start.setDate(start.getDate() - start.getDay() + 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: start, to: end };
    }
    case "last_week": {
      const start = new Date(today);
      start.setDate(start.getDate() - start.getDay() - 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return { from: start, to: end };
    }
    case "overdue":
      return {
        predicate: (date) => date.getTime() < today.getTime(),
      };
    default:
      return {};
  }
}

interface EvaluationContext {
  currentUserId?: string | null;
}

const collectUniqueStrings = (values: unknown[]): string[] => {
  const result = new Set<string>();
  values.forEach((value) => {
    if (typeof value === "string" && value.trim()) {
      result.add(value);
    }
  });
  return Array.from(result);
};

const collectProjectFields = (item: Record<string, any>): string[] => {
  const candidates: unknown[] = [];
  if (typeof item.project_id === "string") candidates.push(item.project_id);
  if (typeof item.projectId === "string") candidates.push(item.projectId);
  if (Array.isArray(item.projectIds)) candidates.push(...item.projectIds);

  if (item.project && typeof item.project === "object") {
    const project = item.project as Record<string, unknown>;
    candidates.push(project.id, project.key, project.code, project.name);
  }

  return collectUniqueStrings(candidates);
};

const collectComponentFields = (item: Record<string, any>): string[] => {
  const candidates: unknown[] = [];
  if (Array.isArray(item.componentIds)) candidates.push(...item.componentIds);
  if (Array.isArray(item.components)) candidates.push(...item.components);
  if (Array.isArray(item.component_names)) candidates.push(...item.component_names);
  if (typeof item.component === "string") candidates.push(item.component);
  if (typeof item.components_text === "string") candidates.push(...item.components_text.split(/[,\s]+/));
  return collectUniqueStrings(candidates);
};

const collectVersionFields = (item: Record<string, any>): string[] => {
  const candidates: unknown[] = [];
  if (Array.isArray(item.versionIds)) candidates.push(...item.versionIds);
  if (Array.isArray(item.fixVersions)) candidates.push(...item.fixVersions);
  if (Array.isArray(item.versions)) candidates.push(...item.versions);
  if (typeof item.version === "string") candidates.push(item.version);
  return collectUniqueStrings(candidates);
};

const collectRelationFields = (
  item: Record<string, any>,
  meta: BoardFilterCondition["meta"]
): string[] => {
  const relationType = typeof meta?.relationType === "string" ? meta.relationType.toLowerCase() : null;
  const direction = typeof meta?.direction === "string" ? meta.direction.toLowerCase() : null;
  const values: unknown[] = [];

  const pushRelation = (entry: any) => {
    if (!entry) return;
    values.push(entry.id, entry.recordId, entry.relatedTaskId, entry.relatedTaskTitle, entry.recordTitle);
    if (typeof entry === "string") values.push(entry);
  };

  if (!relationType || relationType === "parent") {
    pushRelation({ id: item.parent_id ?? item.parentId });
    if (item.parent && typeof item.parent === "object") {
      pushRelation({
        id: (item.parent as Record<string, unknown>).id,
        relatedTaskTitle: (item.parent as Record<string, unknown>).title,
      });
    }
  }

  if (!relationType || relationType === "child") {
    const children = Array.isArray(item.subitems) ? item.subitems : Array.isArray(item.children) ? item.children : [];
    children.forEach((child: any) => pushRelation(child));
  }

  const relations = Array.isArray(item.relations) ? item.relations : [];
  relations.forEach((relation: any) => {
    if (relationType && typeof relation.type === "string" && relation.type.toLowerCase() !== relationType) {
      return;
    }
    if (direction && typeof relation.direction === "string" && relation.direction.toLowerCase() !== direction) {
      return;
    }
    pushRelation(relation);
  });

  const connections = Array.isArray(item.connections) ? item.connections : [];
  connections.forEach((connection: any) => {
    if (relationType && typeof connection.relationshipName === "string" && connection.relationshipName.toLowerCase() !== relationType) {
      return;
    }
    pushRelation(connection);
  });

  return collectUniqueStrings(values);
};

const resolveFilterValue = (
  condition: BoardFilterCondition,
  item: Record<string, any>
): unknown => {
  switch (condition.field) {
    case "project":
      return collectProjectFields(item);
    case "component":
      return collectComponentFields(item);
    case "version":
      return collectVersionFields(item);
    case "relation":
      return collectRelationFields(item, condition.meta);
    default:
      return item[condition.field];
  }
};

function evaluateCondition(
  condition: BoardFilterCondition,
  item: Record<string, any>,
  context: EvaluationContext
): boolean {
  const value = resolveFilterValue(condition, item);
  const normalizedValue = Array.isArray(value)
    ? value.map(normalizeString)
    : normalizeString(value);

  switch (condition.operator) {
    case "is":
      if (condition.field === "assignee" && condition.value === "me") {
        const me = context.currentUserId ? context.currentUserId.toLowerCase() : "";
        if (!me) return false;
        if (Array.isArray(value)) {
          return value.some((entry) => normalizeString(entry) === me);
        }
        return normalizeString(value) === me;
      }
      if (Array.isArray(value)) {
        return value.some((entry) => normalizeString(entry) === normalizeString(condition.value));
      }
      return normalizeString(value) === normalizeString(condition.value);
    case "is_not":
      if (condition.field === "assignee" && condition.value === "me") {
        const me = context.currentUserId ? context.currentUserId.toLowerCase() : "";
        if (!me) return true;
        if (Array.isArray(value)) {
          return !value.some((entry) => normalizeString(entry) === me);
        }
        return normalizeString(value) !== me;
      }
      if (Array.isArray(value)) {
        return !value.some((entry) => normalizeString(entry) === normalizeString(condition.value));
      }
      return normalizeString(value) !== normalizeString(condition.value);
    case "contains":
      if (Array.isArray(value)) {
        return value.some((entry) => normalizeString(entry).includes(normalizeString(condition.value)));
      }
      return normalizedValue.includes(normalizeString(condition.value));
    case "not_contains":
      if (Array.isArray(value)) {
        return !value.some((entry) => normalizeString(entry).includes(normalizeString(condition.value)));
      }
      return !normalizedValue.includes(normalizeString(condition.value));
    case "in": {
      const candidates = Array.isArray(condition.value)
        ? condition.value
        : String(condition.value ?? "").split(",");
      const normalizedCandidates = candidates.map(normalizeString);
      if (Array.isArray(value)) {
        return value.some((entry) => normalizedCandidates.includes(normalizeString(entry)));
      }
      return normalizedCandidates.includes(normalizeString(value));
    }
    case "not_in": {
      const candidates = Array.isArray(condition.value)
        ? condition.value
        : String(condition.value ?? "").split(",");
      const normalizedCandidates = candidates.map(normalizeString);
      if (Array.isArray(value)) {
        return !value.some((entry) => normalizedCandidates.includes(normalizeString(entry)));
      }
      return !normalizedCandidates.includes(normalizeString(value));
    }
    case "regex": {
      if (!condition.value) return true;
      try {
        const regex = new RegExp(String(condition.value), "i");
        if (Array.isArray(value)) {
          return value.some((entry) => regex.test(String(entry)));
        }
        return regex.test(String(value ?? ""));
      } catch (error) {
        console.warn("Invalid regex filter", error);
        return true;
      }
    }
    case "relative_date": {
      const range = parseRelativeDate(typeof condition.value === "string" ? condition.value : undefined);
      if (!value) return false;
      const date = new Date(value as any);
      if (Number.isNaN(date.getTime())) {
        return false;
      }
      if (range.predicate) {
        return range.predicate(date);
      }
      if (range.from && date.getTime() < range.from.getTime()) {
        return false;
      }
      if (range.to && date.getTime() > range.to.getTime() + 24 * 60 * 60 * 1000 - 1) {
        return false;
      }
      return true;
    }
    case "is_empty":
      if (Array.isArray(value)) {
        return value.length === 0;
      }
      return value == null || value === "";
    case "is_not_empty":
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value != null && value !== "";
    default:
      return true;
  }
}

function evaluateGroup(group: BoardFilterGroup, item: Record<string, any>, context: EvaluationContext): boolean {
  const conditionResults = group.conditions.map((condition) => evaluateCondition(condition, item, context));
  const childResults = group.children.map((child) => evaluateGroup(child, item, context));
  const results = [...conditionResults, ...childResults];

  if (results.length === 0) {
    return true;
  }

  if (group.join === "AND") {
    return results.every(Boolean);
  }
  return results.some(Boolean);
}

export function matchesBoardFilter(
  definition: BoardFilterDefinition | null | undefined,
  item: Record<string, any>,
  context: EvaluationContext = {}
): boolean {
  if (!definition?.root) {
    return true;
  }
  return evaluateGroup(definition.root, item, context);
}
