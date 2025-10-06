import type { ID } from "./core";

export type NotificationType =
  | "mention"
  | "assigned"
  | "comment_reply"
  | "status_change"
  | "due_soon"
  | "automation"
  | "file_shared"
  | "doc_comment"
  | "info"
  | "success"
  | "warning"
  | "error";

export type NotificationItem = {
  id: ID;
  user_id: ID;
  type: NotificationType;
  title?: string | null;
  body?: string | null;
  entity_type?: "task" | "project" | "doc" | "file" | "automation" | null;
  entity_id?: ID | null;
  project_id?: ID | null;
  link?: string | null;
  read_at?: string | null;
  archived_at?: string | null;
  created_at?: string;
};

export type Notification = NotificationItem;
