import { supabase } from "@/integrations/supabase/client";
import type {
  AutomationCanvasState,
  AutomationConflict,
  AutomationDryRunResult,
  AutomationGovernance,
  AutomationGraphEdge,
  AutomationGraphNode,
  AutomationRunDetails,
  AutomationVersionSummary,
} from "@/types";

import { mapSupabaseError } from "./utils";

type AutomationEditorResponse = {
  automation: {
    id: string;
    project_id: string;
    name: string;
    description?: string | null;
    is_active: boolean;
    governance?: AutomationGovernance | null;
    graph_definition?: AutomationCanvasState | null;
  } | null;
  versions: AutomationVersionSummary[];
  runHistory: AutomationRunDetails[];
  conflicts: AutomationConflict[];
};

export async function fetchAutomationEditorData(
  projectId: string,
  automationId?: string
): Promise<AutomationEditorResponse> {
  if (!projectId) {
    throw new Error("Project id is required to load automations.");
  }

  const { data, error } = await supabase
    .from("automation_rules" as any)
    .select(
      `id, project_id, name, description, is_active, governance, graph_definition, trigger_type, trigger_config,
       versions:automation_versions(id, version_number, created_at, created_by, notes, is_enabled, name),
       runs:automation_executions(id, rule_id, version_id, executed_at, success, duration_ms, trigger_data, input, output,
         logs:automation_run_logs(id, execution_id, node_id, step_id, input, output, duration_ms, created_at)
       )`
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .returns<any[]>();

  if (error) {
    throw mapSupabaseError(error, "Unable to load automation details.");
  }

  const rows = data ?? [];
  const automation = automationId ? rows.find((row) => row.id === automationId) ?? null : rows[0] ?? null;
  const selectedGraph: AutomationCanvasState = automation?.graph_definition ?? {
    nodes: [],
    edges: [],
  };

  const conflicts = buildConflictWarnings(automation, rows.filter((row) => row.id !== automation?.id));

  return {
    automation: automation
      ? {
          id: automation.id,
          project_id: automation.project_id,
          name: automation.name,
          description: automation.description,
          is_active: automation.is_active,
          governance: automation.governance ?? undefined,
          graph_definition: selectedGraph,
        }
      : null,
    versions: (automation?.versions ?? []) as AutomationVersionSummary[],
    runHistory: ((automation?.runs ?? []) as any[]).map(normalizeRunHistory),
    conflicts,
  };
}

export async function saveAutomationGraph(input: {
  projectId: string;
  automationId?: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  governance?: AutomationGovernance | null;
  canvas: AutomationCanvasState;
  versionNotes?: string | null;
  versionName?: string | null;
  makeCurrent?: boolean;
}): Promise<{ automationId: string; version: AutomationVersionSummary }> {
  if (!input.projectId) {
    throw new Error("Project id is required.");
  }

  const definition = {
    nodes: input.canvas.nodes ?? [],
    edges: input.canvas.edges ?? [],
  } satisfies AutomationCanvasState;

  let automationId = input.automationId;

  if (automationId) {
    const { error } = await supabase
      .from("automation_rules" as any)
      .update({
        name: input.name,
        description: input.description ?? null,
        is_active: input.isActive,
        governance: input.governance ?? null,
        graph_definition: definition,
        updated_at: new Date().toISOString(),
      })
      .eq("id", automationId);

    if (error) {
      throw mapSupabaseError(error, "Unable to update automation.");
    }
  } else {
    const { data, error } = await supabase
      .from("automation_rules" as any)
      .insert({
        project_id: input.projectId,
        name: input.name,
        description: input.description ?? null,
        is_active: input.isActive,
        governance: input.governance ?? null,
        graph_definition: definition,
      })
      .select("id")
      .single();

    if (error) {
      throw mapSupabaseError(error, "Unable to create automation.");
    }

    automationId = data?.id;
  }

  if (!automationId) {
    throw new Error("Automation id missing after save.");
  }

  const nextVersionNumber = await fetchNextVersionNumber(automationId);

  const { data: versionData, error: versionError } = await supabase
    .from("automation_versions" as any)
    .insert({
      automation_id: automationId,
      version_number: nextVersionNumber,
      definition,
      notes: input.versionNotes ?? null,
      name: input.versionName ?? `v${nextVersionNumber}`,
      is_enabled: true,
    })
    .select("id, version_number, created_at, created_by, notes, is_enabled, name")
    .single();

  if (versionError) {
    throw mapSupabaseError(versionError, "Unable to create automation version.");
  }

  if (input.makeCurrent) {
    const { error: updateError } = await supabase
      .from("automation_rules" as any)
      .update({ current_version_id: versionData.id })
      .eq("id", automationId);

    if (updateError) {
      throw mapSupabaseError(updateError, "Unable to promote automation version.");
    }
  }

  return {
    automationId,
    version: versionData as AutomationVersionSummary,
  };
}

export async function triggerAutomationDryRun(
  automationId: string,
  sampleItem?: Record<string, unknown>
): Promise<AutomationDryRunResult> {
  if (!automationId) {
    throw new Error("Automation id is required for dry run.");
  }

  const { data, error } = await supabase.rpc("automation_dry_run", {
    automation_id: automationId,
    sample_item: sampleItem ?? null,
  });

  if (error) {
    throw mapSupabaseError(error, "Unable to perform automation dry run.");
  }

  return (
    data ?? {
      executionId: "unknown",
      durationMs: null,
      logs: [],
    }
  );
}

export async function toggleAutomationVersion(
  versionId: string,
  enabled: boolean
): Promise<AutomationVersionSummary> {
  if (!versionId) {
    throw new Error("Version id is required.");
  }

  const { data, error } = await supabase
    .from("automation_versions" as any)
    .update({ is_enabled: enabled })
    .eq("id", versionId)
    .select("id, version_number, created_at, created_by, notes, is_enabled, name")
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to toggle automation version.");
  }

  return data as AutomationVersionSummary;
}

