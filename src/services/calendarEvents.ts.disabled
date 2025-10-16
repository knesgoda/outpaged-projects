import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type {
  CalendarComment,
  CalendarEvent,
  CalendarEventAttachment,
  CalendarEventAttendee,
  CalendarEventLink,
  CalendarEventReminder,
  CalendarEventResource,
  CalendarFollower,
  CalendarInvitation,
  CalendarShareSetting,
  CalendarShareTarget,
} from "@/types/calendar";
import { mapSupabaseError } from "./utils";

export type CalendarEventWithDetails = CalendarEvent & {
  statusColor?: string | null;
  priorityColor?: string | null;
  typeColor?: string | null;
};

type CalendarEventRow = Database["public"]["Views"]["calendar_events_with_details"]["Row"];

type JsonLike = Record<string, unknown> | null | undefined;

function generateId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseJsonArray<T>(value: unknown, mapper: (item: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const results: T[] = [];
  for (const item of value) {
    if (isRecord(item)) {
      results.push(mapper(item));
    }
  }
  return results;
}

function normalizeMetadata(source: JsonLike): Record<string, unknown> | undefined {
  if (!isRecord(source)) {
    return undefined;
  }
  return { ...source };
}

function mapAttendees(value: unknown): CalendarEventAttendee[] {
  return parseJsonArray<CalendarEventAttendee>(value, (item) => ({
    id: typeof item.id === "string" ? item.id : "",
    name: typeof item.name === "string" ? item.name : "",
    email: typeof item.email === "string" ? item.email : undefined,
    response: typeof item.response === "string" ? (item.response as CalendarEventAttendee["response"]) : undefined,
  }));
}

function mapReminders(value: unknown): CalendarEventReminder[] {
  return parseJsonArray<CalendarEventReminder>(value, (item) => ({
    id: typeof item.id === "string" ? item.id : generateId(),
    offsetMinutes:
      typeof item.offsetMinutes === "number"
        ? item.offsetMinutes
        : typeof item.offsetMinutes === "string"
        ? Number.parseInt(item.offsetMinutes, 10)
        : 0,
    method: (item.method as CalendarEventReminder["method"]) ?? "popup",
  }));
}

function mapAttachments(value: unknown): CalendarEventAttachment[] {
  return parseJsonArray<CalendarEventAttachment>(value, (item) => ({
    id: typeof item.id === "string" ? item.id : generateId(),
    name: typeof item.name === "string" ? item.name : "",
    url: typeof item.url === "string" ? item.url : "",
    size:
      typeof item.size === "number"
        ? item.size
        : typeof item.size === "string"
        ? Number.parseInt(item.size, 10)
        : undefined,
  }));
}

function mapLinks(value: unknown): CalendarEventLink[] {
  return parseJsonArray<CalendarEventLink>(value, (item) => ({
    id: typeof item.id === "string" ? item.id : generateId(),
    type: (item.type as CalendarEventLink["type"]) ?? "task",
    label: typeof item.label === "string" ? item.label : "",
    href: typeof item.href === "string" ? item.href : undefined,
  }));
}

function mapResources(value: unknown): CalendarEventResource[] {
  return parseJsonArray<CalendarEventResource>(value, (item) => ({
    id: typeof item.id === "string" ? item.id : "",
    name: typeof item.name === "string" ? item.name : "",
    type: (item.type as CalendarEventResource["type"]) ?? "room",
    capacity:
      typeof item.capacity === "number"
        ? item.capacity
        : typeof item.capacity === "string"
        ? Number.parseInt(item.capacity, 10)
        : undefined,
    location: typeof item.location === "string" ? item.location : undefined,
    color: typeof item.color === "string" ? item.color : undefined,
  }));
}

function mapInvitations(value: unknown): CalendarInvitation[] {
  return parseJsonArray<CalendarInvitation>(value, (item) => ({
    id: typeof item.id === "string" ? item.id : "",
    eventId: typeof item.eventId === "string" ? item.eventId : "",
    invitee: isRecord(item.invitee)
      ? {
          id: typeof item.invitee.id === "string" ? item.invitee.id : "",
          type: (item.invitee.type as CalendarInvitation["invitee"]["type"]) ?? "user",
          name: typeof item.invitee.name === "string" ? item.invitee.name : "",
          email: typeof item.invitee.email === "string" ? item.invitee.email : undefined,
        }
      : { id: "", type: "user", name: "" },
    status: (item.status as CalendarInvitation["status"]) ?? "needs-action",
    respondedAt: typeof item.respondedAt === "string" ? item.respondedAt : undefined,
    responseNote: typeof item.responseNote === "string" ? item.responseNote : undefined,
    icsUrl: typeof item.icsUrl === "string" ? item.icsUrl : undefined,
  }));
}

function mapFollowers(value: unknown): CalendarFollower[] {
  return parseJsonArray<CalendarFollower>(value, (item) => ({
    id: typeof item.id === "string" ? item.id : "",
    target: isRecord(item.target)
      ? {
          id: typeof item.target.id === "string" ? item.target.id : "",
          type: (item.target.type as CalendarShareTarget["type"]) ?? "user",
          name: typeof item.target.name === "string" ? item.target.name : "",
          email: typeof item.target.email === "string" ? item.target.email : undefined,
        }
      : { id: "", type: "user", name: "" },
    subscribedAt: typeof item.subscribedAt === "string" ? item.subscribedAt : new Date().toISOString(),
  }));
}

function mapComments(value: unknown): CalendarComment[] {
  return parseJsonArray<CalendarComment>(value, (item) => ({
    id: typeof item.id === "string" ? item.id : "",
    eventId: typeof item.eventId === "string" ? item.eventId : undefined,
    authorId: typeof item.authorId === "string" ? item.authorId : "",
    authorName: typeof item.authorName === "string" ? item.authorName : "",
    createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
    body: typeof item.body === "string" ? item.body : "",
    mentions: Array.isArray(item.mentions)
      ? item.mentions
          .filter((mention) => isRecord(mention))
          .map((mention) => ({
            id: typeof mention.id === "string" ? mention.id : "",
            name: typeof mention.name === "string" ? mention.name : "",
          }))
      : undefined,
  }));
}

function mapShareOverrides(value: unknown): CalendarShareSetting[] {
  return parseJsonArray<CalendarShareSetting>(value, (item) => ({
    id: typeof item.id === "string" ? item.id : "",
    calendarId: typeof item.calendarId === "string" ? item.calendarId : "",
    target: isRecord(item.target)
      ? {
          id: typeof item.target.id === "string" ? item.target.id : "",
          type: (item.target.type as CalendarShareSetting["target"]["type"]) ?? "user",
          name: typeof item.target.name === "string" ? item.target.name : "",
          email: typeof item.target.email === "string" ? item.target.email : undefined,
        }
      : { id: "", type: "user", name: "" },
    role: (item.role as CalendarShareSetting["role"]) ?? "viewer",
    canShare: typeof item.canShare === "boolean" ? item.canShare : undefined,
    subscribed: typeof item.subscribed === "boolean" ? item.subscribed : undefined,
  }));
}

function deserializeEvent(row: CalendarEventRow): CalendarEventWithDetails {
  const id = row.id;
  const calendarId = row.calendar_id;
  const title = row.title;
  const start = row.start;
  const end = row.end;

  if (!id || !calendarId || !title || !start || !end) {
    throw new Error("Encountered calendar event with missing required fields");
  }

  const metadata = normalizeMetadata(row.metadata) ?? {};

  if (row.status_color) {
    metadata.statusColor = row.status_color;
  }
  if (row.priority_color) {
    metadata.priorityColor = row.priority_color;
  }
  if (row.type_color) {
    metadata.typeColor = row.type_color;
  }

  const event: CalendarEventWithDetails = {
    id,
    calendarId,
    projectId: row.project_id ?? undefined,
    title,
    description: row.description ?? undefined,
    start,
    end,
    allDay: row.all_day ?? false,
    timezone: row.timezone ?? undefined,
    location: row.location ?? undefined,
    organizer: row.organizer ?? undefined,
    attendees: mapAttendees(row.attendees),
    linkedItems: mapLinks(row.linked_items),
    color: row.color ?? undefined,
    priority: row.priority ?? undefined,
    visibility: row.visibility ?? undefined,
    reminders: mapReminders(row.reminders),
    attachments: mapAttachments(row.attachments),
    videoLink: row.video_link ?? undefined,
    status: row.status ?? undefined,
    type: row.type ?? undefined,
    recurrenceRule: row.recurrence_rule ?? undefined,
    recurrenceExceptions: row.recurrence_exceptions ?? undefined,
    isRecurringInstance: row.is_recurring_instance ?? undefined,
    metadata,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    ownerId: row.owner_id ?? undefined,
    ownerName: row.owner_name ?? undefined,
    teamId: row.team_id ?? undefined,
    teamName: row.team_name ?? undefined,
    labels: row.labels ?? undefined,
    resources: mapResources(row.resources),
    resourceIds: row.resource_ids ?? undefined,
    hasAttachments: row.has_attachments ?? undefined,
    hasReminders: row.has_reminders ?? undefined,
    syncSource: row.sync_source ?? undefined,
    externalId: row.external_id ?? undefined,
    invitations: mapInvitations(row.invitations),
    followers: mapFollowers(row.followers),
    comments: mapComments(row.comments),
    privacyOverrides: mapShareOverrides(row.privacy_overrides),
    workingHoursImpact: row.working_hours_impact ?? undefined,
    automationRuleIds: row.automation_rule_ids ?? undefined,
    isDeadline: row.is_deadline ?? undefined,
    isReleaseWindow: row.is_release_window ?? undefined,
    isRecurringException: row.is_recurring_exception ?? undefined,
    completed: row.completed ?? undefined,
    statusColor: row.status_color ?? undefined,
    priorityColor: row.priority_color ?? undefined,
    typeColor: row.type_color ?? undefined,
  };

  return event;
}

export interface ListCalendarEventsParams {
  from: string;
  to: string;
  calendarIds?: string[];
  projectId?: string;
}

export async function listCalendarEvents({
  from,
  to,
  calendarIds,
  projectId,
}: ListCalendarEventsParams): Promise<CalendarEventWithDetails[]> {
  let query = supabase
    .from("calendar_events_with_details")
    .select("*")
    .gte("end", from)
    .lte("start", to)
    .order("start", { ascending: true });

  if (calendarIds && calendarIds.length > 0) {
    query = query.in("calendar_id", calendarIds);
  }

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;
  if (error) {
    throw mapSupabaseError(error, "Unable to load calendar events");
  }

  if (!data) {
    return [];
  }

  return data.map(deserializeEvent);
}

export async function getCalendarEvent(eventId: string): Promise<CalendarEventWithDetails | null> {
  const { data, error } = await supabase
    .from("calendar_events_with_details")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw mapSupabaseError(error, "Unable to load the requested calendar event");
  }

  return data ? deserializeEvent(data) : null;
}
