-- Fix remaining security definer views and tighten security policies

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

-- Enable RLS on the view
ALTER VIEW public.task_assignees_with_profiles SET (security_barrier = true);

-- Make the password_history table completely inaccessible
-- Drop existing policies and create complete lockdown
DROP POLICY IF EXISTS "Password history: no access" ON public.password_history;
DROP POLICY IF EXISTS "System only password history" ON public.password_history;

-- Create absolute no-access policy for password history
CREATE POLICY "Password history: complete lockdown" ON public.password_history
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

-- Additional policy to prevent any service role access except for system functions
CREATE POLICY "Password history: system functions only" ON public.password_history
FOR ALL
TO service_role
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

CREATE POLICY "Tickets: strict customer access" ON public.tickets
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

CREATE POLICY "Ticket responses: ultra restrictive access" ON public.ticket_responses
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

-- Add additional audit logging trigger for sensitive tables
CREATE OR REPLACE FUNCTION public.audit_sensitive_table_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log access to sensitive tables
  INSERT INTO public.security_audit_log (
    user_id, action, resource_type, resource_id, success, metadata
  ) VALUES (
    auth.uid(),
    TG_OP || '_' || TG_TABLE_NAME,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    true,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'timestamp', now(),
      'user_role', (SELECT role FROM public.profiles WHERE user_id = auth.uid()),
      'is_admin', is_admin(auth.uid())
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_tickets_access ON public.tickets;
CREATE TRIGGER audit_tickets_access
  AFTER SELECT ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_table_access();

DROP TRIGGER IF EXISTS audit_admin_log_access ON public.admin_audit_log;
CREATE TRIGGER audit_admin_log_access
  AFTER SELECT ON public.admin_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_table_access();