import type { ID } from "./core";

export type WorkspaceSettings = {
  id: ID;
  owner: ID;
  brand_name?: string | null;
  brand_logo_url?: string | null;
  updated_at: string;
  name?: string | null;
  default_timezone?: string | null;
  default_capacity_hours_per_week?: number | null;
  allowed_email_domain?: string | null;
  features?: any;
  security?: any;
  billing?: any;
};

export type WorkspaceMember = {
  user_id: ID;
  role: "owner" | "admin" | "manager" | "member" | "billing";
};
