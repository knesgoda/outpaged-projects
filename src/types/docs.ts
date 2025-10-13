export type DocCollaborationOperation = {
  id?: string;
  update: string;
  clientId?: string | null;
  createdAt?: string | null;
  offline?: boolean;
};

export type DocCollaborationMetadata = {
  snapshot: string | null;
  stateVector: string | null;
  version: number;
  lastSyncedAt?: string | null;
  pendingOperations: DocCollaborationOperation[];
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
  collaboration?: DocCollaborationMetadata;
};
