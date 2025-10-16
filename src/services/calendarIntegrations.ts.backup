import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type {
  CalendarConflictPreference,
  CalendarIntegration,
  CalendarIntegrationProvider,
} from "@/types/calendar";
import { mapSupabaseError } from "./utils";

type IntegrationRow = Database["public"]["Tables"]["calendar_integrations"]["Row"];

function deserializeIntegration(row: IntegrationRow): CalendarIntegration {
  return {
    id: row.id,
    provider: row.provider,
    accountEmail: row.account_email,
    status: row.status,
    lastSyncAt: row.last_sync_at ?? undefined,
    syncError: row.sync_error,
    conflictPreference: row.conflict_preference,
    calendarsLinked: row.calendars_linked ?? undefined,
    scopes: row.scopes ?? undefined,
    pendingConflicts: row.pending_conflicts ?? undefined,
  };
}

export async function fetchCalendarIntegrations(): Promise<CalendarIntegration[]> {
  const { data, error } = await supabase
    .from("calendar_integrations")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw mapSupabaseError(error, "Unable to load calendar integrations");
  }

  return (data ?? []).map(deserializeIntegration);
}

export async function connectIntegration(
  provider: CalendarIntegrationProvider,
  accountEmail: string
): Promise<CalendarIntegration> {
  const { data, error } = await supabase
    .from("calendar_integrations")
    .insert({
      provider,
      account_email: accountEmail,
      status: "connecting",
      conflict_preference: "platform",
      pending_conflicts: 0,
    })
    .select("*")
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to connect integration");
  }

  return deserializeIntegration(data);
}

export async function disconnectIntegration(integrationId: string): Promise<void> {
  const { error } = await supabase
    .from("calendar_integrations")
    .delete()
    .eq("id", integrationId);

  if (error) {
    throw mapSupabaseError(error, "Unable to disconnect integration");
  }
}

export async function triggerIntegrationSync(integrationId: string) {
  const syncedAt = new Date().toISOString();
  const { error } = await supabase
    .from("calendar_integrations")
    .update({ status: "syncing", last_sync_at: syncedAt })
    .eq("id", integrationId);

  if (error) {
    throw mapSupabaseError(error, "Unable to trigger integration sync");
  }

  return { id: integrationId, syncedAt };
}

export async function updateConflictPreference(
  integrationId: string,
  preference: CalendarConflictPreference
): Promise<void> {
  const { error } = await supabase
    .from("calendar_integrations")
    .update({ conflict_preference: preference })
    .eq("id", integrationId);

  if (error) {
    throw mapSupabaseError(error, "Unable to update integration settings");
  }
}

export function subscribeToIntegrationUpdates(
  _callback: (payload: { type: "updated" | "disconnected"; integration: CalendarIntegration }) => void
) {
  return () => {};
}

export async function syncCalendarEvents(): Promise<void> {
  await supabase.rpc("sync_calendar_integrations").catch(() => {
    // ignore missing RPC for now
  });
}
