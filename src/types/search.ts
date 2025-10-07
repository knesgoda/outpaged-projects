export type SearchResult = {
  id: string;
  type:
    | "task"
    | "project"
    | "doc"
    | "file"
    | "comment"
    | "person"
    | "team_member";
  title: string;
  snippet?: string | null;
  url: string;
  project_id?: string | null;
  updated_at?: string | null;
  score?: number;
};
