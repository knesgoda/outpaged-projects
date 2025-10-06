export * from "./types/core";
export * from "./types/search";
export * from "./types/help";
export * from "./types/profile";
export * from "./types/notifications";
export * from "./types/comments";
export * from "./types/backlog";
export * from "./types/workspace";
export * from "./types/reports";

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
