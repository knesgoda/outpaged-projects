import type { ID } from "./core";

export type IntegrationKey =
  | "gmail"
  | "google_calendar"
  | "google_docs"
  | "github"
  | "webhooks";

export type UserIntegration = {
  id: ID;
  user_id: ID;
  project_id?: ID | null;
  provider: IntegrationKey;
  display_name?: string | null;
  access_data: any;
  created_at: string;
};

export type Webhook = {
  id: ID;
  owner: ID;
  project_id?: ID | null;
  target_url: string;
  secret?: string | null;
  active: boolean;
  created_at: string;
};
