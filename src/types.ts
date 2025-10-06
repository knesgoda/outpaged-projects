export type NotificationItem = {
  id: string;
  user_id: string;
  type:
    | 'mention'
    | 'assigned'
    | 'comment_reply'
    | 'status_change'
    | 'due_soon'
    | 'automation'
    | 'file_shared'
    | 'doc_comment';
  title?: string | null;
  body?: string | null;
  entity_type?: 'task' | 'project' | 'doc' | 'file' | 'automation' | null;
  entity_id?: string | null;
  project_id?: string | null;
  link?: string | null;
  read_at?: string | null;
  archived_at?: string | null;
  created_at: string;
};

export type NotificationPreferences = {
  user_id: string;
  in_app: Record<string, boolean>;
  email: Record<string, boolean>;
  digest_frequency: 'off' | 'daily' | 'weekly';
  updated_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  entity_type: 'task' | 'project' | 'doc';
  entity_id: string;
  created_at: string;
};
