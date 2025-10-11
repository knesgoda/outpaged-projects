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
}

export type CalendarColorEncoding = "calendar" | "status" | "type" | "priority" | "custom";
