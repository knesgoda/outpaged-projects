import type { RealtimeChannel } from "@supabase/supabase-js";

import { domainEventBus } from "@/domain/events/domainEventBus";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import {
  mapSupabaseError,
  type SupabaseLikeError,
} from "@/services/utils";
import type {
  CalendarConflictPreference,
  CalendarIntegration,
  CalendarIntegrationProvider,
  CalendarIntegrationStatus,
} from "@/types/calendar";

const CONNECT_FUNCTION = "calendar-connect-integration";
const DISCONNECT_FUNCTION = "calendar-disconnect-integration";
const SYNC_FUNCTION = "calendar-sync-integration";
const CONFLICT_PREF_RPC = "calendar_set_conflict_preference";
const INTEGRATION_EVENTS_CHANNEL = "calendar:integration-events";

type IntegrationRow = {
  id: string;
  provider: CalendarIntegrationProvider;
  account_email: string;
  status?: CalendarIntegrationStatus | string | null;
  last_sync_at?: string | null;
  sync_error?: string | null;
  conflict_preference?: CalendarConflictPreference | string | null;
  calendars_linked?: number | null;
  scopes?: string[] | null;
  pending_conflicts?: number | null;
};

type SyncInvocationResult = {
  integration: IntegrationRow;
  synced_at?: string | null;
  events_ingested?: number | null;
  conflicts?: { id: string }[] | string[] | null;
  origin?: "manual" | "webhook";
  retry_attempt?: number | null;
  error?: string | null;
};

export type CalendarIntegrationUpdateEvent = {
  type:
    | "connected"
    | "disconnected"
    | "status"
    | "synced"
    | "conflict-preference";
  integration: CalendarIntegration;
  origin: "manual" | "webhook";
  eventsIngested?: number;
  conflicts?: string[];
  retryAttempt?: number;
  error?: string | null;
};

type CalendarIntegrationListener = (event: CalendarIntegrationUpdateEvent) => void;

const integrationListeners = new Set<CalendarIntegrationListener>();
let integrationChannel: RealtimeChannel | null = null;
let integrationChannelPromise: Promise<RealtimeChannel | null> | null = null;

function normalizeStatus(value: unknown): CalendarIntegrationStatus {
  if (
    value === "disconnected" ||
    value === "connecting" ||
    value === "connected" ||
    value === "syncing" ||
    value === "error"
  ) {
    return value;
  }
  return "connected";
}

function mapIntegration(record: IntegrationRow | null | undefined): CalendarIntegration {
  if (!record) {
    return {
      id: `integration-${Date.now()}`,
      provider: "google",
      accountEmail: "unknown@example.com",
      status: "connecting",
      conflictPreference: "platform",
    };
  }

  return {
    id: record.id,
    provider: record.provider,
    accountEmail: record.account_email,
    status: normalizeStatus(record.status),
    lastSyncAt: record.last_sync_at ?? undefined,
    syncError: record.sync_error ?? null,
    conflictPreference: (record.conflict_preference as CalendarConflictPreference) ?? "platform",
    calendarsLinked: record.calendars_linked ?? undefined,
    scopes: record.scopes ?? undefined,
    pendingConflicts: record.pending_conflicts ?? undefined,
  };
}

function resolveConflicts(payload: SyncInvocationResult | null | undefined): string[] {
  if (!payload?.conflicts) {
    return [];
  }
  if (Array.isArray(payload.conflicts)) {
    if (payload.conflicts.every((item) => typeof item === "string")) {
      return payload.conflicts as string[];
    }
    return (payload.conflicts as { id: string }[]).map((item) => item.id).filter(Boolean);
  }
  return [];
}

function resolveSyncedAt(
  result: SyncInvocationResult | null | undefined,
  integration: CalendarIntegration
): string {
  if (result?.synced_at) {
    return result.synced_at;
  }
  if (result && typeof (result as any).syncedAt === "string") {
    return (result as any).syncedAt;
  }
  if (integration.lastSyncAt) {
    return integration.lastSyncAt;
  }
  return new Date().toISOString();
}

function mapError(error: SupabaseLikeError, fallback: string): Error {
  return mapSupabaseError(error, fallback);
}

