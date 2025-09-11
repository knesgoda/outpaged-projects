-- Fix remaining security issues without invalid trigger syntax

-- Drop and recreate any remaining security definer views without security definer
DROP VIEW IF EXISTS public.task_assignees_with_profiles CASCADE;

-- Recreate the view without security definer (safer approach)
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
LEFT JOIN public.profiles p ON ta.user_id = p.user_id;

-- Enable RLS on the view with security barrier
ALTER VIEW public.task_assignees_with_profiles SET (security_barrier = true);

-- Create RLS policy for the view
CREATE POLICY "View task assignees with profiles" ON public.task_assignees_with_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    WHERE t.id = task_assignees_with_profiles.task_id
    AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
  )
);

-- Make the password_history table completely inaccessible
DROP POLICY IF EXISTS "Password history: no access" ON public.password_history;
DROP POLICY IF EXISTS "System only password history" ON public.password_history;

-- Create absolute no-access policy for password history
CREATE POLICY "Password history: complete lockdown" ON public.password_history
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- Tighten security_audit_log access to super admins only
DROP POLICY IF EXISTS "Admins can view security audit log" ON public.security_audit_log;

CREATE POLICY "Super admin only security audit log" ON public.security_audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND is_admin = true 
    AND role = 'super_admin'::team_role
  )
);

-- System can insert security events (needed for logging)
CREATE POLICY "System can log security events" ON public.security_audit_log
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Restrict tickets table access further - ensure customer data is protected
DROP POLICY IF EXISTS "Tickets: customers can view own tickets only" ON public.tickets;
DROP POLICY IF EXISTS "Tickets: strict customer access" ON public.tickets;

CREATE POLICY "Tickets: ultra strict customer access" ON public.tickets
FOR SELECT
TO authenticated
USING (
  -- Only ticket creator, assigned staff, or admins can view
  (auth.uid() = created_by) OR 
  (auth.uid() = assigned_to) OR 
  is_admin(auth.uid())
);

-- Ensure ticket responses are properly secured
DROP POLICY IF EXISTS "Ticket responses: restrictive access" ON public.ticket_responses;
DROP POLICY IF EXISTS "Ticket responses: ultra restrictive access" ON public.ticket_responses;

CREATE POLICY "Ticket responses: maximum security access" ON public.ticket_responses
FOR SELECT
TO authenticated
USING (
  -- Only admins or ticket participants can view responses
  is_admin(auth.uid()) OR 
  (
    EXISTS (
      SELECT 1 FROM public.tickets t 
      WHERE t.id = ticket_responses.ticket_id 
      AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid())
    ) AND 
    -- Non-internal responses only for customers
    (is_admin(auth.uid()) OR NOT is_internal)
  )
);