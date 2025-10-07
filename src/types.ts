export * from "./types/core";
export * from "./types/search";
export * from "./types/help";
export * from "./types/profile";
export * from "./types/notifications";
export * from "./types/comments";
export * from "./types/backlog";
export * from "./types/workspace";
export type Report = {
  id: string;
  owner: string;
  project_id?: string | null;
  name: string;
  description?: string | null;
  config: any;
  created_at: string;
  updated_at: string;
};

export type DocPage = {
  id: string;
  owner: string;
  project_id?: string | null;
  parent_id?: string | null;
  title: string;
  slug?: string | null;
  body_markdown: string;
  body_html?: string | null;
  is_published: boolean;
  version: number;
  created_by?: string | null;
  updated_by?: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectFile = {
  id: string;
  project_id: string;
  bucket: "files";
  path: string;
  size_bytes: number;
  mime_type?: string | null;
  title?: string | null;
  uploaded_by: string;
  created_at: string;
};

export type Automation = {
  id: string;
  owner: string;
  project_id?: string | null;
  name: string;
  enabled: boolean;
  trigger_type: "on_task_created" | "on_task_moved" | "on_due_soon" | "schedule_cron";
  trigger_config: any;
  action_type: "create_subtask" | "change_status" | "send_webhook";
  action_config: any;
  created_at: string;
  updated_at: string;
};

export type AutomationRun = {
  id: string;
  automation_id: string;
  status: "success" | "error";
  message?: string | null;
  payload?: any;
  created_at: string;
};

export type Integration = {
  key: "slack" | "github" | "google_drive" | "webhooks";
  name: string;
  enabled: boolean;
  config: any;
};

export type UserIntegration = {
  id: string;
  user_id: string;
  project_id?: string | null;
  provider: "slack" | "github" | "google_drive";
  display_name?: string | null;
  access_data: any;
  created_at: string;
};

export type Webhook = {
  id: string;
  owner: string;
  project_id?: string | null;
  target_url: string;
  secret?: string | null;
  active: boolean;
  created_at: string;
};
