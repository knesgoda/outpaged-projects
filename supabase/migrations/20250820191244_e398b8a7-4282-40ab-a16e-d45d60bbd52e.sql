-- CRITICAL: Fix remaining publicly exposed sensitive tables

-- 1. CRITICAL: Secure tickets table - contains customer PII
DROP POLICY IF EXISTS "Secure ticket creation" ON public.tickets;
DROP POLICY IF EXISTS "Secure ticket owner access" ON public.tickets;
DROP POLICY IF EXISTS "Secure ticket updates" ON public.tickets;
DROP POLICY IF EXISTS "Tickets: owners and admins only" ON public.tickets;

ALTER TABLE public.tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tickets: owners and admins only"
ON public.tickets FOR ALL TO authenticated
USING ((auth.uid() = created_by) OR (auth.uid() = assigned_to) OR is_admin(auth.uid()))
WITH CHECK ((auth.uid() = created_by) OR is_admin(auth.uid()));

-- 2. CRITICAL: Secure user_sessions table - contains session tokens
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  last_activity timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  ip_address inet,
  user_agent text
);

ALTER TABLE public.user_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Only session owners can access their own sessions
CREATE POLICY "Users can view their own sessions only"
ON public.user_sessions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions only"
ON public.user_sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions only"
ON public.user_sessions FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions only"
ON public.user_sessions FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- 3. CRITICAL: Secure password_history table - system only access
ALTER TABLE public.password_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

-- Block all public access to password history
CREATE POLICY "Password history: no access"
ON public.password_history FOR ALL TO authenticated
USING (false)
WITH CHECK (false);

-- System-only policy for password validation functions
CREATE POLICY "System only password history"
ON public.password_history FOR INSERT TO authenticated
WITH CHECK (false);

-- 4. Log security hardening completion
INSERT INTO public.security_audit_log (user_id, action, resource_type, success, metadata)
VALUES (
  COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid),
  'critical_data_tables_secured',
  'database',
  true,
  jsonb_build_object(
    'tables_secured', ARRAY[
      'tickets_customer_data_protected',
      'user_sessions_access_restricted',
      'password_history_system_only'
    ],
    'security_level', 'maximum',
    'timestamp', now()
  )
);