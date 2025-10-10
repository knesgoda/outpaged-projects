import type { ID } from "./core";

export type OrganizationSummary = {
  id: ID;
  name: string;
  slug: string;
  description?: string | null;
  settings?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
};

export type OrganizationMemberRole =
  | "owner"
  | "admin"
  | "billing"
  | "manager"
  | "member"
  | "viewer";

export type OrganizationMember = {
  id: ID;
  organization_id: ID;
  user_id: ID;
  role: OrganizationMemberRole;
  created_at?: string;
  updated_at?: string;
};
