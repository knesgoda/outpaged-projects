// Stub file - original disabled due to missing database function
// TODO: Re-enable when calendar_set_conflict_preference function is created

export function syncCalendarEvents() {
  console.warn("Calendar integrations are temporarily disabled");
  return Promise.resolve();
}

export function triggerIntegrationSync(integrationId: string) {
  console.warn("Calendar integrations are temporarily disabled");
  return Promise.resolve({ syncedAt: new Date().toISOString() });
}

export function connectIntegration() {
  console.warn("Calendar integrations are temporarily disabled");
  return Promise.resolve();
}

export function disconnectIntegration() {
  console.warn("Calendar integrations are temporarily disabled");
  return Promise.resolve();
}

export function subscribeToIntegrationUpdates() {
  console.warn("Calendar integrations are temporarily disabled");
  return () => {}; // Return unsubscribe function
}

export function updateConflictPreference() {
  console.warn("Calendar integrations are temporarily disabled");
  return Promise.resolve();
}

export type CalendarEvent = any;
