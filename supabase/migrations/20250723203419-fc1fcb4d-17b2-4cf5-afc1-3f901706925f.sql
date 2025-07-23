-- Fix the remaining SECURITY DEFINER view issue

-- Drop the existing view that still has SECURITY DEFINER
DROP VIEW IF EXISTS public.task_assignees_with_profiles CASCADE;

-- Recreate the view without SECURITY DEFINER (regular view)
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

-- Ensure proper RLS policies are applied to the underlying tables
-- The view will inherit the RLS policies from the joined tables

-- Grant necessary permissions to the view
GRANT SELECT ON public.task_assignees_with_profiles TO authenticated;
GRANT SELECT ON public.task_assignees_with_profiles TO anon;