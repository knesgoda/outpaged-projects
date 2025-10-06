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

export type ProjectMeta = {
  id: string;
  name: string | null;
  code?: string | null;
};
