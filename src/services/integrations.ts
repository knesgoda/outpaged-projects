import { supabase } from "@/integrations/supabase/client";
import type { IntegrationKey, UserIntegration } from "@/types";

export type IntegrationRecord = {
  key: IntegrationKey;
  name: string;
  enabled: boolean;
  config: any;
};

type ListUserIntegrationsParams = {
  projectId?: string;
};

type ConnectIntegrationInput = {
  provider: UserIntegration["provider"];
  projectId?: string | null;
  displayName?: string;
  accessData?: any;
};

const PROVIDER_NAMES: Record<IntegrationKey, string> = {
  gmail: "Gmail",
  google_calendar: "Google Calendar",
  google_docs: "Google Docs",
  github: "GitHub",
};

const PROVIDER_DEFAULT_CONFIG: Record<IntegrationKey, any> = {
  gmail: {
    client_id: "",
    redirect_uri: "",
    scopes: ["https://mail.google.com/"],
  },
  google_calendar: {
    client_id: "",
    redirect_uri: "",
    calendar_id_default: "",
  },
  google_docs: {
    client_id: "",
    redirect_uri: "",
  },
  github: {
    app_url: "",
    webhook_url: "",
    webhook_secret: "",
    default_repo: "",
  },
};

const mergeConfig = (key: IntegrationKey, config: any | null | undefined, patch?: any) => ({
  ...PROVIDER_DEFAULT_CONFIG[key],
  ...(config ?? {}),
  ...(patch ?? {}),
});

export async function listIntegrations(): Promise<IntegrationRecord[]> {
  const { data, error } = await supabase
    .from("integrations")
    .select("key, name, enabled, config")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message || "Failed to load integrations");
  }

  const existing = (data ?? []).map((row) => ({
    key: row.key as IntegrationKey,
    name: row.name ?? PROVIDER_NAMES[row.key as IntegrationKey] ?? row.key,
    enabled: row.enabled ?? true,
    config: mergeConfig(row.key as IntegrationKey, row.config),
  }));

  const foundKeys = new Set(existing.map((item) => item.key));

  const withDefaults: IntegrationRecord[] = [...existing];

  (Object.keys(PROVIDER_NAMES) as IntegrationKey[]).forEach((key) => {
    if (!foundKeys.has(key)) {
      withDefaults.push({
        key,
        name: PROVIDER_NAMES[key],
        enabled: false,
        config: PROVIDER_DEFAULT_CONFIG[key],
      });
    }
  });

  return withDefaults.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listUserIntegrations(
  params?: ListUserIntegrationsParams
): Promise<UserIntegration[]> {
  const { projectId } = params || {};

  let query = supabase
    .from("user_integrations")
    .select("*")
    .order("created_at", { ascending: false });

  if (projectId) {
    const orFilter = `project_id.eq.${projectId},project_id.is.null`;
    query = query.or(orFilter);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || "Failed to load user integrations");
  }

  return (data ?? []) as UserIntegration[];
}

export async function connectIntegration(
  input: ConnectIntegrationInput
): Promise<UserIntegration> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message || "Unable to resolve current user");
  }

  if (!user?.id) {
    throw new Error("You must be signed in to connect an integration");
  }

  const payload = {
    user_id: user.id,
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
    throw new Error(error.message || "Failed to connect integration");
  }

  return data as UserIntegration;
}

export async function disconnectIntegration(id: string): Promise<void> {
  const { error } = await supabase
    .from("user_integrations")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(error.message || "Failed to disconnect integration");
  }
}

export async function updateIntegrationConfig(
  key: IntegrationKey,
  patch: any
): Promise<void> {
  const { data, error } = await supabase
    .from("integrations")
    .select("config, enabled, name")
    .eq("key", key)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to load integration config");
  }

  const mergedConfig = mergeConfig(key, data?.config, patch);

  const { error: upsertError } = await supabase
    .from("integrations")
    .upsert(
      {
        key,
        name: data?.name ?? PROVIDER_NAMES[key],
        enabled: data?.enabled ?? true,
        config: mergedConfig,
      },
      { onConflict: "key" }
    );

  if (upsertError) {
    throw new Error(upsertError.message || "Failed to update integration config");
  }
}
