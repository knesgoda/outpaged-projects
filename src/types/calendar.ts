export type CalendarLayerType = "personal" | "team" | "project" | "workspace" | "external";

export interface CalendarLayer {
  id: string;
  name: string;
  type: CalendarLayerType;
  color: string;
  description?: string;
  subscribed: boolean;
  visible: boolean;
  timezone?: string;
  isReadOnly?: boolean;
}

export type CalendarDensity = "compact" | "comfortable" | "spacious";

export interface CalendarSavedView {
  id: string;
  name: string;
  calendarIds: string[];
  description?: string;
}

export type CalendarEventStatus = "confirmed" | "tentative" | "cancelled" | "milestone" | "busy";

export type CalendarEventPriority = "low" | "normal" | "high" | "critical";

export type CalendarEventVisibility = "private" | "team" | "project" | "workspace" | "org";

export type CalendarEventType =
  | "meeting"
  | "task"
  | "milestone"
  | "sprint"
  | "release"
  | "focus"
  | "availability";

export interface CalendarEventResource {
  id: string;
  name: string;
  type: "room" | "equipment" | "virtual";
  capacity?: number;
  location?: string;
}

export interface CalendarEventAttendee {
  id: string;
  name: string;
  email?: string;
  response?: "accepted" | "declined" | "tentative" | "needs-action";
}

export interface CalendarEventReminder {
  id: string;
  offsetMinutes: number;
  method: "popup" | "email" | "push" | "slack" | "webhook";
}

export interface CalendarEventLink {
  id: string;
  type: "task" | "epic" | "release" | "sprint" | "document";
  label: string;
  href?: string;
}

export interface CalendarEventAttachment {
  id: string;
  name: string;
  url: string;
  size?: number;
}

export type CalendarIntegrationProvider = "google" | "outlook" | "apple";

export type CalendarIntegrationStatus = "disconnected" | "connecting" | "connected" | "syncing" | "error";

export type CalendarConflictPreference = "platform" | "external";

export interface CalendarIntegration {
  id: string;
  provider: CalendarIntegrationProvider;
  accountEmail: string;
  status: CalendarIntegrationStatus;
  lastSyncAt?: string;
  syncError?: string | null;
  conflictPreference: CalendarConflictPreference;
  calendarsLinked?: number;
  scopes?: string[];
}

export type CalendarAutomationTrigger =
  | "event-created"
  | "event-updated"
  | "event-starting"
  | "event-conflict"
  | "external-sync";

export type CalendarAutomationAction = "create-task" | "post-channel" | "add-to-sprint" | "notify-owner";

export interface CalendarAutomationRule {
  id: string;
  name: string;
  description?: string;
  trigger: CalendarAutomationTrigger;
  action: CalendarAutomationAction;
  enabled: boolean;
  config?: Record<string, unknown>;
}

export type CalendarShareRole = "viewer" | "editor" | "manager";

export interface CalendarShareTarget {
  id: string;
  type: "user" | "team" | "group" | "external";
  name: string;
  email?: string;
}

export interface CalendarShareSetting {
  id: string;
  calendarId: string;
  target: CalendarShareTarget;
  role: CalendarShareRole;
  canShare?: boolean;
  subscribed?: boolean;
}

export type CalendarRSVPStatus = "accepted" | "declined" | "tentative" | "needs-action";

export interface CalendarInvitation {
  id: string;
  eventId: string;
  invitee: CalendarShareTarget;
  status: CalendarRSVPStatus;
  respondedAt?: string;
  responseNote?: string;
  icsUrl?: string;
}

export interface CalendarFollower {
  id: string;
  target: CalendarShareTarget;
  subscribedAt: string;
}

export interface CalendarCommentMention {
  id: string;
  name: string;
}

