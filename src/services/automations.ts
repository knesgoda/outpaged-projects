import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import { Automation, AutomationRun } from "@/types";

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }
  const userId = data?.user?.id;
  if (!userId) {
    throw new Error("You must be signed in to manage automations.");
  }
  return userId;
}

export async function listAutomations(projectId?: string): Promise<Automation[]> {
  if (!supabaseConfigured) {
    return [];
  }

  let query = supabase
    .from("automations")
    .select("*")
    .order("updated_at", { ascending: false, nullsFirst: false });

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Automation[];
}

export async function getAutomation(id: string): Promise<Automation | null> {
  if (!supabaseConfigured) {
    return null;
  }

  const { data, error } = await supabase
    .from("automations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Automation) ?? null;
}

export async function createAutomation(
  input: Omit<Automation, "id" | "owner" | "created_at" | "updated_at">
): Promise<Automation> {
  const owner = await requireUserId();

  const payload = {
    ...input,
    owner,
    trigger_config: input.trigger_config ?? {},
    action_config: input.action_config ?? {},
  };

  const { data, error } = await supabase
    .from("automations")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Automation;
}

export async function updateAutomation(
  id: string,
  patch: Partial<
    Pick<
      Automation,
      "name" | "enabled" | "trigger_type" | "trigger_config" | "action_type" | "action_config"
    >
  >
): Promise<Automation> {
  const { data, error } = await supabase
    .from("automations")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Automation;
}

export async function deleteAutomation(id: string): Promise<void> {
  const { error } = await supabase.from("automations").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export async function listAutomationRuns(automationId: string): Promise<AutomationRun[]> {
  if (!supabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase
    .from("automation_runs")
    .select("*")
    .eq("automation_id", automationId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as AutomationRun[];
}

export async function enqueueTestRun(automationId: string): Promise<void> {
  const automation = await getAutomation(automationId);
  if (!automation) {
    throw new Error("Automation not found");
  }
  if (!automation.enabled) {
    throw new Error("Automation is disabled");
  }

  const { error } = await supabase.from("automation_runs").insert({
    automation_id: automationId,
    status: "success",
    message: "Test run executed",
    payload: {
      triggeredAt: new Date().toISOString(),
      action: automation.action_type,
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}
