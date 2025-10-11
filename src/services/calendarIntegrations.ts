import type {
  CalendarConflictPreference,
  CalendarIntegration,
  CalendarIntegrationProvider,
} from "@/types/calendar";

function simulateNetwork<T>(value: T, delay = 400): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(value), delay);
  });
}

export async function connectIntegration(
  provider: CalendarIntegrationProvider,
  accountEmail: string
): Promise<CalendarIntegration> {
  const now = new Date().toISOString();
  return simulateNetwork({
    id: `integration-${provider}-${Date.now()}`,
    provider,
    accountEmail,
    status: "connected",
    lastSyncAt: now,
    conflictPreference: "platform",
    calendarsLinked: 1,
    scopes: ["events.read", "events.write"],
  });
}

export async function disconnectIntegration(integrationId: string): Promise<string> {
  return simulateNetwork(integrationId);
}

export async function triggerIntegrationSync(integrationId: string): Promise<{ id: string; syncedAt: string }> {
  return simulateNetwork({ id: integrationId, syncedAt: new Date().toISOString() }, 250);
}

export async function updateConflictPreference(
  integrationId: string,
  preference: CalendarConflictPreference
): Promise<{ id: string; preference: CalendarConflictPreference }> {
  return simulateNetwork({ id: integrationId, preference }, 200);
}
