import type { ID } from "./core";

export type ProfileLite = {
  id: ID;
  user_id?: ID;
  full_name?: string | null;
  avatar_url?: string | null;
  email?: string | null;
};

export type Profile = {
  id: ID;
  full_name?: string | null;
  avatar_url?: string | null;
  updated_at: string;
};
