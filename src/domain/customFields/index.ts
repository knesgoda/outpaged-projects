import type { Json } from "@/integrations/supabase/types";

export type CustomFieldScope = "global" | "project";
export type CustomFieldType =
  | "text"
  | "number"
  | "single_select"
  | "multi_select"
  | "user"
  | "team"
  | "date"
  | "date_range"
  | "story_points"
  | "time_estimate"
  | "effort"
  | "risk"
  | "dependency"
  | "url"
  | "file"
  | "formula"
  | "rollup"
  | "mirror";

export type CustomFieldContext =
  | "tasks"
  | "boards"
  | "forms"
  | "reports"
  | "automations"
  | "items";

export interface CustomFieldGovernanceMetadata {
  managedBy?: "workspace" | "project" | "team";
  complianceTags?: string[];
  visibility?: "public" | "restricted" | "confidential";
  reviewCadenceDays?: number | null;
  auditTrailEnabled?: boolean;
  description?: string | null;
}

export interface CustomFieldOptionSetOption {
  id: string;
  label: string;
  description?: string | null;
  color?: string | null;
  isDefault?: boolean;
}

export interface CustomFieldOptionSet {
  id: string;
  options: CustomFieldOptionSetOption[];
  allowCustomOptions?: boolean;
}

export interface CustomFieldFormulaDefinition {
  expression: string;
  precision?: number;
  format?: "number" | "percent" | "currency";
}

export interface CustomFieldRollupDefinition {
  sourceFieldId: string;
  aggregation: "sum" | "avg" | "min" | "max" | "count";
  relationshipName?: string;
}

export interface CustomFieldMirrorDefinition {
  sourceFieldId: string;
  relationshipName?: string;
}

export interface CustomFieldConditionalRule {
  fieldId: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "not_contains"
    | "is_set"
    | "is_not_set";
  value?: unknown;
}

export interface CustomFieldDefinition {
  id: string;
  name: string;
  apiName: string;
  description?: string | null;
  scope: CustomFieldScope;
  projectId?: string | null;
  workspaceId?: string | null;
  fieldType: CustomFieldType;
  contexts: CustomFieldContext[];
  optionSet?: CustomFieldOptionSet | null;
  formula?: CustomFieldFormulaDefinition | null;
  rollup?: CustomFieldRollupDefinition | null;
  mirror?: CustomFieldMirrorDefinition | null;
  governance?: CustomFieldGovernanceMetadata | null;
  defaultValue?: unknown;
  isRequired?: boolean;
  isPrivate?: boolean;
  position?: number;
  conditionalRules?: CustomFieldConditionalRule[];
  createdAt?: string;
  updatedAt?: string;
}

export type CustomFieldValue = Json | null;

export interface CustomFieldUsageMetric {
  fieldId: string;
  fieldName: string;
  screens: string[];
  automations: string[];
  reports: string[];
  lastUsedAt?: string | null;
  usageCount: number;
}

export const isComputedField = (definition: CustomFieldDefinition): boolean =>
  definition.fieldType === "formula" ||
  definition.fieldType === "rollup" ||
  definition.fieldType === "mirror";

export const shouldFieldRender = (
  definition: CustomFieldDefinition,
  values: Record<string, unknown>,
): boolean => {
  if (!definition.conditionalRules?.length) {
    return true;
  }

  return definition.conditionalRules.every((rule) => {
    const targetValue = values[rule.fieldId];
    switch (rule.operator) {
      case "equals":
        return targetValue === rule.value;
      case "not_equals":
        return targetValue !== rule.value;
      case "contains":
        return Array.isArray(targetValue) && targetValue.includes(rule.value);
      case "not_contains":
        return !Array.isArray(targetValue) || !targetValue.includes(rule.value);
      case "is_set":
        return targetValue !== undefined && targetValue !== null && targetValue !== "";
      case "is_not_set":
        return targetValue === undefined || targetValue === null || targetValue === "";
      default:
        return true;
    }
  });
};

export const resolveDefaultValue = (definition: CustomFieldDefinition): unknown => {
  if (definition.defaultValue !== undefined) {
    return definition.defaultValue;
  }

  if (definition.optionSet) {
    const defaults = definition.optionSet.options.filter((option) => option.isDefault);
    if (definition.fieldType === "multi_select") {
      return defaults.map((option) => option.id);
    }
    if (defaults[0]) {
      return defaults[0].id;
    }
  }

  switch (definition.fieldType) {
    case "text":
    case "url":
      return "";
    case "number":
    case "story_points":
    case "time_estimate":
    case "effort":
    case "risk":
      return null;
    case "single_select":
      return null;
    case "multi_select":
      return [];
    case "user":
    case "team":
      return [];
    case "date":
    case "date_range":
      return null;
    default:
      return null;
  }
};

export const normalizeContexts = (
  contexts: CustomFieldContext[] | null | undefined,
): CustomFieldContext[] => {
  if (!contexts?.length) {
    return ["tasks", "boards", "forms"];
  }
  const unique = new Set<CustomFieldContext>();
  contexts.forEach((context) => {
    if (context) {
      unique.add(context);
    }
  });
  if (!unique.size) {
    unique.add("tasks");
  }
  return Array.from(unique);
};

