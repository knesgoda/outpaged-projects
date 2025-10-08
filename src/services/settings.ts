import { supabase } from "@/integrations/supabase/client";
import type { WorkspaceMember, WorkspaceSettings } from "@/types";
import { requireUserId } from "@/services/utils";
import { uploadPublicImage } from "./storage";

const WORKSPACE_FIELDS =
  "id, owner, brand_name, name, brand_logo_url, default_timezone, default_capacity_hours_per_week, allowed_email_domain, features, security, billing, updated_at";

export async function getWorkspaceSettings(): Promise<WorkspaceSettings | null> {
  const { data, error } = await (supabase
    .from("workspace_settings") as any)
    .select(WORKSPACE_FIELDS)
    .limit(1)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw new Error(error.message);
  }

  return (data as WorkspaceSettings | null) ?? null;
}

export async function upsertWorkspaceSettings(patch: Partial<WorkspaceSettings>): Promise<WorkspaceSettings> {
  const userId = await requireUserId();
  const existing = await getWorkspaceSettings();
  const payload: Partial<WorkspaceSettings> & { owner: string; updated_at: string } = {
    owner: existing?.owner ?? userId,
    ...patch,
    updated_at: new Date().toISOString(),
  };
  if (existing?.id) {
    payload.id = existing.id;
  }

  const { data, error } = await (supabase
    .from("workspace_settings") as any)
    .upsert(payload, { onConflict: "id" })
    .select(WORKSPACE_FIELDS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as WorkspaceSettings;
}

export async function listMembers(): Promise<WorkspaceMember[]> {
  const { data, error } = await (supabase
    .from("workspace_members") as any)
    .select("user_id, role")
    .order("user_id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as WorkspaceMember[]) ?? [];
}

export async function setMemberRole(userId: string, role: WorkspaceMember["role"]): Promise<void> {
  const { error } = await (supabase
    .from("workspace_members") as any)
    .update({ role })
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function removeMember(userId: string): Promise<void> {
  const { error } = await (supabase
    .from("workspace_members") as any)
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function uploadBrandLogo(file: File): Promise<string> {
  if (!file.type?.startsWith("image/")) {
    throw new Error("Logo must be an image.");
  }

  const MAX_SIZE = 2 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error("Logo must be smaller than 2 MB.");
  }

  const userId = await requireUserId();
  const { publicUrl } = await uploadPublicImage("branding", file, `branding/${userId}/logo-${Date.now()}`);

  const existing = await getWorkspaceSettings();
  const payload: Partial<WorkspaceSettings> & { owner: string; updated_at: string; brand_logo_url: string } = {
    owner: existing?.owner ?? userId,
    brand_logo_url: publicUrl,
    updated_at: new Date().toISOString(),
  };
  if (existing?.id) {
    payload.id = existing.id;
  }

  const { error: updateError } = await (supabase
    .from("workspace_settings") as any)
    .upsert(payload, { onConflict: "id" });

  if (updateError) {
    throw new Error(updateError.message);
  }

  return publicUrl;
}
