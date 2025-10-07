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

export type IntegrationKey = "gmail" | "google_calendar" | "google_docs" | "github" | "webhooks";

export type LinkedResource = {
  id: string;
  provider: IntegrationKey;
  external_type: "email" | "thread" | "event" | "doc" | "repo" | "issue" | "pr" | "file";
  external_id?: string | null;
  url?: string | null;
  title?: string | null;
  metadata: any;
  entity_type: "task" | "project" | "doc";
  entity_id: string;
  project_id?: string | null;
  created_by?: string | null;
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

export type AuditLog = {
  id: string;
  actor?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  metadata?: any;
  created_at: string;
};
