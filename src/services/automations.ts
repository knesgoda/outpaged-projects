import { supabase } from "@/integrations/supabase/client";
import type { Automation, AutomationRun } from "@/types";
import { mapSupabaseError, requireUserId } from "./utils";

const AUTOMATION_FIELDS =
  "id, owner, project_id, name, enabled, trigger_type, trigger_config, action_type, action_config, created_at, updated_at";
const RUN_FIELDS = "id, automation_id, status, message, payload, created_at";

export async function listAutomations(projectId?: string): Promise<Automation[]> {
  let query = supabase
    .from("automation_rules" as any)
    .select("id, project_id, name, description, is_active, trigger_type, execution_count, last_executed_at, created_at, created_by")
    .order("created_at", { ascending: false });

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;

  if (error) {
    throw mapSupabaseError(error, "Unable to load automations.");
  }

  return (data as any) ?? [];
}

export async function getAutomation(id: string): Promise<Automation | null> {
  if (!id) {
    throw new Error("Automation id is required.");
  }

  const { data, error } = await supabase
    .from("automation_rules" as any)
    .select("id, project_id, name, description, is_active, trigger_type, execution_count, last_executed_at, created_at, created_by")
    .eq("id", id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw mapSupabaseError(error, "Unable to load automation.");
  }

  return (data as any) ?? null;
}

export async function createAutomation(
  input: Omit<Automation, "id" | "owner" | "created_at" | "updated_at">
): Promise<Automation> {
  const ownerId = await requireUserId();
  const payload = {
    ...input,
    owner: ownerId,
    project_id: input.project_id ?? null,
    trigger_config: input.trigger_config ?? {},
    action_config: input.action_config ?? {},
  };

  if (!payload.name?.trim()) {
    throw new Error("Name is required.");
  }

  const { data, error } = await supabase
    .from("automation_rules" as any)
    .insert({
      ...payload,
      name: payload.name.trim(),
    } as any)
    .select("id, project_id, name, description, is_active, trigger_type, execution_count, last_executed_at, created_at, created_by")
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to create automation.");
  }

  return data as any;
}

export async function updateAutomation(
  id: string,
  patch: Partial<
    Pick<
      Automation,
      "name" | "enabled" | "trigger_type" | "trigger_config" | "action_type" | "action_config" | "project_id"
    >
  >
): Promise<Automation> {
  if (!id) {
    throw new Error("Automation id is required.");
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) {
      throw new Error("Name cannot be empty.");
    }
    updates.name = trimmed;
  }

  if (patch.enabled !== undefined) {
    updates.enabled = Boolean(patch.enabled);
  }

  if (patch.project_id !== undefined) {
    updates.project_id = patch.project_id || null;
  }

  if (patch.trigger_type !== undefined) {
    updates.trigger_type = patch.trigger_type;
  }

  if (patch.trigger_config !== undefined) {
    updates.trigger_config = patch.trigger_config ?? {};
  }

  if (patch.action_type !== undefined) {
    updates.action_type = patch.action_type;
  }

  if (patch.action_config !== undefined) {
    updates.action_config = patch.action_config ?? {};
  }

  const { data, error } = await supabase
    .from("automation_rules" as any)
    .update(updates as any)
    .eq("id", id)
    .select("id, project_id, name, description, is_active, trigger_type, execution_count, last_executed_at, created_at, created_by")
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to update automation.");
  }

  return data as any;
}

export async function deleteAutomation(id: string): Promise<void> {
  if (!id) {
    throw new Error("Automation id is required.");
  }

  const { error } = await supabase.from("automation_rules" as any).delete().eq("id", id);

  if (error) {
    throw mapSupabaseError(error, "Unable to delete automation.");
  }
}

export async function listAutomationRuns(automationId: string): Promise<AutomationRun[]> {
  if (!automationId) {
    throw new Error("Automation id is required.");
  }

  const { data, error } = await supabase
    .from("automation_executions" as any)
    .select('*')
    .eq("rule_id", automationId)
    .order("executed_at", { ascending: false })
    .limit(50) as any;

  if (error) {
    throw mapSupabaseError(error, "Unable to load automation runs.");
  }

  return (data as any) ?? [];
}

export async function enqueueTestRun(automationId: string): Promise<void> {
  if (!automationId) {
    throw new Error("Automation id is required.");
  }

  const { data, error } = await supabase
    .from("automation_executions" as any)
    .insert({
      rule_id: automationId,
      success: true,
      trigger_data: { triggered_at: new Date().toISOString(), test: true },
    } as any)
    .select("id")
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to enqueue test run.");
  }

  if (!data) {
    throw new Error("Test run was not recorded.");
  }
}
