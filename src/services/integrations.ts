import { supabase } from "@/integrations/supabase/client";
import type { Integration, UserIntegration, Webhook } from "@/types";
import {
  createWebhook as createWebhookRecord,
  deleteWebhook as deleteWebhookRecord,
  updateWebhook as updateWebhookRecord,
} from "@/services/webhooks";
import { handleSupabaseError, requireUserId } from "@/services/utils";

export type ConnectIntegrationInput = {
  provider: UserIntegration["provider"];
  projectId?: string | null;
  displayName?: string | null;
  accessData?: Record<string, any>;
};

export type UpdateUserIntegrationInput = Partial<
  Pick<UserIntegration, "display_name" | "access_data">
>;

export type UpdateIntegrationConfigInput = {
  key: Integration["key"];
  patch: Partial<Pick<Integration, "name" | "enabled" | "config">>;
};

export type CreateIntegrationWebhookInput = {
  targetUrl: string;
  secret?: string;
  active?: boolean;
  projectId?: string | null;
};

export async function listIntegrations(): Promise<Integration[]> {
  const { data, error } = await (supabase as any)
    .from("integrations")
    .select("key, name, enabled, config")
    .order("name", { ascending: true });

  if (error) {
    handleSupabaseError(error, "Failed to load integrations.");
  }

  return (data as Integration[]) ?? [];
}

export async function listUserIntegrations(options: {
  projectId?: string | null;
} = {}): Promise<UserIntegration[]> {
  let query = (supabase as any)
    .from("user_integrations")
    .select("id, user_id, project_id, provider, display_name, access_data, created_at");

  if (options.projectId) {
    query = query.or(`project_id.eq.${options.projectId},project_id.is.null`);
  } else {
    query = query.is("project_id", null);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    handleSupabaseError(error, "Failed to load user integrations.");
  }

  return (data as UserIntegration[]) ?? [];
}

export async function listWorkspaceWebhooks(): Promise<Webhook[]> {
  const { data, error } = await (supabase as any)
    .from("webhooks")
    .select("id, owner, project_id, target_url, secret, active, created_at")
    .is("project_id", null)
    .order("created_at", { ascending: false });

  if (error) {
    handleSupabaseError(error, "Failed to load workspace webhooks.");
  }

  return (data as Webhook[]) ?? [];
}

export async function listProjectWebhooks(projectId: string): Promise<Webhook[]> {
  const { data, error } = await (supabase as any)
    .from("webhooks")
    .select("id, owner, project_id, target_url, secret, active, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    handleSupabaseError(error, "Failed to load project webhooks.");
  }

  return (data as Webhook[]) ?? [];
}

export async function connectIntegration(
  input: ConnectIntegrationInput,
): Promise<UserIntegration> {
  const userId = await requireUserId();
  const { data, error } = await (supabase as any)
    .from("user_integrations")
    .insert({
      user_id: userId,
      provider: input.provider,
      project_id: input.projectId ?? null,
      display_name: input.displayName ?? null,
      access_data: input.accessData ?? {},
    })
    .select("id, user_id, project_id, provider, display_name, access_data, created_at")
    .single();

  if (error) {
    handleSupabaseError(error, "Failed to connect integration.");
  }

  return data as UserIntegration;
}

export async function disconnectIntegration(id: string): Promise<void> {
  const { error } = await (supabase as any)
    .from("user_integrations")
    .delete()
    .eq("id", id);

  if (error) {
    handleSupabaseError(error, "Failed to disconnect integration.");
  }
}

export async function updateUserIntegration(
  id: string,
  patch: UpdateUserIntegrationInput,
): Promise<UserIntegration> {
  const payload: Partial<UserIntegration> = {};

  if (Object.prototype.hasOwnProperty.call(patch, "display_name")) {
    payload.display_name = patch.display_name ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(patch, "access_data")) {
    payload.access_data = patch.access_data ?? {};
  }

  const { data, error } = await (supabase as any)
    .from("user_integrations")
    .update(payload)
    .eq("id", id)
    .select("id, user_id, project_id, provider, display_name, access_data, created_at")
    .single();

  if (error) {
    handleSupabaseError(error, "Failed to update integration.");
  }

  return data as UserIntegration;
}

export async function updateIntegrationConfig(
  input: UpdateIntegrationConfigInput,
): Promise<Integration> {
  const payload: Partial<Integration> = {};

  if (Object.prototype.hasOwnProperty.call(input.patch, "name")) {
    payload.name = input.patch.name;
  }

  if (Object.prototype.hasOwnProperty.call(input.patch, "enabled")) {
    payload.enabled = input.patch.enabled ?? false;
  }

  if (Object.prototype.hasOwnProperty.call(input.patch, "config")) {
    payload.config = input.patch.config ?? {};
  }

  const { data, error } = await (supabase as any)
    .from("integrations")
    .update(payload)
    .eq("key", input.key)
    .select("key, name, enabled, config")
    .single();

  if (error) {
    handleSupabaseError(error, "Failed to update integration config.");
  }

  return data as Integration;
}

export async function createWebhook(
  input: CreateIntegrationWebhookInput,
): Promise<Webhook> {
  return createWebhookRecord({
    target_url: input.targetUrl,
    secret: input.secret,
    active: input.active,
    project_id: input.projectId ?? null,
  });
}

export async function updateWebhook(
  id: string,
  patch: Partial<{ target_url: string; secret?: string | null; active?: boolean }>,
): Promise<Webhook> {
  return updateWebhookRecord(id, patch);
}

export async function deleteWebhook(id: string): Promise<void> {
  return deleteWebhookRecord(id);
}
