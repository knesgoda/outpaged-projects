import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import type {
  CalendarAutomationRule,
  CalendarAvailabilityBlock,
  CalendarComment,
  CalendarDelegation,
  CalendarFollower,
  CalendarInvitation,
  CalendarLayer,
  CalendarNotification,
  CalendarOutOfOffice,
  CalendarPerson,
  CalendarResource,
  CalendarShareSetting,
  CalendarWorkingHours,
  SchedulingAssistantSuggestion,
} from "@/types/calendar";
import { mapSupabaseError } from "./utils";

const getId = (value: string | null, fallbackMessage: string) => {
  if (!value) {
    throw new Error(fallbackMessage);
  }
  return value;
};

type LayerRow = Database["public"]["Views"]["calendar_layers_with_preferences"]["Row"];
type NotificationRow = Database["public"]["Tables"]["calendar_notifications"]["Row"];
type AutomationRuleRow = Database["public"]["Tables"]["calendar_automation_rules"]["Row"];
type ShareSettingRow = Database["public"]["Tables"]["calendar_share_settings"]["Row"];
type InvitationRow = Database["public"]["Tables"]["calendar_invitations"]["Row"];
type FollowerRow = Database["public"]["Tables"]["calendar_followers"]["Row"];
type CommentRow = Database["public"]["Tables"]["calendar_comments"]["Row"];
type WorkingHoursRow = Database["public"]["Tables"]["calendar_working_hours"]["Row"];
type HolidayRow = Database["public"]["Tables"]["calendar_holidays"]["Row"];
type OutOfOfficeRow = Database["public"]["Tables"]["calendar_out_of_office"]["Row"];
type SchedulingRow = Database["public"]["Tables"]["calendar_scheduling_suggestions"]["Row"];
type DelegationRow = Database["public"]["Tables"]["calendar_delegations"]["Row"];
type ResourceRow = Database["public"]["Tables"]["calendar_resources"]["Row"];
type AvailabilityRow = Database["public"]["Tables"]["calendar_availability_blocks"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type Json = Database["public"]["Tables"]["calendar_share_settings"]["Row"]["target"];

function deserializeLayer(row: LayerRow): CalendarLayer {
  const id = getId(row.id, "Calendar layer row missing id");
  const name = getId(row.name, "Calendar layer row missing name");
  const type = getId(row.type, "Calendar layer row missing type");
  const color = getId(row.color, "Calendar layer row missing color");

  return {
    id,
    name,
    type,
    color,
    description: row.description ?? undefined,
    subscribed: row.subscribed ?? false,
    visible: row.visible ?? false,
    timezone: row.timezone ?? undefined,
    isReadOnly: row.is_read_only ?? undefined,
  };
}

function deserializeNotification(row: NotificationRow): CalendarNotification {
  return {
    id: row.id,
    eventId: row.event_id,
    title: row.title,
    start: row.start_at,
    channel: row.channel,
    status: row.status,
    actionLabel: row.action_label ?? undefined,
  };
}

function deserializeAutomationRule(row: AutomationRuleRow): CalendarAutomationRule {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    trigger: row.trigger,
    action: row.action,
    enabled: row.enabled,
    config: row.config ?? undefined,
  };
}

function deserializeShareSetting(row: ShareSettingRow): CalendarShareSetting {
  const target = (row.target as Json) ?? {};
  return {
    id: row.id,
    calendarId: row.calendar_id,
    target: {
      id: typeof target.id === "string" ? target.id : "",
      type: typeof target.type === "string" ? target.type : "user",
      name: typeof target.name === "string" ? target.name : "",
      email: typeof target.email === "string" ? target.email : undefined,
    },
    role: row.role,
    canShare: row.can_share ?? undefined,
    subscribed: row.subscribed ?? undefined,
  };
}

function deserializeInvitation(row: InvitationRow): CalendarInvitation {
  const invitee = (row.invitee as Json) ?? {};
  return {
    id: row.id,
    eventId: row.event_id,
    invitee: {
      id: typeof invitee.id === "string" ? invitee.id : "",
      type: typeof invitee.type === "string" ? invitee.type : "user",
      name: typeof invitee.name === "string" ? invitee.name : "",
      email: typeof invitee.email === "string" ? invitee.email : undefined,
    },
    status: row.status,
    respondedAt: row.responded_at ?? undefined,
    responseNote: row.response_note ?? undefined,
    icsUrl: row.ics_url ?? undefined,
  };
}

