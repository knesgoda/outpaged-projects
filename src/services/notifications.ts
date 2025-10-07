import { supabase } from "@/integrations/supabase/client";
import type { NotificationItem } from "@/types";

export type NotificationTab =
  | "all"
  | "mentions"
  | "assigned"
  | "following"
  | "due-soon"
  | "unread";

type ListParams = {
  tab?: NotificationTab;
  limit?: number;
  since?: string;
  includeArchived?: boolean;
};

const FOLLOWING_TYPES: NotificationItem["type"][] = [
  "status_change",
  "automation",
  "file_shared",
  "doc_comment",
];

export async function listNotifications(
  params: ListParams = {}
): Promise<NotificationItem[]> {
  const { tab = "all", limit = 50, since, includeArchived = false } = params;

  let query = supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (!includeArchived) {
    query = query.is("archived_at", null);
  }

  switch (tab) {
    case "mentions":
      query = query.eq("type", "mention");
      break;
    case "assigned":
      query = query.eq("type", "assigned");
      break;
    case "following":
      query = query.in("type", FOLLOWING_TYPES);
      break;
    case "due-soon":
      query = query.eq("type", "due_soon");
      break;
    case "unread":
      query = query.is("read_at", null);
      break;
    default:
      break;
  }

  if (since) {
    query = query.gte("created_at", since);
  }

  if (typeof limit === "number") {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || "Failed to load notifications");
  }

  return (data ?? []) as NotificationItem[];
}

export async function markRead(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message || "Failed to mark notification as read");
  }
}

export async function markUnread(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: null })
    .eq("id", id);

  if (error) {
    throw new Error(error.message || "Failed to mark notification as unread");
  }
}

export async function markAllRead(): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error) {
    throw new Error(error.message || "Failed to mark notifications as read");
  }
}

export async function archive(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error(error.message || "Failed to archive notification");
  }
}

export async function unarchive(id: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ archived_at: null })
    .eq("id", id);

  if (error) {
    throw new Error(error.message || "Failed to unarchive notification");
  }
}

type CreateNotificationInput = Omit<
  NotificationItem,
  "id" | "created_at" | "read_at" | "archived_at"
> & { user_id: string };

export async function createNotification(
  input: CreateNotificationInput
): Promise<NotificationItem> {
  const payload = {
    user_id: input.user_id,
    type: input.type,
    title: input.title ?? null,
    body: input.body ?? null,
    entity_type: input.entity_type ?? null,
    entity_id: input.entity_id ?? null,
    project_id: input.project_id ?? null,
    link: input.link ?? null,
  };

  const { data, error } = await supabase
    .from("notifications")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message || "Failed to create notification");
  }

  return data as NotificationItem;
}

type NotificationRow = {
  id: string;
  user_id: string;
  type: NotificationItem["type"];
  title: string | null;
  body: string | null;
  entity_type: NotificationItem["entity_type"];
  entity_id: string | null;
  project_id: string | null;
  link: string | null;
  read_at: string | null;
  archived_at: string | null;
  created_at: string;
};

function mapNotificationRow(row: NotificationRow): NotificationItem {
  return {
    id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title ?? null,
    body: row.body ?? null,
    entity_type: row.entity_type ?? null,
    entity_id: row.entity_id ?? null,
    project_id: row.project_id ?? null,
    link: row.link ?? null,
    read_at: row.read_at ?? null,
    archived_at: row.archived_at ?? null,
    created_at: row.created_at,
  };
}

const NOTIFICATION_SELECT_FIELDS =
  "id, user_id, type, title, body, entity_type, entity_id, project_id, link, read_at, archived_at, created_at";

export async function listMyNotifications(): Promise<NotificationItem[]> {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    throw userError;
  }

  const user = userData.user;
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("notifications")
    .select(NOTIFICATION_SELECT_FIELDS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapNotificationRow(row as NotificationRow));
}

export async function markNotificationRead(id: string): Promise<void> {
  await markRead(id);
}
