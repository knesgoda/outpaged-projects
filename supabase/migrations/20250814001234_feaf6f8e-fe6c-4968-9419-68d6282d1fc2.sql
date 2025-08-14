-- Fix the is_admin function to be truly read-only and RLS-safe
-- Remove the INSERT operation that's causing the "INSERT is not allowed in a non-volatile function" error
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result BOOLEAN;
BEGIN
  -- Check admin status without any side effects
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = $1 AND is_admin = TRUE
  ) INTO result;
  
  RETURN result;
END;
$function$;

-- Also ensure other policy helper functions are read-only
-- Check if is_project_member has any side effects (it should be fine but let's verify)
CREATE OR REPLACE FUNCTION public.is_project_member(project_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members pm 
    WHERE pm.project_id = $1 AND pm.user_id = $2
  );
END;
$function$;