function notifyIntegrationUpdate(event: CalendarIntegrationUpdateEvent) {
  for (const listener of integrationListeners) {
    try {
      listener(event);
    } catch (error) {
      console.error("Calendar integration listener failed", error);
    }
  }

  if (event.origin === "webhook" && (event.eventsIngested ?? 0) > 0) {
    domainEventBus.publish({
      type: "integration.event_ingested",
      payload: {
        integrationId: event.integration.id,
        provider: event.integration.provider,
        eventsIngested: event.eventsIngested ?? 0,
        conflicts: event.conflicts ?? [],
        status: event.integration.status,
      },
    });
  }

  if (event.origin === "manual" && (event.eventsIngested ?? 0) > 0) {
    domainEventBus.publish({
      type: "calendar.drag_reschedule",
      payload: {
        integrationId: event.integration.id,
        syncedAt: event.integration.lastSyncAt ?? new Date().toISOString(),
        eventsIngested: event.eventsIngested ?? 0,
        conflicts: event.conflicts ?? [],
      },
    });
  }
}

async function ensureIntegrationChannel(): Promise<RealtimeChannel | null> {
  if (!supabaseConfigured) {
    return null;
  }

  if (integrationChannel) {
    return integrationChannel;
  }

  if (integrationChannelPromise) {
    return integrationChannelPromise;
  }

  integrationChannelPromise = (async () => {
    const channel = supabase.channel(INTEGRATION_EVENTS_CHANNEL, {
      config: { broadcast: { ack: true } },
    });

    channel.on("broadcast", { event: "integration.sync" }, ({ payload }) => {
      const result = payload as SyncInvocationResult;
      const integration = mapIntegration(result?.integration);
      integration.lastSyncAt = resolveSyncedAt(result, integration);
      integration.status = normalizeStatus(result?.integration?.status ?? "connected");
      integration.syncError = result?.error ?? integration.syncError ?? null;
      const conflicts = resolveConflicts(result);
      if (conflicts.length > 0) {
        integration.pendingConflicts = conflicts.length;
      } else if (typeof integration.pendingConflicts === "undefined") {
        integration.pendingConflicts = 0;
      }

      notifyIntegrationUpdate({
        type: "synced",
        integration,
        origin: result?.origin ?? "webhook",
        eventsIngested: result?.events_ingested ?? undefined,
        conflicts,
        retryAttempt: result?.retry_attempt ?? undefined,
        error: result?.error ?? undefined,
      });
    });

    channel.on("broadcast", { event: "integration.status" }, ({ payload }) => {
      const row = (payload as { integration: IntegrationRow } | IntegrationRow) ?? null;
      const record = ("integration" in (row ?? {}) ? (row as any).integration : row) as IntegrationRow | null;
      const integration = mapIntegration(record);
      notifyIntegrationUpdate({
        type: "status",
        integration,
        origin: (payload as any)?.origin ?? "webhook",
        eventsIngested: undefined,
        conflicts: [],
      });
    });

    channel.on("broadcast", { event: "integration.disconnected" }, ({ payload }) => {
      const record = (payload as IntegrationRow | null) ?? null;
      const integration = mapIntegration(record);
      notifyIntegrationUpdate({
        type: "disconnected",
        integration,
        origin: (payload as any)?.origin ?? "webhook",
      });
    });

    try {
      const subscription = await channel.subscribe();
      if ((subscription as any)?.error) {
        console.error("Failed to subscribe to calendar integration channel", (subscription as any).error);
        return null;
      }
    } catch (error) {
      console.error("Unable to subscribe to calendar integration events", error);
      return null;
    }

    integrationChannel = channel;
    return channel;
  })();

  const channel = await integrationChannelPromise;
  if (!channel) {
    integrationChannelPromise = null;
  }
  return channel;
}

async function teardownIntegrationChannel() {
  if (!integrationChannel) {
    return;
  }
  try {
    await integrationChannel.unsubscribe();
  } catch (error) {
    console.warn("Failed to unsubscribe from integration channel", error);
  } finally {
    integrationChannel = null;
    integrationChannelPromise = null;
  }
}

async function invokeCalendarFunction<TResult>(
  name: string,
  payload: Record<string, unknown>,
  fallbackMessage: string
): Promise<TResult | null> {
  const { data, error } = await supabase.functions.invoke<TResult>(name, {
    body: payload,
  });

  if (error) {
    throw mapError(error as SupabaseLikeError, fallbackMessage);
  }

  return data ?? null;
}

