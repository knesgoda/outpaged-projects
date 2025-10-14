// Stub file - original disabled due to missing database function
// TODO: Re-enable when calendar_set_conflict_preference function is created

export function syncCalendarEvents() {
  console.warn("Calendar integrations are temporarily disabled");
  return Promise.resolve();
}

export function triggerIntegrationSync(integrationId: string) {
  console.warn("Calendar integrations are temporarily disabled");
  return Promise.resolve({ id: integrationId, syncedAt: new Date().toISOString() });
}

export function connectIntegration(provider?: any, accountEmail?: string) {
  console.warn("Calendar integrations are temporarily disabled");
  // Return a stub integration object so UI logic can proceed during development
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `stub-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return Promise.resolve({
    id,
    provider: provider ?? "stub",
    accountEmail: accountEmail ?? "stub@example.com",
    status: "connected",
    conflictPreference: "prefer_external",
    pendingConflicts: 0,
    lastSyncAt: new Date().toISOString(),
  } as any);
}

export function disconnectIntegration(integrationId?: string) {
  console.warn("Calendar integrations are temporarily disabled");
  return Promise.resolve({ id: integrationId });
}

export function subscribeToIntegrationUpdates(callback?: (event: any) => void) {
  console.warn("Calendar integrations are temporarily disabled");
  // No real-time updates in stub; return a no-op unsubscribe
  return () => {};
}

export function updateConflictPreference(integrationId?: string, _preference?: any) {
  console.warn("Calendar integrations are temporarily disabled");
  return Promise.resolve({ id: integrationId });
}

export type CalendarEvent = any;
