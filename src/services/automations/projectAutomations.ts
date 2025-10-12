// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { ProjectAutomationConfig } from "@/types";
import { mapSupabaseError } from "../utils";

const TABLE = "project_automations";

export async function listProjectAutomations(projectId: string): Promise<ProjectAutomationConfig[]> {
  if (!projectId) {
    throw new Error("Project id is required to load automations");
  }

  const { data, error } = await supabase
    .from(TABLE as any)
    .select("id, project_id, recipe_slug, enabled, trigger_config, action_config, created_at, updated_at, last_run_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    throw mapSupabaseError(error, "Unable to load automation settings.");
  }

  return (data as ProjectAutomationConfig[]) ?? [];
}

export async function upsertProjectAutomation(options: {
  projectId: string;
  recipeSlug: string;
  enabled: boolean;
  triggerConfig?: Record<string, unknown>;
  actionConfig?: Record<string, unknown>;
}): Promise<ProjectAutomationConfig> {
  const { projectId, recipeSlug, enabled, triggerConfig, actionConfig } = options;
  if (!projectId || !recipeSlug) {
    throw new Error("Project id and recipe slug are required.");
  }

  const payload = {
    project_id: projectId,
    recipe_slug: recipeSlug,
    enabled,
    trigger_config: triggerConfig ?? {},
    action_config: actionConfig ?? {},
  };

  const { data, error } = await supabase
    .from(TABLE as any)
    .upsert(payload as any, { onConflict: "project_id,recipe_slug" })
    .select("id, project_id, recipe_slug, enabled, trigger_config, action_config, created_at, updated_at, last_run_at")
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to save automation configuration.");
  }

  return data as ProjectAutomationConfig;
}

export async function toggleProjectAutomation(options: {
  projectAutomationId: string;
  enabled: boolean;
}): Promise<ProjectAutomationConfig> {
  const { projectAutomationId, enabled } = options;
  if (!projectAutomationId) {
    throw new Error("Automation id is required.");
  }

  const { data, error } = await supabase
    .from(TABLE as any)
    .update({ enabled })
    .eq("id", projectAutomationId)
    .select("id, project_id, recipe_slug, enabled, trigger_config, action_config, created_at, updated_at, last_run_at")
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to toggle automation.");
  }

  return data as ProjectAutomationConfig;
}

export async function deleteProjectAutomation(projectAutomationId: string): Promise<void> {
  if (!projectAutomationId) {
    throw new Error("Automation id is required.");
  }

  const { error } = await supabase.from(TABLE as any).delete().eq("id", projectAutomationId);

  if (error) {
    throw mapSupabaseError(error, "Unable to delete automation.");
  }
}
