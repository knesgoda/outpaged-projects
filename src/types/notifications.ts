export type NotificationPreferences = {
  user_id: string;
  in_app: Record<string, boolean>;
  email: Record<string, boolean>;
  digest_frequency: "off" | "daily" | "weekly";
  updated_at: string;
};

/** Canonical NotificationItem. Add legacy-friendly fields for older UI. */
export type NotificationItem = {
  id: string;
  user_id: string;
  type:
    | "mention"
    | "assigned"
    | "comment_reply"
    | "status_change"
    | "due_soon"
    | "automation"
    | "file_shared"
    | "doc_comment";
  title?: string | null;
  body?: string | null;
  entity_type?: "task" | "project" | "doc" | "file" | "automation" | null;
  entity_id?: string | null;
  project_id?: string | null;
  link?: string | null;
  read_at?: string | null;
  archived_at?: string | null;
  created_at: string;

  // Legacy compat for UI that expects these (optional):
  read?: boolean; // map to Boolean(read_at)
  message?: string | null; // map to body or title
  related_task_id?: string | null; // derive from entity_type/id
  related_project_id?: string | null; // derive from project_id
};

export type NotificationType = NotificationItem["type"];
