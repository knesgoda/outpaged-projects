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
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
  updated_at: string;
};

export type FeedbackItem = {
  id: string;
  user_id: string;
  type: "bug" | "idea" | "question";
  page_path?: string | null;
  message: string;
  screenshot_url?: string | null;
  created_at: string;
};

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
