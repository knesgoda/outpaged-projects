import type { ID } from "./core";

export type ProjectFile = {
  id: ID;
  project_id: ID;
  bucket?: "files";
  path: string;
  size_bytes?: number;
  mime_type?: string | null;
  title?: string | null;
  uploaded_by?: ID;
  created_at?: string;
};