async function callConflictPreferenceRpc(
  integrationId: string,
  preference: CalendarConflictPreference
): Promise<IntegrationRow | null> {
  const { data, error } = await supabase.rpc(CONFLICT_PREF_RPC, {
    integration_id: integrationId,
    conflict_preference: preference,
  });

  if (error) {
    throw mapError(error as SupabaseLikeError, "Unable to update conflict preference.");
  }

  if (!data) {
    return null;
  }

  if (Array.isArray(data) && data.length > 0) {
    return data[0] as IntegrationRow;
  }

  return data as IntegrationRow;
}

function buildFallbackIntegration(
  provider: CalendarIntegrationProvider,
  accountEmail: string
): CalendarIntegration {
  return {
    id: `integration-${provider}-${Date.now()}`,
    provider,
    accountEmail,
    status: "connecting",
    lastSyncAt: new Date().toISOString(),
    conflictPreference: "platform",
    calendarsLinked: 0,
    scopes: ["events.read", "events.write"],
    pendingConflicts: 0,
  };
}

export function subscribeToIntegrationUpdates(listener: CalendarIntegrationListener): () => void {
  integrationListeners.add(listener);
  void ensureIntegrationChannel();
  return () => {
    integrationListeners.delete(listener);
    if (integrationListeners.size === 0) {
      void teardownIntegrationChannel();
    }
  };
}

export async function connectIntegration(
  provider: CalendarIntegrationProvider,
  accountEmail: string
): Promise<CalendarIntegration> {
  const result = await invokeCalendarFunction<{ integration: IntegrationRow | null }>(
    CONNECT_FUNCTION,
    { provider, accountEmail },
    "Unable to connect calendar integration."
  );

  const integrationRecord = result?.integration ?? null;
  const integration = mapIntegration(integrationRecord ?? undefined);
  if (!integrationRecord) {
    const fallback = buildFallbackIntegration(provider, accountEmail);
    notifyIntegrationUpdate({
      type: "connected",
      integration: fallback,
      origin: "manual",
    });
    return fallback;
  }

  notifyIntegrationUpdate({
    type: "connected",
    integration,
    origin: "manual",
  });

  return integration;
}

export async function disconnectIntegration(integrationId: string): Promise<string> {
  const result = await invokeCalendarFunction<{ integration: IntegrationRow | null } | null>(
    DISCONNECT_FUNCTION,
    { integrationId },
    "Unable to disconnect calendar integration."
  );

  const integration = mapIntegration(result?.integration ?? undefined);
  integration.id = integrationId;
  integration.status = "disconnected";

  notifyIntegrationUpdate({
    type: "disconnected",
    integration,
    origin: "manual",
  });

  return integrationId;
}

export async function triggerIntegrationSync(
  integrationId: string,
  options?: { retry?: boolean }
): Promise<{ id: string; syncedAt: string }> {
  const result = await invokeCalendarFunction<SyncInvocationResult | null>(
    SYNC_FUNCTION,
    {
      integrationId,
      retry: options?.retry ?? false,
    },
    "Unable to trigger calendar sync."
  );

  const integration = mapIntegration(result?.integration ?? undefined);
  if (!integration.id) {
    integration.id = integrationId;
  }
  integration.lastSyncAt = resolveSyncedAt(result ?? undefined, integration);
  integration.status = normalizeStatus(result?.integration?.status ?? "syncing");
  integration.syncError = result?.error ?? null;

  const eventsIngested = result?.events_ingested ?? 0;
  const conflicts = resolveConflicts(result ?? undefined);
  if (conflicts.length > 0) {
    integration.pendingConflicts = conflicts.length;
  } else if (typeof integration.pendingConflicts === "undefined") {
    integration.pendingConflicts = 0;
  }

  notifyIntegrationUpdate({
    type: "synced",
    integration,
    origin: result?.origin ?? "manual",
    eventsIngested,
    conflicts,
    retryAttempt: result?.retry_attempt ?? (options?.retry ? 1 : undefined),
    error: result?.error ?? undefined,
  });

  return { id: integration.id, syncedAt: integration.lastSyncAt ?? new Date().toISOString() };
}

export async function updateConflictPreference(
  integrationId: string,
  preference: CalendarConflictPreference
): Promise<{ id: string; preference: CalendarConflictPreference }> {
  const record = await callConflictPreferenceRpc(integrationId, preference);
  const integration = mapIntegration(record ?? undefined);
  integration.id = integrationId;
  integration.conflictPreference = preference;

  notifyIntegrationUpdate({
    type: "conflict-preference",
    integration,
    origin: "manual",
  });

  return { id: integrationId, preference };
}
