import type { ID } from "./core";

export type HelpArticle = {
  id: ID;
  owner: ID;
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
  id: ID;
  title: string;
  version?: string | null;
  body_markdown: string;
  body_html?: string | null;
  published_at: string;
  created_by?: ID | null;
};

export type SupportTicket = {
  id: ID;
  user_id: ID;
  subject: string;
  body: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "urgent";
  created_at: string;
  updated_at: string;
};

export type FeedbackItem = {
  id: ID;
  user_id: ID;
  type: "bug" | "idea" | "question";
  page_path?: string | null;
  message: string;
  screenshot_url?: string | null;
  created_at: string;
};
