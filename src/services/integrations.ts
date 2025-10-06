import { supabase } from "@/integrations/supabase/client";
import type { Integration, UserIntegration, Webhook } from "@/types";
import { mapSupabaseError, requireUserId } from "./utils";

const DEFAULT_INTEGRATIONS: Record<Integration["key"], { name: string; config: any }> = {
  slack: {
    name: "Slack",
    config: {
      default_channel: "",
      notify_on: ["status_changes", "approvals"],
    },
  },
  github: {
    name: "GitHub",
    config: {
      default_repo: "",
      events: ["pull_requests", "issues"],
    },
  },
  google_drive: {
    name: "Google Drive",
    config: {
      default_folder_id: "",
    },
  },
  webhooks: {
    name: "Webhooks",
    config: {},
  },
};

const PROVIDER_ORDER: Integration["key"][] = ["slack", "github", "google_drive", "webhooks"];

const normalizeIntegrationRow = (row: any): Integration => {
  const key = (row.key ?? "slack") as Integration["key"];
  const defaults = DEFAULT_INTEGRATIONS[key];
  return {
    key,
    name: row.name ?? defaults?.name ?? key,
    enabled: row.enabled ?? true,
    config: {
      ...(defaults?.config ?? {}),
      ...(row.config ?? {}),
    },
  };
};

const ensureUrl = (value: string, errorMessage: string) => {
  try {
    new URL(value);
    return value.trim();
  } catch {
    throw new Error(errorMessage);
  }
};

export async function listIntegrations(): Promise<Integration[]> {
  const { data, error } = await supabase
    .from("integrations")
    .select("key, name, enabled, config")
    .in("key", PROVIDER_ORDER)
    .order("name", { ascending: true });

  if (error) {
    throw mapSupabaseError(error, "Unable to load integrations.");
  }

  const existing = (data ?? []).map(normalizeIntegrationRow);
  const foundKeys = new Set(existing.map((item) => item.key));

  const merged: Integration[] = [...existing];

  for (const key of PROVIDER_ORDER) {
    if (!foundKeys.has(key)) {
      const defaults = DEFAULT_INTEGRATIONS[key];
      merged.push({
        key,
        name: defaults.name,
        enabled: true,
        config: defaults.config,
      });
    }
  }

  return merged.sort((a, b) => a.name.localeCompare(b.name));
}

type ListUserIntegrationsParams = {
  projectId?: string;
};

export async function listUserIntegrations(params: ListUserIntegrationsParams = {}): Promise<UserIntegration[]> {
  const { projectId } = params;

  let query = supabase
    .from("user_integrations")
    .select("*")
    .order("created_at", { ascending: false });

  if (projectId) {
    query = query.or(`project_id.eq.${projectId},project_id.is.null`);
  }

  const { data, error } = await query;

  if (error) {
    throw mapSupabaseError(error, "Unable to load integration connections.");
  }

  return (data ?? []) as UserIntegration[];
}

type ConnectIntegrationInput = {
  provider: UserIntegration["provider"];
  projectId?: string | null;
  displayName?: string;
  accessData?: any;
};

export async function connectIntegration(input: ConnectIntegrationInput): Promise<UserIntegration> {
  // TODO: Replace mock connect flow with real OAuth / app installation per provider.
  const userId = await requireUserId();

  const payload = {
    user_id: userId,
    project_id: input.projectId ?? null,
    provider: input.provider,
    display_name: input.displayName ?? null,
    access_data: input.accessData ?? { mock: true },
  };

  const { data, error } = await supabase
    .from("user_integrations")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to connect integration.");
  }

  return data as UserIntegration;
}

export async function disconnectIntegration(id: string): Promise<void> {
  const { error } = await supabase.from("user_integrations").delete().eq("id", id);

  if (error) {
    throw mapSupabaseError(error, "Unable to disconnect integration.");
  }
}

type UpdateUserIntegrationInput = Partial<Pick<UserIntegration, "display_name" | "access_data">>;

export async function updateUserIntegration(id: string, patch: UpdateUserIntegrationInput): Promise<UserIntegration> {
  const payload: Record<string, any> = {};
  if (typeof patch.display_name !== "undefined") {
    payload.display_name = patch.display_name ?? null;
  }
  if (typeof patch.access_data !== "undefined") {
    payload.access_data = patch.access_data ?? {};
  }

  const { data, error } = await supabase
    .from("user_integrations")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to update integration settings.");
  }

  return data as UserIntegration;
}

export async function listWebhooks(projectId?: string): Promise<Webhook[]> {
  let query = supabase
    .from("webhooks")
    .select("*")
    .order("created_at", { ascending: false });

  if (projectId) {
    query = query.eq("project_id", projectId);
  } else {
    query = query.is("project_id", null);
  }

  const { data, error } = await query;

  if (error) {
    throw mapSupabaseError(error, "Unable to load webhooks.");
  }

  return (data ?? []) as Webhook[];
}

type CreateWebhookInput = {
  projectId?: string | null;
  targetUrl: string;
  secret?: string | null;
};

export async function createWebhook(input: CreateWebhookInput): Promise<Webhook> {
  // TODO: Implement outbound webhook queue with retries and signing support.
  const owner = await requireUserId();
  const target_url = ensureUrl(input.targetUrl, "Enter a valid URL.");
  const secret = input.secret?.trim() || null;

  const { data, error } = await supabase
    .from("webhooks")
    .insert({
      owner,
      project_id: input.projectId ?? null,
      target_url,
      secret,
      active: true,
    })
    .select("*")
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to create webhook.");
  }

  return data as Webhook;
}

type UpdateWebhookInput = Partial<Pick<Webhook, "target_url" | "secret" | "active">>;

export async function updateWebhook(id: string, patch: UpdateWebhookInput): Promise<Webhook> {
  const payload: Record<string, any> = {};

  if (typeof patch.target_url === "string") {
    payload.target_url = ensureUrl(patch.target_url, "Enter a valid URL.");
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
    .select("*")
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to update webhook.");
  }

  return data as Webhook;
}

export async function deleteWebhook(id: string): Promise<void> {
  const { error } = await supabase.from("webhooks").delete().eq("id", id);

  if (error) {
    throw mapSupabaseError(error, "Unable to delete webhook.");
  }
}

export async function updateIntegrationConfig(
  key: Integration["key"],
  patch: any
): Promise<void> {
  const defaults = DEFAULT_INTEGRATIONS[key];
  const { data, error } = await supabase
    .from("integrations")
    .select("config, enabled, name")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    throw mapSupabaseError(error, "Unable to load integration config.");
  }

  const mergedConfig = {
    ...(defaults?.config ?? {}),
    ...(data?.config ?? {}),
    ...(patch ?? {}),
  };

  const { error: upsertError } = await supabase
    .from("integrations")
    .upsert(
      {
        key,
        name: data?.name ?? defaults?.name ?? key,
        enabled: data?.enabled ?? true,
        config: mergedConfig,
      },
      { onConflict: "key" }
    );

  if (upsertError) {
    throw mapSupabaseError(upsertError, "Unable to update integration config.");
  }
}