export async function fetchAutomationRunHistory(
  automationId: string
): Promise<AutomationRunDetails[]> {
  if (!automationId) {
    throw new Error("Automation id is required to load run history.");
  }

  const { data, error } = await supabase
    .from("automation_executions" as any)
    .select(
      `id, rule_id, version_id, executed_at, success, duration_ms, trigger_data, input, output,
       logs:automation_run_logs(id, execution_id, node_id, step_id, input, output, duration_ms, created_at)`
    )
    .eq("rule_id", automationId)
    .order("executed_at", { ascending: false })
    .limit(50)
    .returns<any[]>();

  if (error) {
    throw mapSupabaseError(error, "Unable to load run history.");
  }

  return (data ?? []).map(normalizeRunHistory);
}

export function buildConflictWarnings(
  automation: any,
  others: any[]
): AutomationConflict[] {
  if (!automation) {
    return [];
  }

  const triggerNodes: AutomationGraphNode[] = (automation.graph_definition?.nodes ?? []).filter(
    (node: AutomationGraphNode) => node.type === "trigger"
  );

  if (!triggerNodes.length) {
    return [];
  }

  const conflicts: AutomationConflict[] = [];
  for (const trigger of triggerNodes) {
    for (const other of others ?? []) {
      const otherTrigger = (other.graph_definition?.nodes ?? []).find(
        (node: AutomationGraphNode) => node.type === "trigger"
      );

      if (!otherTrigger) {
        continue;
      }

      if (otherTrigger.label === trigger.label) {
        conflicts.push({
          automationId: automation.id,
          conflictingAutomationId: other.id,
          reason: `Shares trigger "${trigger.label}" with ${other.name}.`,
          severity: "warning",
        });
      }

      if (overlapsConfig(trigger.config, otherTrigger.config)) {
        conflicts.push({
          automationId: automation.id,
          conflictingAutomationId: other.id,
          reason: `Potential overlap on trigger configuration with ${other.name}.`,
          severity: "error",
        });
      }
    }
  }

  return conflicts;
}

function overlapsConfig(
  first: Record<string, unknown> | undefined,
  second: Record<string, unknown> | undefined
): boolean {
  if (!first || !second) {
    return false;
  }

  return Object.keys(first).some((key) => key in second && first[key] === second[key]);
}

async function fetchNextVersionNumber(automationId: string): Promise<number> {
  const { data, error } = await supabase
    .from("automation_versions" as any)
    .select("version_number")
    .eq("automation_id", automationId)
    .order("version_number", { ascending: false })
    .limit(1);

  if (error) {
    throw mapSupabaseError(error, "Unable to determine next version number.");
  }

  const current = data?.[0]?.version_number ?? 0;
  return Number(current) + 1;
}

function normalizeRunHistory(row: any): AutomationRunDetails {
  return {
    id: row.id,
    rule_id: row.rule_id,
    version_id: row.version_id,
    executed_at: row.executed_at,
    success: Boolean(row.success ?? row.status !== "failed"),
    duration_ms: row.duration_ms ?? null,
    trigger_data: row.trigger_data ?? null,
    input: row.input ?? row.payload ?? null,
    output: row.output ?? null,
    logs: (row.logs ?? []) as AutomationRunDetails["logs"],
  };
}
