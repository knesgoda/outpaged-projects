codex/implement-global-search-and-command-k-palette
export type SearchResult = {
  id: string;
  type: 'task' | 'project' | 'doc' | 'file' | 'comment' | 'person';
  title: string;
  snippet?: string | null;
  url: string;
  project_id?: string | null;
  updated_at?: string | null;
  score?: number;
};
/**
 * DO NOT ADD TYPES HERE.
 * This file only re-exports from src/types/index.ts to keep imports stable.
 * Add new types under src/types/<domain>.ts and export them from src/types/index.ts.
 */
export * from "./types";
