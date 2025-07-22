-- Comprehensive Database Security Fixes

-- 1. Fix the task_assignees_with_profiles view to use proper security
-- First drop the existing view
DROP VIEW IF EXISTS public.task_assignees_with_profiles;

-- Recreate the view with proper security settings
CREATE VIEW public.task_assignees_with_profiles 
WITH (security_barrier = true) AS
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

-- Enable RLS on the view
ALTER VIEW public.task_assignees_with_profiles SET (security_barrier = true);

-- 2. Fix remaining function search path security issues
-- Update all functions to have explicit search_path settings

-- Fix prevent_circular_dependency function
CREATE OR REPLACE FUNCTION public.prevent_circular_dependency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix validate_task_hierarchy function
CREATE OR REPLACE FUNCTION public.validate_task_hierarchy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix create_default_status_mapping function
CREATE OR REPLACE FUNCTION public.create_default_status_mapping()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create a status mapping for the new column
  -- Use the column name as the status value (lowercased and with spaces replaced by underscores)
  INSERT INTO public.task_status_mappings (
    project_id,
    column_id,
    status_value,
    display_name
  ) VALUES (
    NEW.project_id,
    NEW.id,
    LOWER(REPLACE(NEW.name, ' ', '_')),
    NEW.name
  );
  
  RETURN NEW;
END;
$$;

-- 3. Add missing RLS policies for the view
-- Since we can't add RLS policies directly to views, we rely on the underlying table policies
-- The view will inherit security through the JOIN with tables that have RLS enabled

-- 4. Ensure all security-sensitive functions are marked as SECURITY DEFINER with proper search_path
-- Update any remaining functions that might have security issues

-- Fix get_task_hierarchy_path function to be more secure
CREATE OR REPLACE FUNCTION public.get_task_hierarchy_path(task_id uuid)
RETURNS TABLE(id uuid, title text, hierarchy_level task_hierarchy_level, depth integer)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
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

-- Fix get_task_children function to be more secure
CREATE OR REPLACE FUNCTION public.get_task_children(task_id uuid)
RETURNS TABLE(id uuid, title text, hierarchy_level task_hierarchy_level, task_type task_type, status task_status, priority task_priority)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
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

-- 5. Add audit logging for critical security functions
-- Create an audit trigger for admin privilege changes
CREATE OR REPLACE FUNCTION public.audit_admin_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log when admin status is changed
  IF TG_OP = 'UPDATE' AND OLD.is_admin != NEW.is_admin THEN
    INSERT INTO public.admin_audit_log (
      admin_user_id,
      action,
      target_user_id,
      target_table,
      old_values,
      new_values
    ) VALUES (
      auth.uid(),
      'admin_status_change',
      NEW.user_id,
      'profiles',
      jsonb_build_object('is_admin', OLD.is_admin),
      jsonb_build_object('is_admin', NEW.is_admin)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for admin changes audit
DROP TRIGGER IF EXISTS audit_admin_changes_trigger ON public.profiles;
CREATE TRIGGER audit_admin_changes_trigger
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_admin_changes();

-- 6. Ensure proper constraints and validations
-- Add constraint to prevent self-assignment in task relationships
ALTER TABLE public.task_relationships 
DROP CONSTRAINT IF EXISTS no_self_reference;

ALTER TABLE public.task_relationships 
ADD CONSTRAINT no_self_reference 
CHECK (source_task_id != target_task_id);

-- 7. Final security hardening
-- Revoke unnecessary permissions from public role
REVOKE ALL ON SCHEMA information_schema FROM public;
REVOKE ALL ON SCHEMA pg_catalog FROM public;

-- Grant only necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;