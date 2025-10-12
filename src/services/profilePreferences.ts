import { supabase } from "@/integrations/supabase/client";
import { requireUserId } from "@/services/utils";

export interface ProfilePreferencesPayload {
  favorites: string[];
  viewSettings: Record<string, unknown>;
  layoutSelections: Record<string, unknown>;
  updatedAt: string;
}

const REST_ENDPOINT = "/api/profile/preferences";
const EMPTY_PREFERENCES: ProfilePreferencesPayload = {
  favorites: [],
  viewSettings: {},
  layoutSelections: {},
  updatedAt: new Date(0).toISOString(),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizePreferences(input: unknown): ProfilePreferencesPayload {
  if (!isRecord(input)) {
    return { ...EMPTY_PREFERENCES };
  }

  const rawFavorites = Array.isArray((input as Record<string, unknown>).favorites)
    ? ((input as Record<string, unknown>).favorites as unknown[])
    : [];
  const favorites = rawFavorites.filter((value): value is string => typeof value === "string");

  const viewSettingsSource =
    (input.view_settings as Record<string, unknown> | undefined) ??
    (input.viewSettings as Record<string, unknown> | undefined);
  const layoutSelectionsSource =
    (input.layout_selections as Record<string, unknown> | undefined) ??
    (input.layoutSelections as Record<string, unknown> | undefined);

  const updatedAtSource =
    typeof input.updated_at === "string"
      ? input.updated_at
      : typeof input.updatedAt === "string"
        ? input.updatedAt
        : EMPTY_PREFERENCES.updatedAt;

  return {
    favorites,
    viewSettings: viewSettingsSource && isRecord(viewSettingsSource) ? { ...viewSettingsSource } : {},
    layoutSelections:
      layoutSelectionsSource && isRecord(layoutSelectionsSource) ? { ...layoutSelectionsSource } : {},
    updatedAt: updatedAtSource,
  } satisfies ProfilePreferencesPayload;
}

async function fetchPreferencesFromRest(method: "GET" | "PUT", body?: ProfilePreferencesPayload) {
  if (typeof fetch === "undefined") {
    return method === "GET" ? { ...EMPTY_PREFERENCES } : null;
  }

  const response = await fetch(REST_ENDPOINT, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: method === "PUT" ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Failed to load profile preferences");
    throw new Error(errorText || response.statusText);
  }

  if (method === "GET") {
    const payload = await response.json().catch(() => null);
    return normalizePreferences(payload);
  }

  return null;
}

export async function getMyProfilePreferences(): Promise<ProfilePreferencesPayload> {
  const userId = await requireUserId();

  try {
    const { data, error } = await (supabase
      .from("profile_preferences" as any)
      .select("favorites, view_settings, layout_selections, updated_at")
      .eq("user_id", userId)
      .maybeSingle() as any);

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (!data) {
      return { ...EMPTY_PREFERENCES };
    }

    return normalizePreferences(data);
  } catch (error) {
    console.warn("Supabase profile preferences unavailable, falling back to REST", error);
    const rest = await fetchPreferencesFromRest("GET");
    return rest ?? { ...EMPTY_PREFERENCES };
  }
}

export async function updateMyProfilePreferences(
  preferences: ProfilePreferencesPayload
): Promise<ProfilePreferencesPayload> {
  const userId = await requireUserId();
  const payload = {
    user_id: userId,
    favorites: preferences.favorites ?? [],
    view_settings: preferences.viewSettings ?? {},
    layout_selections: preferences.layoutSelections ?? {},
    updated_at: preferences.updatedAt ?? new Date().toISOString(),
  };

  try {
    const { data, error } = await (supabase
      .from("profile_preferences" as any)
      .upsert(payload, { onConflict: "user_id" })
      .select("favorites, view_settings, layout_selections, updated_at")
      .single() as any);

    if (error) {
      throw error;
    }

    return normalizePreferences(data);
  } catch (error) {
    console.warn("Supabase profile preference update failed, falling back to REST", error);
    await fetchPreferencesFromRest("PUT", preferences);
    return { ...preferences, updatedAt: preferences.updatedAt ?? new Date().toISOString() };
  }
}
