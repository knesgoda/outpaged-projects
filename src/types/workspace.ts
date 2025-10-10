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

export type WorkspaceSummary = {
  id: ID;
  name: string;
  slug: string;
  description?: string | null;
  settings?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

export type SpaceSummary = {
  id: ID;
  workspace_id: ID;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  space_type?: string | null;
  position?: number | null;
  settings?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

export type WorkspaceRole =
  | "org_admin"
  | "space_admin"
  | "project_lead"
  | "contributor"
  | "requester"
  | "guest"
  | "owner"
  | "admin"
  | "manager"
  | "member"
  | "billing";

export type WorkspaceMember = {
  user_id: ID;
  role: WorkspaceRole;
};
