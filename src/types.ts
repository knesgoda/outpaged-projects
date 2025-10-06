export type Profile = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  title?: string | null;
  department?: string | null;
  timezone?: string | null;
  capacity_hours_per_week?: number | null;
  updated_at: string;
};

export type WorkspaceSettings = {
  id: string;
  owner: string;
  name?: string | null;
  brand_logo_url?: string | null;
  default_timezone?: string | null;
  default_capacity_hours_per_week?: number | null;
  allowed_email_domain?: string | null;
  features: any;
  security: any;
  billing: any;
  updated_at: string;
};

export type WorkspaceMember = {
  user_id: string;
  role: "owner" | "admin" | "manager" | "member" | "billing";
};

export type AuditLog = {
  id: string;
  actor?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  metadata?: any;
  created_at: string;
};

export type ApiToken = {
  id: string;
  user_id: string;
  name: string;
  token_prefix: string;
  last_four: string;
  created_at: string;
  revoked_at?: string | null;
};

export type Webhook = {
  id: string;
  owner: string;
  target_url: string;
  secret?: string | null;
  active: boolean;
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