function deserializeFollower(row: FollowerRow): CalendarFollower {
  const target = (row.target as Json) ?? {};
  return {
    id: row.id,
    target: {
      id: typeof target.id === "string" ? target.id : "",
      type: typeof target.type === "string" ? target.type : "user",
      name: typeof target.name === "string" ? target.name : "",
      email: typeof target.email === "string" ? target.email : undefined,
    },
    subscribedAt: row.subscribed_at,
  };
}

function deserializeComment(row: CommentRow): CalendarComment {
  const mentions = Array.isArray(row.mentions)
    ? row.mentions
        .filter((mention): mention is Record<string, unknown> => typeof mention === "object" && mention !== null)
        .map((mention) => ({
          id: typeof mention.id === "string" ? mention.id : "",
          name: typeof mention.name === "string" ? mention.name : "",
        }))
    : undefined;
  return {
    id: row.id,
    eventId: row.event_id ?? undefined,
    authorId: row.author_id,
    authorName: row.author_name,
    createdAt: row.created_at,
    body: row.body,
    mentions,
  };
}

function deserializeWorkingHours(row: WorkingHoursRow): CalendarWorkingHours {
  const days = row.days && typeof row.days === "object" ? (row.days as CalendarWorkingHours["days"]) : ({} as CalendarWorkingHours["days"]);
  return {
    ownerId: row.owner_id,
    timezone: row.timezone,
    days,
  };
}

function deserializeHoliday(row: HolidayRow) {
  return {
    id: row.id,
    name: row.name,
    date: row.holiday_date,
    region: row.region,
  };
}

function deserializeOutOfOffice(row: OutOfOfficeRow): CalendarOutOfOffice {
  return {
    id: row.id,
    ownerId: row.owner_id,
    start: row.start_at,
    end: row.end_at,
    message: row.message ?? undefined,
    status: row.status,
  };
}

function deserializeScheduling(row: SchedulingRow): SchedulingAssistantSuggestion {
  return {
    id: row.id,
    start: row.start_at,
    end: row.end_at,
    attendeeIds: row.attendee_ids,
    score: Number(row.score),
    reason: row.reason ?? undefined,
    type: row.suggestion_type as SchedulingAssistantSuggestion["type"],
    conflicts: row.conflicts ?? undefined,
  };
}

function deserializeDelegation(row: DelegationRow): CalendarDelegation {
  return {
    id: row.id,
    ownerId: row.owner_id,
    delegateId: row.delegate_id,
    delegateName: row.delegate_name,
    scope: row.scope,
    expiresAt: row.expires_at ?? undefined,
  };
}

function deserializeResource(row: ResourceRow): CalendarResource {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    capacity: row.capacity ?? undefined,
    location: row.location ?? undefined,
    color: row.color ?? undefined,
  };
}

function deserializeAvailability(row: AvailabilityRow): CalendarAvailabilityBlock {
  return {
    id: row.id,
    ownerId: row.owner_id,
    start: row.start_at,
    end: row.end_at,
    type: row.availability_type,
    source: row.source ?? undefined,
  };
}

function deserializeProfile(row: ProfileRow): CalendarPerson {
  const name = row.full_name || row.username || "Unknown";
  return {
    id: row.id,
    name,
    avatarUrl: row.avatar_url ?? undefined,
    role: row.role ?? undefined,
    timezone: "UTC",
  };
}

export async function fetchCalendarLayers(): Promise<CalendarLayer[]> {
  const { data, error } = await supabase
    .from("calendar_layers_with_preferences")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw mapSupabaseError(error, "Unable to load calendar layers");
  }

  if (!data) {
    return [];
  }

  return data.map(deserializeLayer);
}

export async function updateCalendarLayerPreferences(
  calendarId: string,
  updates: Partial<Pick<CalendarLayer, "color" | "visible" | "subscribed">>
): Promise<void> {
  const { error } = await supabase
    .from("calendar_layers")
    .update({
      color: updates.color,
      visible: updates.visible,
      subscribed: updates.subscribed,
    })
    .eq("id", calendarId);

  if (error) {
    throw mapSupabaseError(error, "Unable to update calendar preferences");
  }
}

export async function fetchCalendarNotifications(): Promise<CalendarNotification[]> {
  const { data, error } = await supabase
    .from("calendar_notifications")
    .select("*")
    .order("start_at", { ascending: true });

  if (error) {
    throw mapSupabaseError(error, "Unable to load calendar notifications");
  }

  return (data ?? []).map(deserializeNotification);
}

