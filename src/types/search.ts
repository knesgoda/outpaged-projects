import type { ID } from "./core";

export type SearchResult = {
  id: ID;
  type: "task" | "project" | "doc" | "file" | "comment" | "person";
  title: string;
  snippet?: string | null;
  url: string;
  project_id?: ID | null;
  updated_at?: string | null;
  score?: number;
};
