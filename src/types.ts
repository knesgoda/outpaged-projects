codex/implement-notifications-and-inbox-functionality-g8mo3c
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
=======
codex/implement-integrations-with-google-and-github
export type IntegrationKey = 'gmail' | 'google_calendar' | 'google_docs' | 'github';

export type UserIntegration = {
  id: string;
  user_id: string;
  project_id?: string | null;
  provider: IntegrationKey;
  display_name?: string | null;
  access_data: any;
  created_at: string;
};

export type LinkedResource = {
  id: string;
  provider: IntegrationKey;
  external_type: 'email' | 'thread' | 'event' | 'doc' | 'repo' | 'issue' | 'pr' | 'file';
  external_id?: string | null;
  url?: string | null;
  title?: string | null;
  metadata: any;
  entity_type: 'task' | 'project' | 'doc';
  entity_id: string;
  project_id?: string | null;
  created_by?: string | null;
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
 codex/implement-notifications-and-inbox-functionality-g8mo3c
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
=======
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
  updated_at: string;
};

export type FeedbackItem = {
  id: string;
  user_id: string;
codex/implement-notifications-and-inbox-functionality-g8mo3c
  type: 'bug' | 'idea' | 'question';
  type: "bug" | "idea" | "question";
  page_path?: string | null;
  message: string;
  screenshot_url?: string | null;
  created_at: string;
};
codex/implement-notifications-and-inbox-functionality-g8mo3c

export type HelpCenterEntity =
  | HelpArticle
  | Announcement
  | SupportTicket
  | FeedbackItem;
codex/implement-global-search-and-command-k-palette
export type SearchResult = {
  id: string;
  type: 'task' | 'project' | 'doc' | 'file' | 'comment' | 'person';
  title: string;
  snippet?: string | null;
  url: string;
  project_id?: string | null;
  updated_at?: string | null;
  score?: number;
};
/**
 * DO NOT ADD TYPES HERE.
 * This file only re-exports from src/types/index.ts to keep imports stable.
 * Add new types under src/types/<domain>.ts and export them from src/types/index.ts.
 */
export * from "./types";