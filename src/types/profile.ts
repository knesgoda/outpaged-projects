import type { ID } from "./core";

export type ProfileLite = {
  id: ID;
  full_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
};

export type Profile = {
  id: ID;
  full_name?: string | null;
  avatar_url?: string | null;
  title?: string | null;
  department?: string | null;
  timezone?: string | null;
  capacity_hours_per_week?: number | null;
  updated_at: string;
};
