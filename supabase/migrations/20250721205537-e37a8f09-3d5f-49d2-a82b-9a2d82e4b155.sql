-- Drop the problematic view and recreate it safely
DROP VIEW IF EXISTS public.task_assignees_with_profiles;

-- Create a safer view without security definer issues
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