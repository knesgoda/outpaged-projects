-- FINAL SECURITY HARDENING - Remove all public role policies
-- Keep only secure authenticated-role policies

-- 1. Remove all public-role policies from sensitive tables
-- These are the dangerous policies allowing public access

-- Tickets: Remove public access policies, keep secure authenticated ones
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Assigned users can update their tickets" ON public.tickets;

-- Password History: Remove public access completely
DROP POLICY IF EXISTS "Block all password history access" ON public.password_history;
DROP POLICY IF EXISTS "Only system can insert password history" ON public.password_history;

-- Only system can insert, nothing else
CREATE POLICY "System only password history"
ON public.password_history FOR INSERT
WITH CHECK (false); -- Block all user access

-- Security Audit Log: Remove public access
DROP POLICY IF EXISTS "Admins can view security audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "System can insert security audit logs" ON public.security_audit_log;

-- Account Lockouts: Remove public access  
DROP POLICY IF EXISTS "Admins can manage account lockouts" ON public.account_lockouts;

-- Rate Limits: Remove public access
DROP POLICY IF EXISTS "Admins can view rate limits" ON public.rate_limits;

-- Create admin-only policy for rate limits
CREATE POLICY "Admin only rate limits access"
ON public.rate_limits FOR ALL TO authenticated
USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 2. Ensure all other sensitive tables are properly secured
-- Secure admin_audit_log if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_audit_log') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Public can view admin audit" ON public.admin_audit_log';
    EXECUTE 'CREATE POLICY "Admin only audit log access" ON public.admin_audit_log FOR SELECT TO authenticated USING (is_admin(auth.uid()))';
  END IF;
END $$;

-- 3. Log the security hardening completion
INSERT INTO public.security_audit_log (user_id, action, resource_type, success, metadata)
VALUES (
  COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
  'security_hardening_completed',
  'database',
  true,
  jsonb_build_object(
    'policies_removed', ARRAY[
      'public_access_to_tickets',
      'public_access_to_password_history', 
      'public_access_to_audit_logs',
      'public_access_to_rate_limits'
    ],
    'secured_tables', ARRAY[
      'tickets',
      'password_history',
      'security_audit_log',
      'account_lockouts',
      'rate_limits',
      'admin_audit_log'
    ],
    'timestamp', now()
  )
);