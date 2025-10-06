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

export type HelpArticle = {
  id: string;
  owner: string;
  title: string;
  slug?: string | null;
  category?: string | null;
  tags?: string[] | null;
  body_markdown: string;
  body_html?: string | null;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type Announcement = {
  id: string;
  title: string;
  version?: string | null;
  body_markdown: string;
  body_html?: string | null;
  published_at: string;
  created_by?: string | null;
};

export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  body: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
};

export type FeedbackItem = {
  id: string;
  user_id: string;
  type: 'bug' | 'idea' | 'question';
  page_path?: string | null;
  message: string;
  screenshot_url?: string | null;
  created_at: string;
};
