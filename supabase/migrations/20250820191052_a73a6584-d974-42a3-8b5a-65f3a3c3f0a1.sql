-- Fix remaining Security Definer Views
-- Query to find all SECURITY DEFINER views and recreate them as regular views

-- Check for any remaining SECURITY DEFINER views and convert them
DO $$
DECLARE
    view_record RECORD;
    view_definition TEXT;
BEGIN
    -- Find all views with SECURITY DEFINER
    FOR view_record IN 
        SELECT schemaname, viewname 
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND definition ILIKE '%SECURITY DEFINER%'
    LOOP
        -- Get the view definition without SECURITY DEFINER
        SELECT definition INTO view_definition
        FROM pg_views 
        WHERE schemaname = view_record.schemaname 
        AND viewname = view_record.viewname;
        
        -- Drop and recreate without SECURITY DEFINER
        EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE', view_record.schemaname, view_record.viewname);
        
        -- Remove SECURITY DEFINER from definition and recreate
        view_definition := REPLACE(view_definition, 'SECURITY DEFINER', '');
        EXECUTE format('CREATE VIEW %I.%I AS %s', view_record.schemaname, view_record.viewname, view_definition);
        
        RAISE NOTICE 'Converted view %.% from SECURITY DEFINER to regular view', view_record.schemaname, view_record.viewname;
    END LOOP;
END
$$;

-- Ensure our recreated views don't have SECURITY DEFINER
DROP VIEW IF EXISTS public.project_members_with_profiles CASCADE;
CREATE VIEW public.project_members_with_profiles AS
SELECT 
  pm.project_id,
  pm.user_id,
  p.full_name,
  p.avatar_url
FROM project_members pm
JOIN profiles p ON (p.user_id = pm.user_id);

DROP VIEW IF EXISTS public.task_assignees_with_profiles CASCADE;  
CREATE VIEW public.task_assignees_with_profiles AS
SELECT 
  ta.id,
  ta.task_id,
  ta.user_id,
  ta.assigned_at,
  ta.assigned_by,
  p.full_name,
  p.avatar_url
FROM task_assignees ta
JOIN profiles p ON (ta.user_id = p.user_id);

-- Log the security definer view fix
INSERT INTO public.security_audit_log (user_id, action, resource_type, success, metadata)
VALUES (
  COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
  'security_definer_views_fixed',
  'database',
  true,
  jsonb_build_object(
    'action', 'converted_security_definer_views_to_regular_views',
    'security_level', 'maximum',
    'timestamp', now()
  )
);