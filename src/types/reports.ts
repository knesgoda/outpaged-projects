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