export async function upsertCalendarNotifications(notifications: CalendarNotification[]): Promise<void> {
  if (notifications.length === 0) {
    return;
  }

  const payload = notifications.map((notification) => ({
    id: notification.id,
    event_id: notification.eventId,
    title: notification.title,
    start_at: notification.start,
    channel: notification.channel,
    status: notification.status,
    action_label: notification.actionLabel ?? null,
  }));

  const { error } = await supabase.from("calendar_notifications").upsert(payload);
  if (error) {
    throw mapSupabaseError(error, "Unable to persist calendar notifications");
  }
}

export async function deleteCalendarNotifications(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) {
    return;
  }
  const { error } = await supabase
    .from("calendar_notifications")
    .delete()
    .in("id", notificationIds);
  if (error) {
    throw mapSupabaseError(error, "Unable to delete calendar notifications");
  }
}

export async function fetchCalendarAutomationRules(): Promise<CalendarAutomationRule[]> {
  const { data, error } = await supabase
    .from("calendar_automation_rules")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw mapSupabaseError(error, "Unable to load automation rules");
  }

  return (data ?? []).map(deserializeAutomationRule);
}

export async function setAutomationRuleEnabled(ruleId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from("calendar_automation_rules")
    .update({ enabled })
    .eq("id", ruleId);
  if (error) {
    throw mapSupabaseError(error, "Unable to update automation rule");
  }
}

export async function fetchCalendarShareSettings(): Promise<CalendarShareSetting[]> {
  const { data, error } = await supabase
    .from("calendar_share_settings")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw mapSupabaseError(error, "Unable to load share settings");
  }

  return (data ?? []).map(deserializeShareSetting);
}

export async function updateCalendarShareRole(shareId: string, role: CalendarShareSetting["role"]): Promise<void> {
  const { error } = await supabase
    .from("calendar_share_settings")
    .update({ role })
    .eq("id", shareId);
  if (error) {
    throw mapSupabaseError(error, "Unable to update share permissions");
  }
}

export async function removeCalendarShare(shareId: string): Promise<void> {
  const { error } = await supabase.from("calendar_share_settings").delete().eq("id", shareId);
  if (error) {
    throw mapSupabaseError(error, "Unable to remove share target");
  }
}

export async function addCalendarShare(share: CalendarShareSetting): Promise<void> {
  const payload: ShareSettingRow = {
    id: share.id,
    calendar_id: share.calendarId,
    target: share.target,
    role: share.role,
    can_share: share.canShare ?? null,
    subscribed: share.subscribed ?? null,
  };

  const { error } = await supabase.from("calendar_share_settings").insert(payload);
  if (error) {
    throw mapSupabaseError(error, "Unable to add share target");
  }
}

export async function fetchCalendarInvitations(): Promise<CalendarInvitation[]> {
  const { data, error } = await supabase
    .from("calendar_invitations")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw mapSupabaseError(error, "Unable to load invitations");
  }

  return (data ?? []).map(deserializeInvitation);
}

export async function updateCalendarInvitationStatus(
  invitationId: string,
  status: CalendarInvitation["status"]
): Promise<void> {
  const { error } = await supabase
    .from("calendar_invitations")
    .update({ status })
    .eq("id", invitationId);
  if (error) {
    throw mapSupabaseError(error, "Unable to update invitation");
  }
}

export async function fetchCalendarFollowers(): Promise<CalendarFollower[]> {
  const { data, error } = await supabase
    .from("calendar_followers")
    .select("*")
    .order("subscribed_at", { ascending: true });

  if (error) {
    throw mapSupabaseError(error, "Unable to load followers");
  }

  return (data ?? []).map(deserializeFollower);
}

export async function removeCalendarFollower(followerId: string): Promise<void> {
  const { error } = await supabase.from("calendar_followers").delete().eq("id", followerId);
  if (error) {
    throw mapSupabaseError(error, "Unable to remove follower");
  }
}

export async function addCalendarFollower(follower: CalendarFollower): Promise<void> {
  const { error } = await supabase.from("calendar_followers").insert({
    id: follower.id,
    event_id: null,
    target: follower.target,
    subscribed_at: follower.subscribedAt,
  });
  if (error) {
    throw mapSupabaseError(error, "Unable to add follower");
  }
}

