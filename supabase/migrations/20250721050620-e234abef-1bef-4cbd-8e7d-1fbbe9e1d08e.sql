
-- First, let's clean up any potential foreign key constraint issues
-- and ensure proper relationships between tables

-- Drop and recreate foreign key constraints to ensure consistency
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_reporter_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_project_id_fkey;

-- Add proper foreign key constraints
ALTER TABLE tasks 
ADD CONSTRAINT tasks_assignee_id_fkey 
FOREIGN KEY (assignee_id) REFERENCES profiles(user_id) ON DELETE SET NULL;

ALTER TABLE tasks 
ADD CONSTRAINT tasks_reporter_id_fkey 
FOREIGN KEY (reporter_id) REFERENCES profiles(user_id) ON DELETE CASCADE;

ALTER TABLE tasks 
ADD CONSTRAINT tasks_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Ensure comments table has proper foreign key to tasks
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_task_id_fkey;
ALTER TABLE comments 
ADD CONSTRAINT comments_task_id_fkey 
FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

-- Ensure time_entries table has proper foreign key to tasks
ALTER TABLE time_entries DROP CONSTRAINT IF EXISTS time_entries_task_id_fkey;
ALTER TABLE time_entries 
ADD CONSTRAINT time_entries_task_id_fkey 
FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_reporter_id ON tasks(reporter_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
