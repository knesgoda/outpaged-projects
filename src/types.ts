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

export type Automation = {
  id: string;
  owner: string;
  project_id?: string | null;
  name: string;
  enabled: boolean;
  trigger_type: 'on_task_created' | 'on_task_moved' | 'on_due_soon' | 'schedule_cron';
  trigger_config: any;
  action_type: 'create_subtask' | 'change_status' | 'send_webhook';
  action_config: any;
  created_at: string;
  updated_at: string;
};

export type AutomationRun = {
  id: string;
  automation_id: string;
  status: 'success' | 'error';
  message?: string | null;
  payload?: any;
  created_at: string;
};