export async function fetchCalendarComments(): Promise<CalendarComment[]> {
  const { data, error } = await supabase
    .from("calendar_comments")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) {
    throw mapSupabaseError(error, "Unable to load calendar comments");
  }

  return (data ?? []).map(deserializeComment);
}

export async function addCalendarComment(comment: CalendarComment): Promise<void> {
  const { error } = await supabase.from("calendar_comments").insert({
    id: comment.id,
    event_id: comment.eventId ?? null,
    author_id: comment.authorId,
    author_name: comment.authorName,
    created_at: comment.createdAt,
    body: comment.body,
    mentions: comment.mentions ?? null,
  });
  if (error) {
    throw mapSupabaseError(error, "Unable to add calendar comment");
  }
}

export async function fetchCalendarWorkingHours(): Promise<CalendarWorkingHours[]> {
  const { data, error } = await supabase.from("calendar_working_hours").select("*");
  if (error) {
    throw mapSupabaseError(error, "Unable to load working hours");
  }
  return (data ?? []).map(deserializeWorkingHours);
}

export async function upsertCalendarWorkingHours(hours: CalendarWorkingHours): Promise<void> {
  const { error } = await supabase.from("calendar_working_hours").upsert({
    owner_id: hours.ownerId,
    timezone: hours.timezone,
    days: hours.days,
  });
  if (error) {
    throw mapSupabaseError(error, "Unable to save working hours");
  }
}

export async function fetchCalendarHolidays() {
  const { data, error } = await supabase.from("calendar_holidays").select("*");
  if (error) {
    throw mapSupabaseError(error, "Unable to load holidays");
  }
  return (data ?? []).map(deserializeHoliday);
}

export async function fetchCalendarOutOfOffice(): Promise<CalendarOutOfOffice[]> {
  const { data, error } = await supabase.from("calendar_out_of_office").select("*");
  if (error) {
    throw mapSupabaseError(error, "Unable to load out of office entries");
  }
  return (data ?? []).map(deserializeOutOfOffice);
}

export async function upsertCalendarOutOfOffice(entry: CalendarOutOfOffice): Promise<void> {
  const { error } = await supabase.from("calendar_out_of_office").upsert({
    id: entry.id,
    owner_id: entry.ownerId,
    start_at: entry.start,
    end_at: entry.end,
    message: entry.message ?? null,
    status: entry.status,
  });
  if (error) {
    throw mapSupabaseError(error, "Unable to persist out of office entry");
  }
}

export async function fetchCalendarSchedulingSuggestions(): Promise<SchedulingAssistantSuggestion[]> {
  const { data, error } = await supabase
    .from("calendar_scheduling_suggestions")
    .select("*")
    .order("generated_at", { ascending: false });
  if (error) {
    throw mapSupabaseError(error, "Unable to load scheduling suggestions");
  }
  return (data ?? []).map(deserializeScheduling);
}

export async function deleteCalendarSchedulingSuggestion(suggestionId: string): Promise<void> {
  const { error } = await supabase
    .from("calendar_scheduling_suggestions")
    .delete()
    .eq("id", suggestionId);
  if (error) {
    throw mapSupabaseError(error, "Unable to remove scheduling suggestion");
  }
}

export async function fetchCalendarDelegations(): Promise<CalendarDelegation[]> {
  const { data, error } = await supabase.from("calendar_delegations").select("*");
  if (error) {
    throw mapSupabaseError(error, "Unable to load calendar delegations");
  }
  return (data ?? []).map(deserializeDelegation);
}

export async function fetchCalendarResources(): Promise<CalendarResource[]> {
  const { data, error } = await supabase
    .from("calendar_resources")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    throw mapSupabaseError(error, "Unable to load calendar resources");
  }
  return (data ?? []).map(deserializeResource);
}

export async function fetchCalendarAvailability(): Promise<CalendarAvailabilityBlock[]> {
  const { data, error } = await supabase.from("calendar_availability_blocks").select("*");
  if (error) {
    throw mapSupabaseError(error, "Unable to load calendar availability");
  }
  return (data ?? []).map(deserializeAvailability);
}

export async function fetchCalendarPeople(): Promise<CalendarPerson[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, role")
    .order("full_name", { ascending: true });
  if (error) {
    throw mapSupabaseError(error, "Unable to load calendar people");
  }
  return (data ?? []).map(deserializeProfile);
}