export interface CalendarComment {
  id: string;
  eventId?: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  body: string;
  mentions?: CalendarCommentMention[];
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  projectId?: string;
  title: string;
  description?: string;
  start: string;
  end: string;
  allDay?: boolean;
  timezone?: string;
  location?: string;
  organizer?: string;
  attendees?: CalendarEventAttendee[];
  linkedItems?: CalendarEventLink[];
  color?: string;
  priority?: CalendarEventPriority;
  visibility?: CalendarEventVisibility;
  reminders?: CalendarEventReminder[];
  attachments?: CalendarEventAttachment[];
  videoLink?: string | null;
  status?: CalendarEventStatus;
  type?: CalendarEventType;
  recurrenceRule?: string | null;
  recurrenceExceptions?: string[];
  isRecurringInstance?: boolean;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  ownerId?: string;
  ownerName?: string;
  teamId?: string;
  teamName?: string;
  labels?: string[];
  resources?: CalendarEventResource[];
  resourceIds?: string[];
  hasAttachments?: boolean;
  hasReminders?: boolean;
  syncSource?: CalendarIntegrationProvider;
  externalId?: string;
  derivedFrom?: { id: string; type: "task" | "sprint" | "release" | "vacation"; label?: string }[];
  invitations?: CalendarInvitation[];
  followers?: CalendarFollower[];
  comments?: CalendarComment[];
  privacyOverrides?: CalendarShareSetting[];
  workingHoursImpact?: "within" | "outside" | "holiday";
  automationRuleIds?: string[];
}

export type CalendarColorEncoding = "calendar" | "status" | "type" | "priority" | "custom";

export type CalendarFilterField =
  | "calendar"
  | "owner"
  | "team"
  | "project"
  | "status"
  | "type"
  | "label"
  | "priority"
  | "linkedItemType"
  | "hasAttachments"
  | "hasReminders"
  | "timeRange";

export type CalendarFilterOperator =
  | "equals"
  | "not-equals"
  | "includes"
  | "excludes"
  | "exists"
  | "not-exists"
  | "in-range";

export interface CalendarFilterCondition {
  id: string;
  field: CalendarFilterField;
  operator: CalendarFilterOperator;
  value?: string | string[] | { from: string; to: string } | null;
}

export interface CalendarFilterGroup {
  id: string;
  logic: "AND" | "OR";
  conditions: CalendarFilterCondition[];
}

export interface CalendarSavedFilter {
  id: string;
  name: string;
  description?: string;
  shared?: boolean;
  groups: CalendarFilterGroup[];
}

export type CalendarSearchTokenType = "keyword" | "user" | "project" | "tag";

export interface CalendarSearchToken {
  id: string;
  type: CalendarSearchTokenType;
  value: string;
  display: string;
}

export interface CalendarAvailabilityBlock {
  id: string;
  ownerId: string;
  start: string;
  end: string;
  type: "busy" | "free" | "ooo";
  source?: string;
}

export interface CalendarPerson {
  id: string;
  name: string;
  avatarUrl?: string;
  role?: string;
  teamId?: string;
  timezone?: string;
  workloadTargetHours?: number;
}

export interface CalendarResource {
  id: string;
  name: string;
  type: "room" | "equipment" | "virtual";
  capacity?: number;
  location?: string;
  color?: string;
}

export interface CalendarNotification {
  id: string;
  eventId: string;
  title: string;
  start: string;
  channel: CalendarEventReminder["method"];
  status: "pending" | "snoozed" | "sent";
  actionLabel?: string;
}

export type CalendarWorkingDayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface CalendarWorkingDayConfig {
  enabled: boolean;
  startHour: number;
  endHour: number;
}

export interface CalendarWorkingHours {
  ownerId: string;
  timezone: string;
  days: Record<CalendarWorkingDayKey, CalendarWorkingDayConfig>;
}

export interface CalendarHoliday {
  id: string;
  name: string;
  date: string;
  region: string;
}

export interface CalendarOutOfOffice {
  id: string;
  ownerId: string;
  start: string;
  end: string;
  message?: string;
  status: "scheduled" | "active" | "completed";
}

export interface SchedulingAssistantSuggestion {
  id: string;
  start: string;
  end: string;
  attendeeIds: string[];
  score: number;
  reason?: string;
  type: "primary" | "alternative";
  conflicts?: string[];
}

export interface SchedulingAssistantResult {
  generatedAt: string;
  suggestions: SchedulingAssistantSuggestion[];
}

export interface CalendarDelegation {
  id: string;
  ownerId: string;
  delegateId: string;
  delegateName: string;
  scope: "view" | "edit" | "manage";
  expiresAt?: string;
}
