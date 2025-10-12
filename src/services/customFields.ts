// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  asGovernanceMetadata,
  normalizeContexts,
  normalizeFormulaDefinition,
  normalizeMirrorDefinition,
  normalizeOptionSet,
  normalizeRollupDefinition,
  resolveDefaultValue,
  shouldFieldRender,
  type CustomFieldConditionalRule,
  type CustomFieldDefinition,
  type CustomFieldUsageMetric,
  type CustomFieldValue,
  type CustomFieldContext,
} from "@/domain/customFields";

export type CustomFieldDefinitionRow = Database["public"]["Tables"]["custom_field_definitions"]["Row"];
export type CustomFieldDefinitionInsert = Database["public"]["Tables"]["custom_field_definitions"]["Insert"];
export type CustomFieldDefinitionUpdate = Database["public"]["Tables"]["custom_field_definitions"]["Update"];

const toApiName = (name: string): string =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const parseConditionalRules = (value: unknown): CustomFieldConditionalRule[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const rule = entry as Record<string, unknown>;
      const fieldId = typeof rule.fieldId === "string"
        ? rule.fieldId
        : typeof rule.field_id === "string"
          ? rule.field_id
          : null;
      const operator = rule.operator ?? rule.op;
      const normalizedOperator =
        operator === "equals" ||
        operator === "not_equals" ||
        operator === "contains" ||
        operator === "not_contains" ||
        operator === "is_set" ||
        operator === "is_not_set"
          ? operator
          : undefined;
      if (!fieldId || !normalizedOperator) {
        return null;
      }
      return {
        fieldId,
        operator: normalizedOperator,
        value: rule.value,
      } satisfies CustomFieldConditionalRule;
    })
    .filter((rule): rule is CustomFieldConditionalRule => Boolean(rule));
};

const mapDefinitionRow = (row: CustomFieldDefinitionRow): CustomFieldDefinition => {
  const contexts = normalizeContexts(row.applies_to as CustomFieldContext[] | null | undefined);
  const optionSet = normalizeOptionSet(row.options);
  const formula = row.field_type === "formula" ? normalizeFormulaDefinition(row.formula) : null;
  const rollup = row.field_type === "rollup" ? normalizeRollupDefinition(row.rollup_config) : null;
  const mirror = row.field_type === "mirror" ? normalizeMirrorDefinition(row.rollup_config) : null;
  const governance = asGovernanceMetadata((row.validation_rules as Record<string, unknown> | null)?.governance);
  const conditionalRules = parseConditionalRules((row.validation_rules as Record<string, unknown> | null)?.conditions);

  return {
    id: row.id,
    name: row.name,
    apiName: toApiName(row.name),
    description: row.description,
    scope: row.workspace_id ? "global" : "project",
    projectId: row.project_id,
    workspaceId: row.workspace_id,
    fieldType: row.field_type,
    contexts,
    optionSet,
    formula,
    rollup,
    mirror,
    governance,
    defaultValue: (row.validation_rules as Record<string, unknown> | null)?.defaultValue ?? undefined,
    isRequired: Boolean(row.is_required),
    isPrivate: Boolean(row.is_private),
    position: row.position,
    conditionalRules,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  } satisfies CustomFieldDefinition;
};

const serializeDefinition = (
  definition: Partial<CustomFieldDefinition>,
): CustomFieldDefinitionInsert | CustomFieldDefinitionUpdate => {
  if (!definition.name) {
    throw new Error("Custom field definitions require a name");
  }

  if (!definition.fieldType) {
    throw new Error("Custom field definitions require a field type");
  }

  const rollupConfig = definition.fieldType === "rollup"
    ? definition.rollup
      ? {
          sourceFieldId: definition.rollup.sourceFieldId,
          aggregation: definition.rollup.aggregation,
          relationshipName: definition.rollup.relationshipName,
        }
      : null
    : definition.fieldType === "mirror" && definition.mirror
      ? {
          sourceFieldId: definition.mirror.sourceFieldId,
          relationshipName: definition.mirror.relationshipName,
        }
      : null;

  const validationRules =
    definition.conditionalRules?.length || definition.governance || definition.defaultValue !== undefined
      ? {
          conditions: definition.conditionalRules,
          governance: definition.governance,
          defaultValue: definition.defaultValue,
        }
      : null;

  const payload: CustomFieldDefinitionInsert = {
    name: definition.name,
    field_type: definition.fieldType,
    description: definition.description ?? null,
    project_id: definition.projectId ?? null,
    workspace_id: definition.workspaceId ?? null,
    is_private: definition.isPrivate ?? false,
    is_required: definition.isRequired ?? false,
    position: definition.position ?? 0,
    applies_to: definition.contexts ?? ["tasks", "forms"],
    options: definition.optionSet ?? null,
    formula: definition.fieldType === "formula" ? definition.formula?.expression ?? null : null,
    rollup_config: rollupConfig,
    validation_rules: validationRules,
  } satisfies CustomFieldDefinitionInsert;

  return payload;
};

export interface ListCustomFieldDefinitionsParams {
  projectId?: string;
  workspaceId?: string;
  contexts?: CustomFieldContext[];
}

