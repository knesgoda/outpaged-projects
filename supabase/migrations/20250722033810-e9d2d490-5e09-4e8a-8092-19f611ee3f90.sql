
-- Fix task assignee system by ensuring proper relationships
-- Update tasks table to remove deprecated assignee_id column (if not already done)
-- and ensure we're using the task_assignees table properly

-- Create indexes for better performance on task queries
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_swimlane ON tasks(swimlane_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_task ON task_assignees(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignees_user ON task_assignees(user_id);

-- Ensure kanban columns have proper default status mappings
-- This trigger will create status mappings when new columns are created
CREATE OR REPLACE FUNCTION ensure_status_mapping()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if a status mapping already exists for this column
  IF NOT EXISTS (
    SELECT 1 FROM task_status_mappings 
    WHERE column_id = NEW.id AND project_id = NEW.project_id
  ) THEN
    -- Create default status mapping based on column name
    INSERT INTO task_status_mappings (
      project_id,
      column_id,
      status_value,
      display_name
    ) VALUES (
      NEW.project_id,
      NEW.id,
      CASE 
        WHEN LOWER(NEW.name) LIKE '%todo%' OR LOWER(NEW.name) LIKE '%to do%' THEN 'todo'
        WHEN LOWER(NEW.name) LIKE '%progress%' OR LOWER(NEW.name) LIKE '%doing%' THEN 'in_progress'
        WHEN LOWER(NEW.name) LIKE '%review%' OR LOWER(NEW.name) LIKE '%testing%' THEN 'in_review'
        WHEN LOWER(NEW.name) LIKE '%done%' OR LOWER(NEW.name) LIKE '%complete%' THEN 'done'
        ELSE LOWER(REPLACE(NEW.name, ' ', '_'))
      END,
      NEW.name
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic status mapping creation
DROP TRIGGER IF EXISTS create_status_mapping_trigger ON kanban_columns;
CREATE TRIGGER create_status_mapping_trigger
  AFTER INSERT ON kanban_columns
  FOR EACH ROW
  EXECUTE FUNCTION ensure_status_mapping();

-- Add blocked field to tasks if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'blocked'
  ) THEN
    ALTER TABLE tasks ADD COLUMN blocked BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add blocking_reason field to tasks if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'blocking_reason'
  ) THEN
    ALTER TABLE tasks ADD COLUMN blocking_reason TEXT;
  END IF;
END $$;
