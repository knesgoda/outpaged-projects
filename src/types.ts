export type IntegrationKey = 'gmail' | 'google_calendar' | 'google_docs' | 'github';

export type UserIntegration = {
  id: string;
  user_id: string;
  project_id?: string | null;
  provider: IntegrationKey;
  display_name?: string | null;
  access_data: any;
  created_at: string;
};

export type LinkedResource = {
  id: string;
  provider: IntegrationKey;
  external_type: 'email' | 'thread' | 'event' | 'doc' | 'repo' | 'issue' | 'pr' | 'file';
  external_id?: string | null;
  url?: string | null;
  title?: string | null;
  metadata: any;
  entity_type: 'task' | 'project' | 'doc';
  entity_id: string;
  project_id?: string | null;
  created_by?: string | null;
  created_at: string;
};
