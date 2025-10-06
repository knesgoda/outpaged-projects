import { supabase } from "@/integrations/supabase/client";
import type { Webhook } from "@/types";
import { handleSupabaseError, requireUserId } from "@/services/utils";

function ensureValidUrl(url: string) {
  try {
    // eslint-disable-next-line no-new
    new URL(url);
  } catch {
    throw new Error("Enter a valid URL.");
  }
}

export async function listWebhooks(): Promise<Webhook[]> {
  const { data, error } = await supabase
    .from("webhooks")
    .select("id, owner, target_url, secret, active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    handleSupabaseError(error, "Failed to load webhooks.");
  }

  return (data as Webhook[]) ?? [];
}

export async function createWebhook(input: {
  target_url: string;
  secret?: string;
  active?: boolean;
}): Promise<Webhook> {
  ensureValidUrl(input.target_url);
  const owner = await requireUserId();

  const { data, error } = await supabase
    .from("webhooks")
    .insert({
      owner,
      target_url: input.target_url.trim(),
      secret: input.secret?.trim() || null,
      active: input.active ?? true,
    })
    .select("id, owner, target_url, secret, active, created_at")
    .single();

  if (error) {
    handleSupabaseError(error, "Failed to create webhook.");
  }

  return data as Webhook;
}

export async function updateWebhook(
  id: string,
  patch: Partial<{ target_url: string; secret?: string; active?: boolean }>
): Promise<Webhook> {
  const payload: Partial<Webhook> = {};
  if (typeof patch.target_url === "string") {
    ensureValidUrl(patch.target_url);
    payload.target_url = patch.target_url.trim();
  }
  if (typeof patch.secret !== "undefined") {
    payload.secret = patch.secret?.trim() || null;
  }
  if (typeof patch.active === "boolean") {
    payload.active = patch.active;
  }

  const { data, error } = await supabase
    .from("webhooks")
    .update(payload)
    .eq("id", id)
    .select("id, owner, target_url, secret, active, created_at")
    .single();

  if (error) {
    handleSupabaseError(error, "Failed to update webhook.");
  }

  return data as Webhook;
}

export async function deleteWebhook(id: string): Promise<void> {
  const { error } = await supabase.from("webhooks").delete().eq("id", id);

  if (error) {
    handleSupabaseError(error, "Failed to delete webhook.");
  }
}
