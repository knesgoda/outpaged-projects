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
