export type ProjectFile = {
  id: string;
  project_id: string;
  bucket: 'files';
  path: string;
  size_bytes: number;
  mime_type?: string | null;
  title?: string | null;
  uploaded_by: string;
  created_at: string;
};

export type IntegrationKey = 'slack' | 'github' | 'google_drive' | 'webhooks';

export type Integration = {
  key: IntegrationKey;
  name: string;
  enabled: boolean;
  config: any;
};

export type IntegrationProvider = 'slack' | 'github' | 'google_drive';

export type UserIntegration = {
  id: string;
  user_id: string;
  project_id?: string | null;
  provider: IntegrationProvider;
  display_name?: string | null;
  access_data: any;
  created_at: string;
};

export type Webhook = {
  id: string;
  owner: string;
  project_id?: string | null;
  target_url: string;
  secret?: string | null;
  active: boolean;
  created_at: string;
};
