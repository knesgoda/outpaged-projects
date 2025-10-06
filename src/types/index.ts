export type CommentEntityType = 'task' | 'project' | 'doc';

export type Comment = {
  id: string;
  entity_type: CommentEntityType;
  entity_id: string;
  author: string;
  parent_id?: string | null;
  body_markdown: string;
  body_html?: string | null;
  created_at: string;
  updated_at: string;
  edited_at?: string | null;
};

export type CommentMention = {
  id: string;
  comment_id: string;
  mentioned_user: string;
  created_at: string;
};

export type NotificationType = 'mention' | 'info' | 'success' | 'warning' | 'error';

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title?: string | null;
  body?: string | null;
  entity_type?: CommentEntityType | null;
  entity_id?: string | null;
  read_at?: string | null;
  created_at: string;
};

export type ProfileLite = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
};

export * from './backlog';
