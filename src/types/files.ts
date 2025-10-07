export type ProjectFile = {
  id: string;
  project_id: string;
  bucket: "files";
  path: string;
  size_bytes: number;
  mime_type?: string | null;
  title?: string | null;
  uploaded_by: string;
  created_at: string;
};
