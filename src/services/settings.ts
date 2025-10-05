import { supabase } from "@/integrations/supabase/client";
import { WorkspaceSettings } from "@/types";
import { requireUserId, supabaseErrorMessage } from "./utils";

export async function getWorkspaceSettings(): Promise<WorkspaceSettings | null> {
  const owner = await requireUserId();
  const { data, error } = await supabase
    .from("workspace_settings")
    .select("*")
    .eq("owner", owner)
    .order("updated_at", { ascending: false })
    .maybeSingle();

  if (error) {
    if ((error as { code?: string }).code === "PGRST116") {
      return null;
    }
    throw new Error(supabaseErrorMessage(error, "Could not load workspace settings"));
  }

  return data ?? null;
}

export async function upsertWorkspaceSettings(
  patch: Partial<WorkspaceSettings>
): Promise<WorkspaceSettings> {
  const owner = await requireUserId();
  const payload = {
    ...patch,
    owner,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("workspace_settings")
    .upsert(payload, { onConflict: "owner" })
    .select("*")
    .single();

  if (error) {
    throw new Error(supabaseErrorMessage(error, "Could not save workspace settings"));
  }

  return data as WorkspaceSettings;
}
