
import { User } from '@supabase/supabase-js';

export const mockUser: User = {
  id: 'test-user-id',
  email: 'test@outpaged.com',
  email_confirmed_at: new Date().toISOString(),
  phone: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  confirmation_sent_at: new Date().toISOString(),
  recovery_sent_at: new Date().toISOString(),
  email_change_sent_at: new Date().toISOString(),
  new_email: '',
  invited_at: new Date().toISOString(),
  action_link: '',
  email_change: '',
  phone_change: '',
  phone_change_sent_at: new Date().toISOString(),
  confirmed_at: new Date().toISOString(),
  email_change_confirm_status: 0,
  phone_change_confirm_status: 0,
  banned_until: new Date().toISOString(),
  identities: [],
  factors: [],
  role: 'authenticated'
};

export const mockProject = {
  id: 'test-project-id',
  name: 'Test Project',
  description: 'A test project',
  owner_id: 'test-user-id',
  status: 'active' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  start_date: new Date().toISOString().split('T')[0],
  end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
};

export const mockTask = {
  id: 'test-task-id',
  title: 'Test Task',
  description: 'A test task',
  project_id: 'test-project-id',
  reporter_id: 'test-user-id',
  assignee_id: 'test-user-id',
  status: 'todo' as const,
  priority: 'medium' as const,
  task_type: 'feature_request' as const,
  hierarchy_level: 'task' as const,
  story_points: 3,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  parent_id: null,
  sprint_id: null,
  swimlane_id: null
};
