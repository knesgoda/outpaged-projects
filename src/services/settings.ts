import { supabase } from "@/integrations/supabase/client";
import type { WorkspaceMember, WorkspaceSettings } from "@/types";
import { requireUserId } from "@/services/utils";

const WORKSPACE_FIELDS =
  "id, owner, name, brand_logo_url, default_timezone, default_capacity_hours_per_week, allowed_email_domain, features, security, billing, updated_at";

export async function getWorkspaceSettings(): Promise<WorkspaceSettings | null> {
  const { data, error } = await supabase
    .from("workspace_settings")
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

  const { data, error } = await supabase
    .from("workspace_settings")
    .upsert(payload, { onConflict: "id" })
    .select(WORKSPACE_FIELDS)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as WorkspaceSettings;
}

export async function listMembers(): Promise<WorkspaceMember[]> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("user_id, role")
    .order("user_id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data as WorkspaceMember[]) ?? [];
}

export async function setMemberRole(userId: string, role: WorkspaceMember["role"]): Promise<void> {
  const { error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function removeMember(userId: string): Promise<void> {
  const { error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

function getExtension(file: File) {
  const fromName = file.name?.split(".").pop();
  if (fromName && fromName.length < 10) {
    return fromName;
  }
  const fromType = file.type?.split("/").pop();
  return fromType ?? "png";
}

export async function uploadBrandLogo(file: File): Promise<string> {
  if (!file.type?.startsWith("image/")) {
    throw new Error("Logo must be an image.");
  }

  const MAX_SIZE = 4 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error("Logo must be smaller than 4 MB.");
  }

  const userId = await requireUserId();
  const extension = getExtension(file);
  const filePath = `branding/${userId}/logo-${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("branding")
    .upload(filePath, file, { upsert: true, cacheControl: "3600" });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from("branding").getPublicUrl(filePath);
  const publicUrl = data.publicUrl;
  if (!publicUrl) {
    throw new Error("Failed to generate logo URL.");
  }

  const existing = await getWorkspaceSettings();
  const payload: Partial<WorkspaceSettings> & { owner: string; updated_at: string; brand_logo_url: string } = {
    owner: existing?.owner ?? (await requireUserId()),
    brand_logo_url: publicUrl,
    updated_at: new Date().toISOString(),
  };
  if (existing?.id) {
    payload.id = existing.id;
  }

  const { error: updateError } = await supabase
    .from("workspace_settings")
    .upsert(payload, { onConflict: "id" });

  if (updateError) {
    throw new Error(updateError.message);
  }

  return publicUrl;
}
