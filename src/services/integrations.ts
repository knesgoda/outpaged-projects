import { supabase } from "@/integrations/supabase/client";
import type { Integration, UserIntegration, Webhook } from "@/types";

async function requireUserId(errorMessage = "You must be signed in to manage integrations") {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }

  const user = data?.user;
  if (!user) {
    throw new Error(errorMessage);
  }

  return user.id;
}

export async function listIntegrations(): Promise<Integration[]> {
  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("enabled", true)
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as Integration[];
}

export async function listUserIntegrations(params?: { projectId?: string | null }): Promise<UserIntegration[]> {
  let query = supabase
    .from("user_integrations")
    .select("*")
    .order("created_at", { ascending: false });

  if (params?.projectId === null) {
    query = query.is("project_id", null);
  } else if (params?.projectId) {
    query = query.eq("project_id", params.projectId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as UserIntegration[];
}

export async function connectIntegration(input: {
  provider: UserIntegration["provider"];
  projectId?: string | null;
  displayName?: string;
  accessData?: any;
}): Promise<UserIntegration> {
  // TODO: Replace mock access data with real OAuth tokens for each provider.
  const userId = await requireUserId();
  const payload = {
    user_id: userId,
    provider: input.provider,
    project_id: input.projectId ?? null,
    display_name: input.displayName ?? null,
    access_data: input.accessData ?? { mock: true },
  };

  const { data, error } = await supabase
    .from("user_integrations")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to connect integration");
  }

  return data as UserIntegration;
}

export async function disconnectIntegration(id: string): Promise<void> {
  const { error } = await supabase.from("user_integrations").delete().eq("id", id);
  if (error) {
    throw error;
  }
}

export async function updateUserIntegration(
  id: string,
  patch: Partial<Pick<UserIntegration, "display_name" | "access_data">>
): Promise<UserIntegration> {
  const updates: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(patch, "display_name")) {
    updates.display_name = patch.display_name ?? null;
  }
  if (Object.prototype.hasOwnProperty.call(patch, "access_data")) {
    updates.access_data = patch.access_data ?? {};
  }

  const { data, error } = await supabase
    .from("user_integrations")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to update integration");
  }

  return data as UserIntegration;
}

export async function listWebhooks(projectId?: string | null): Promise<Webhook[]> {
  let query = supabase
    .from("webhooks")
    .select("*")
    .order("created_at", { ascending: false });

  if (projectId === undefined) {
    // all webhooks
  } else if (projectId === null) {
    query = query.is("project_id", null);
  } else {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as Webhook[];
}

function assertValidUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!parsed.protocol.startsWith("http")) {
      throw new Error("URL must use http or https");
    }
  } catch (error) {
    throw new Error("Enter a valid URL");
  }
}

export async function createWebhook(input: {
  projectId?: string | null;
  targetUrl: string;
  secret?: string | null;
}): Promise<Webhook> {
  if (!input.targetUrl) {
    throw new Error("Target URL is required");
  }
  assertValidUrl(input.targetUrl);

  const owner = await requireUserId("You must be signed in to manage webhooks");

  const { data, error } = await supabase
    .from("webhooks")
    .insert({
      owner,
      project_id: input.projectId ?? null,
      target_url: input.targetUrl,
      secret: input.secret ?? null,
    })
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to create webhook");
  }

  // TODO: Queue outbound deliveries with retry and backoff guarantees.
  return data as Webhook;
}

export async function updateWebhook(
  id: string,
  patch: Partial<Pick<Webhook, "target_url" | "secret" | "active">>
): Promise<Webhook> {
  const updates: Record<string, unknown> = {};

  if (patch.target_url !== undefined) {
    if (!patch.target_url) {
      throw new Error("Target URL is required");
    }
    assertValidUrl(patch.target_url);
    updates.target_url = patch.target_url;
  }

  if (patch.secret !== undefined) {
    updates.secret = patch.secret ?? null;
  }

  if (patch.active !== undefined) {
    updates.active = patch.active;
  }

  const { data, error } = await supabase
    .from("webhooks")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Unable to update webhook");
  }

  return data as Webhook;
}

export async function deleteWebhook(id: string): Promise<void> {
  const { error } = await supabase.from("webhooks").delete().eq("id", id);
  if (error) {
    throw error;
  }
}