export async function listCustomFieldDefinitions(
  params: ListCustomFieldDefinitionsParams,
): Promise<CustomFieldDefinition[]> {
  let query = supabase.from("custom_field_definitions").select("*").order("position", { ascending: true });

  if (params.projectId) {
    query = query.eq("project_id", params.projectId);
  }
  if (params.workspaceId) {
    query = query.eq("workspace_id", params.workspaceId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const definitions = (data ?? []).map(mapDefinitionRow);

  if (!params.contexts?.length) {
    return definitions;
  }

  const allowed = new Set(params.contexts);
  return definitions.filter((definition) => definition.contexts.some((context) => allowed.has(context)));
}

export interface UpsertCustomFieldDefinitionParams {
  definition: Partial<CustomFieldDefinition>;
  id?: string;
}

export async function upsertCustomFieldDefinition({
  definition,
  id,
}: UpsertCustomFieldDefinitionParams): Promise<CustomFieldDefinition> {
  const payload = serializeDefinition(definition);
  if (id) {
    const { data, error } = await supabase
      .from("custom_field_definitions")
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) {
      throw error;
    }
    if (!data) {
      throw new Error("Custom field definition not found");
    }
    return mapDefinitionRow(data);
  }

  const { data, error } = await supabase
    .from("custom_field_definitions")
    .insert(payload)
    .select("*")
    .maybeSingle();
  if (error) {
    throw error;
  }
  if (!data) {
    throw new Error("Failed to create custom field definition");
  }
  return mapDefinitionRow(data);
}

export async function deleteCustomFieldDefinition(id: string): Promise<void> {
  const { error } = await supabase.from("custom_field_definitions").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

export interface TaskCustomFieldValueInput {
  customFieldId: string;
  value: CustomFieldValue;
}

export async function upsertTaskCustomFieldValues(
  taskId: string,
  values: TaskCustomFieldValueInput[],
): Promise<void> {
  if (!taskId) {
    throw new Error("taskId is required to upsert custom field values");
  }

  const inserts: Database["public"]["Tables"]["task_custom_fields"]["Insert"][] = values.map((value) => ({
    task_id: taskId,
    custom_field_id: value.customFieldId,
    value: value.value ?? null,
  }));

  if (!inserts.length) {
    return;
  }

  const { error } = await supabase
    .from("task_custom_fields")
    .upsert(inserts, { onConflict: "task_id,custom_field_id" });

  if (error) {
    throw error;
  }
}

export interface CustomFieldUsageParams {
  projectId?: string;
  workspaceId?: string;
}

export interface CustomFieldUsageResult {
  metrics: CustomFieldUsageMetric[];
  isFallback: boolean;
}

const MISSING_USAGE_RPC_CODES = new Set(["PGRST116", "PGRST301", "42883"]);

export async function listCustomFieldUsageMetrics(
  params: CustomFieldUsageParams,
): Promise<CustomFieldUsageResult> {
  const filters: Record<string, unknown> = {};
  if (params.projectId) {
    filters.project_id = params.projectId;
  }
  if (params.workspaceId) {
    filters.workspace_id = params.workspaceId;
  }

  const { data, error } = await supabase.rpc("custom_field_usage_summary", filters);

  if (error) {
    if (!MISSING_USAGE_RPC_CODES.has((error as { code?: string }).code ?? "")) {
      throw error;
    }

    console.warn("custom_field_usage_summary RPC unavailable", error);

    let query = supabase
      .from<CustomFieldDefinitionRow>("custom_field_definitions")
      .select("id,name,applies_to")
      .order("name", { ascending: true });

    if (params.projectId) {
      query = query.eq("project_id", params.projectId);
    }
    if (params.workspaceId) {
      query = query.eq("workspace_id", params.workspaceId);
    }

    const { data: definitions, error: definitionsError } = await query;

    if (definitionsError) {
      throw definitionsError;
    }

    const fallbackMetrics = (definitions ?? []).map((definition) => {
      const contexts = normalizeContexts(definition.applies_to as CustomFieldContext[] | null | undefined);
      const screens = contexts.filter((context) => context === "boards" || context === "forms");
      const reports = contexts.includes("reports") ? ["Reports"] : [];
      const automations = contexts.includes("automations") ? ["Automations"] : [];

      return {
        fieldId: definition.id,
        fieldName: definition.name,
        screens,
        reports,
        automations,
        lastUsedAt: null,
        usageCount: 0,
      } satisfies CustomFieldUsageMetric;
    });

    return {
      metrics: fallbackMetrics,
      isFallback: true,
    };
  }

  const rows = (data as Record<string, unknown>[] | null) ?? [];
  const metrics = rows
    .map((row) => ({
      fieldId: typeof row.field_id === "string" ? row.field_id : "",
      fieldName: typeof row.field_name === "string" ? row.field_name : "",
      screens: Array.isArray(row.screens) ? (row.screens as string[]) : [],
      automations: Array.isArray(row.automations) ? (row.automations as string[]) : [],
      reports: Array.isArray(row.reports) ? (row.reports as string[]) : [],
      lastUsedAt: typeof row.last_used_at === "string" ? row.last_used_at : null,
      usageCount: typeof row.usage_count === "number" ? row.usage_count : 0,
    } satisfies CustomFieldUsageMetric))
    .filter((metric) => metric.fieldId);

  return {
    metrics,
    isFallback: false,
  };
}

export const evaluateCustomFieldVisibility = (
  definitions: CustomFieldDefinition[],
  values: Record<string, unknown>,
) => {
  const visible = new Set<string>();
  definitions.forEach((definition) => {
    if (shouldFieldRender(definition, values)) {
      visible.add(definition.id);
    }
  });
  return visible;
};

export const buildCustomFieldDefaults = (
  definitions: CustomFieldDefinition[],
): Record<string, unknown> => {
  const defaults: Record<string, unknown> = {};
  definitions.forEach((definition) => {
    if (definition.isPrivate) {
      return;
    }
    defaults[definition.id] = resolveDefaultValue(definition);
  });
  return defaults;
};
