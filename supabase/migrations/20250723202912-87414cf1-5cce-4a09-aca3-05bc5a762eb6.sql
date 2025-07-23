-- Fix remaining security issues from linter warnings

-- 1. Fix all remaining functions without proper search_path
CREATE OR REPLACE FUNCTION public.can_delete_default_project(project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only admins can delete the default "My First Project"
  RETURN is_admin(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id 
    AND name = 'My First Project'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_team_member_stats(member_user_id UUID)
RETURNS TABLE(projects_count INTEGER, tasks_completed INTEGER, total_time_minutes INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((
      SELECT COUNT(DISTINCT pm.project_id)::INTEGER 
      FROM public.project_members pm 
      WHERE pm.user_id = member_user_id
    ), 0) as projects_count,
    COALESCE((
      SELECT COUNT(*)::INTEGER 
      FROM public.tasks t 
      WHERE t.assignee_id = member_user_id 
      AND t.status = 'done'
    ), 0) as tasks_completed,
    COALESCE((
      SELECT SUM(te.duration_minutes)::INTEGER 
      FROM public.time_entries te 
      WHERE te.user_id = member_user_id
    ), 0) as total_time_minutes;
END;
$$;

CREATE OR REPLACE FUNCTION public.should_show_in_kanban(task_hierarchy task_hierarchy_level)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = 'public'
AS $$
  SELECT task_hierarchy IN ('story', 'task', 'subtask');
$$;

CREATE OR REPLACE FUNCTION public.migrate_existing_assignees()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert existing assignees into the new table
  INSERT INTO public.task_assignees (task_id, user_id, assigned_by)
  SELECT 
    id as task_id,
    assignee_id as user_id,
    reporter_id as assigned_by
  FROM public.tasks 
  WHERE assignee_id IS NOT NULL
  ON CONFLICT (task_id, user_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_admin_action(action_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log the admin action attempt
  INSERT INTO public.admin_audit_log (admin_user_id, action)
  VALUES (auth.uid(), action_type);
  
  -- Verify admin status
  RETURN is_admin(auth.uid());
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_circular_dependency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only check for circular dependencies with 'blocks' and 'depends_on' relationships
  IF NEW.relationship_type IN ('blocks', 'depends_on') THEN
    -- Check if adding this relationship would create a circular dependency
    IF EXISTS (
      WITH RECURSIVE dependency_chain AS (
        -- Start with the new relationship
        SELECT NEW.target_task_id as task_id, NEW.source_task_id as blocks_task_id, 1 as depth
        
        UNION ALL
        
        -- Follow the chain of dependencies
        SELECT tr.target_task_id, dc.blocks_task_id, dc.depth + 1
        FROM public.task_relationships tr
        JOIN dependency_chain dc ON tr.source_task_id = dc.task_id
        WHERE tr.relationship_type IN ('blocks', 'depends_on')
        AND dc.depth < 10 -- Prevent infinite recursion
      )
      SELECT 1 FROM dependency_chain 
      WHERE task_id = blocks_task_id -- Circular dependency detected
    ) THEN
      RAISE EXCEPTION 'Cannot create relationship: would create circular dependency';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_task_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Sub-tasks can only be under stories, tasks, or bugs
  IF NEW.hierarchy_level = 'subtask' AND NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE id = NEW.parent_id 
      AND (hierarchy_level = 'story' OR hierarchy_level = 'task' OR task_type = 'bug')
    ) THEN
      RAISE EXCEPTION 'Sub-tasks can only be created under Stories, Tasks, or Bugs';
    END IF;
  END IF;
  
  -- Stories can only be under epics
  IF NEW.hierarchy_level = 'story' AND NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE id = NEW.parent_id 
      AND hierarchy_level = 'epic'
    ) THEN
      RAISE EXCEPTION 'Stories can only be created under Epics';
    END IF;
  END IF;
  
  -- Epics can only be under initiatives
  IF NEW.hierarchy_level = 'epic' AND NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE id = NEW.parent_id 
      AND hierarchy_level = 'initiative'
    ) THEN
      RAISE EXCEPTION 'Epics can only be created under Initiatives';
    END IF;
  END IF;
  
  -- Initiatives cannot have parents
  IF NEW.hierarchy_level = 'initiative' AND NEW.parent_id IS NOT NULL THEN
    RAISE EXCEPTION 'Initiatives cannot have parent tasks';
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_task_hierarchy_path(task_id UUID)
RETURNS TABLE(id UUID, title TEXT, hierarchy_level task_hierarchy_level, depth INTEGER)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.get_task_children(task_id UUID)
RETURNS TABLE(id UUID, title TEXT, hierarchy_level task_hierarchy_level, task_type task_type, status task_status, priority task_priority)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

-- 2. Fix the security definer view issue by recreating as a regular view
DROP VIEW IF EXISTS public.task_assignees_with_profiles;

CREATE VIEW public.task_assignees_with_profiles AS
SELECT 
  ta.id,
  ta.task_id,
  ta.user_id,
  ta.assigned_at,
  ta.assigned_by,
  p.full_name,
  p.avatar_url
FROM public.task_assignees ta
JOIN public.profiles p ON ta.user_id = p.user_id;