export const asGovernanceMetadata = (
  value: unknown,
): CustomFieldGovernanceMetadata | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const metadata = value as Record<string, unknown>;
  const managedBy =
    metadata.managedBy === "workspace" ||
    metadata.managedBy === "project" ||
    metadata.managedBy === "team"
      ? (metadata.managedBy as "workspace" | "project" | "team")
      : metadata.owner_scope === "workspace" ||
          metadata.owner_scope === "project" ||
          metadata.owner_scope === "team"
        ? (metadata.owner_scope as "workspace" | "project" | "team")
        : undefined;
  const complianceTags = Array.isArray(metadata.complianceTags)
    ? (metadata.complianceTags as unknown[]).filter((entry): entry is string => typeof entry === "string")
    : Array.isArray(metadata.tags)
      ? (metadata.tags as unknown[]).filter((entry): entry is string => typeof entry === "string")
      : undefined;
  const visibility =
    metadata.visibility === "public" ||
    metadata.visibility === "restricted" ||
    metadata.visibility === "confidential"
      ? metadata.visibility
      : undefined;

  return {
    managedBy,
    complianceTags,
    visibility,
    reviewCadenceDays:
      typeof metadata.reviewCadenceDays === "number"
        ? metadata.reviewCadenceDays
        : typeof metadata.review_cadence_days === "number"
          ? metadata.review_cadence_days
          : null,
    auditTrailEnabled: Boolean(metadata.auditTrailEnabled ?? metadata.audit_trail_enabled),
    description: typeof metadata.description === "string" ? metadata.description : null,
  };
};

export const normalizeOptionSet = (
  value: unknown,
): CustomFieldOptionSet | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const optionSet = value as Record<string, unknown>;
  const options = Array.isArray(optionSet.options)
    ? optionSet.options
        .map((raw) => {
          if (!raw || typeof raw !== "object") {
            return null;
          }
          const option = raw as Record<string, unknown>;
          const id = typeof option.id === "string"
            ? option.id
            : typeof option.value === "string"
              ? option.value
              : null;
          const label = typeof option.label === "string"
            ? option.label
            : typeof option.name === "string"
              ? option.name
              : null;
          if (!id || !label) {
            return null;
          }
          return {
            id,
            label,
            description: typeof option.description === "string" ? option.description : null,
            color: typeof option.color === "string" ? option.color : null,
            isDefault: Boolean(option.isDefault ?? option.default),
          } satisfies CustomFieldOptionSetOption;
        })
        .filter((entry): entry is CustomFieldOptionSetOption => Boolean(entry))
    : [];

  if (!options.length) {
    return null;
  }

  return {
    id: typeof optionSet.id === "string" ? optionSet.id : crypto.randomUUID(),
    options,
    allowCustomOptions: Boolean(optionSet.allowCustomOptions ?? optionSet.allow_custom_options),
  } satisfies CustomFieldOptionSet;
};

export const normalizeFormulaDefinition = (
  value: unknown,
): CustomFieldFormulaDefinition | null => {
  if (!value || typeof value !== "object") {
    if (typeof value === "string" && value.trim()) {
      return { expression: value.trim() };
    }
    return null;
  }

  const raw = value as Record<string, unknown>;
  const expression = typeof raw.expression === "string"
    ? raw.expression
    : typeof raw.formula === "string"
      ? raw.formula
      : null;
  if (!expression) {
    return null;
  }
  return {
    expression,
    precision: typeof raw.precision === "number" ? raw.precision : undefined,
    format:
      raw.format === "percent" || raw.format === "currency"
        ? raw.format
        : "number",
  } satisfies CustomFieldFormulaDefinition;
};

export const normalizeRollupDefinition = (
  value: unknown,
): CustomFieldRollupDefinition | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const sourceFieldId = typeof raw.sourceFieldId === "string"
    ? raw.sourceFieldId
    : typeof raw.source_field_id === "string"
      ? raw.source_field_id
      : null;
  if (!sourceFieldId) {
    return null;
  }
  const aggregation = raw.aggregation;
  const normalizedAggregation: CustomFieldRollupDefinition["aggregation"] =
    aggregation === "sum" ||
    aggregation === "avg" ||
    aggregation === "min" ||
    aggregation === "max" ||
    aggregation === "count"
      ? aggregation
      : "sum";
  return {
    sourceFieldId,
    aggregation: normalizedAggregation,
    relationshipName:
      typeof raw.relationshipName === "string"
        ? raw.relationshipName
        : typeof raw.relationship_name === "string"
          ? raw.relationship_name
          : undefined,
  } satisfies CustomFieldRollupDefinition;
};

export const normalizeMirrorDefinition = (
  value: unknown,
): CustomFieldMirrorDefinition | null => {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as Record<string, unknown>;
  const sourceFieldId = typeof raw.sourceFieldId === "string"
    ? raw.sourceFieldId
    : typeof raw.source_field_id === "string"
      ? raw.source_field_id
      : null;
  if (!sourceFieldId) {
    return null;
  }
  return {
    sourceFieldId,
    relationshipName:
      typeof raw.relationshipName === "string"
        ? raw.relationshipName
        : typeof raw.relationship_name === "string"
          ? raw.relationship_name
          : undefined,
  } satisfies CustomFieldMirrorDefinition;
};
