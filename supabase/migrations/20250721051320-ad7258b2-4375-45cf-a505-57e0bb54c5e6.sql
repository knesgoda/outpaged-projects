-- Add task hierarchy and type system

-- Create enums for task hierarchy levels and types
CREATE TYPE public.task_hierarchy_level AS ENUM (
  'initiative',
  'epic', 
  'story',
  'task',
  'subtask'
);

CREATE TYPE public.task_type AS ENUM (
  'bug',
  'feature_request',
  'design'
);

-- Add new columns to tasks table
ALTER TABLE public.tasks 
ADD COLUMN parent_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
ADD COLUMN hierarchy_level public.task_hierarchy_level DEFAULT 'task',
ADD COLUMN task_type public.task_type DEFAULT 'feature_request';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON public.tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_hierarchy_level ON public.tasks(hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON public.tasks(task_type);

-- Create a function to get task hierarchy path
CREATE OR REPLACE FUNCTION public.get_task_hierarchy_path(task_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  hierarchy_level public.task_hierarchy_level,
  depth integer
) AS $$
WITH RECURSIVE task_hierarchy AS (
  -- Base case: start with the given task
  SELECT 
    t.id,
    t.title,
    t.hierarchy_level,
    t.parent_id,
    0 as depth
  FROM public.tasks t
  WHERE t.id = task_id
  
  UNION ALL
  
  -- Recursive case: get parent tasks
  SELECT 
    t.id,
    t.title,
    t.hierarchy_level,
    t.parent_id,
    th.depth + 1
  FROM public.tasks t
  INNER JOIN task_hierarchy th ON t.id = th.parent_id
)
SELECT 
  th.id,
  th.title,
  th.hierarchy_level,
  th.depth
FROM task_hierarchy th
ORDER BY th.depth DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Create a function to get task children
CREATE OR REPLACE FUNCTION public.get_task_children(task_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  hierarchy_level public.task_hierarchy_level,
  task_type public.task_type,
  status public.task_status,
  priority public.task_priority
) AS $$
SELECT 
  t.id,
  t.title,
  t.hierarchy_level,
  t.task_type,
  t.status,
  t.priority
FROM public.tasks t
WHERE t.parent_id = task_id
ORDER BY t.created_at ASC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Update existing tasks to have proper hierarchy levels based on existing data
-- This is a one-time migration to set reasonable defaults
UPDATE public.tasks SET hierarchy_level = 'task' WHERE hierarchy_level IS NULL;