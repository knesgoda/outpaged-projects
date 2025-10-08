import { supabase } from "@/integrations/supabase/client";
import type { NotificationPreferences } from "@/types";

export async function getMyNotificationPreferences(): Promise<NotificationPreferences | null> {
  const { data, error, status } = await supabase
    .from("user_notification_preferences" as any)
    .select("*")
    .maybeSingle();

  if (error && status !== 406) {
    throw new Error(error.message || "Failed to load notification preferences");
  }

  return (data as any as NotificationPreferences | null) ?? null;
}

export async function upsertMyNotificationPreferences(
  patch: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) {
    throw new Error(authError.message || "Failed to resolve current user");
  }

  if (!user) {
    throw new Error("Not authenticated");
  }

  const payload: Record<string, unknown> = {
    user_id: user.id,
    updated_at: new Date().toISOString(),
  };

  if (patch.in_app) {
    payload.in_app = patch.in_app;
  }

  if (patch.email) {
    payload.email = patch.email;
  }

  if (patch.digest_frequency) {
    payload.digest_frequency = patch.digest_frequency;
  }

  const { data, error } = await supabase
    .from("user_notification_preferences" as any)
    .upsert(payload as any, { onConflict: "user_id" })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message || "Failed to update notification preferences");
  }

  return data as any as NotificationPreferences;
}
