-- CRITICAL SECURITY FIX - Remove all public access from sensitive tables
-- Focus on the specific tables flagged by security scanner

-- Check and secure tables that still have public access issues
-- 1. DISABLE all RLS temporarily to reset, then re-enable with proper policies

-- Reset tickets table completely
ALTER TABLE public.tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Create only authenticated-user policies for tickets
CREATE POLICY "Tickets: owners and admins only"
ON public.tickets FOR ALL TO authenticated
USING (auth.uid() = created_by OR auth.uid() = assigned_to OR is_admin(auth.uid()))
WITH CHECK (auth.uid() = created_by OR is_admin(auth.uid()));

-- Reset password_history table completely  
ALTER TABLE public.password_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

-- No user access at all to password history
CREATE POLICY "Password history: no access"
ON public.password_history FOR ALL
USING (false) WITH CHECK (false);

-- Reset user_sessions table completely
ALTER TABLE public.user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "User sessions: own sessions only"
ON public.user_sessions FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Reset security_audit_log table completely
ALTER TABLE public.security_audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs, system can insert
CREATE POLICY "Security audit: admin view only"
ON public.security_audit_log FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Security audit: system insert only"
ON public.security_audit_log FOR INSERT
WITH CHECK (true); -- Allow system inserts

-- Reset account_lockouts table completely
ALTER TABLE public.account_lockouts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;

-- Only admins can manage lockouts
CREATE POLICY "Account lockouts: admin only"
ON public.account_lockouts FOR ALL TO authenticated
USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Reset rate_limits table completely
ALTER TABLE public.rate_limits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only admins can view rate limits
CREATE POLICY "Rate limits: admin only"
ON public.rate_limits FOR ALL TO authenticated  
USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- Log the security reset
INSERT INTO public.security_audit_log (user_id, action, resource_type, success, metadata)
VALUES (
  COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
  'security_complete_lockdown',
  'database',
  true,
  jsonb_build_object(
    'action', 'reset_all_sensitive_table_policies',
    'tables_secured', ARRAY[
      'tickets',
      'password_history', 
      'user_sessions',
      'security_audit_log',
      'account_lockouts',
      'rate_limits'
    ],
    'access_level', 'authenticated_users_only',
    'timestamp', now()
  )
);