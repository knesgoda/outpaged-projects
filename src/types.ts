export type Report = {
  id: string;
  owner: string;
  name: string;
  description?: string | null;
  config: any;
  created_at: string;
  updated_at: string;
};

export type WorkspaceSettings = {
  id: string;
  owner: string;
  brand_name?: string | null;
  brand_logo_url?: string | null;
  updated_at: string;
};

export type Profile = {
  id: string;
  full_name?: string | null;
  avatar_url?: string | null;
  updated_at: string;
};
