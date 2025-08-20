-- TARGETED SECURITY FIXES - Handle existing policies carefully
-- Drop all potentially conflicting policies first, then recreate

-- 1. CRITICAL: Clean up and secure tickets table completely
DROP POLICY IF EXISTS "Ticket owners can view their tickets" ON public.tickets;
DROP POLICY IF EXISTS "Assigned users can view assigned tickets" ON public.tickets;
DROP POLICY IF EXISTS "Authenticated users can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Anyone can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Public can create tickets" ON public.tickets;

-- Create secure ticket policies
CREATE POLICY "Secure ticket owner access" 
ON public.tickets FOR SELECT TO authenticated
USING (auth.uid() = created_by OR auth.uid() = assigned_to OR is_admin(auth.uid()));

CREATE POLICY "Secure ticket creation" 
ON public.tickets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Secure ticket updates"
ON public.tickets FOR UPDATE TO authenticated
USING (auth.uid() = created_by OR auth.uid() = assigned_to OR is_admin(auth.uid()));

-- 2. CRITICAL: Completely lock down password_history
DROP POLICY IF EXISTS "System only password history access" ON public.password_history;
DROP POLICY IF EXISTS "Users can view their password history" ON public.password_history;

CREATE POLICY "Block all password history access"
ON public.password_history FOR ALL 
USING (false) WITH CHECK (false);

-- 3. CRITICAL: Secure security audit logs (admin only)
DROP POLICY IF EXISTS "Admins only can view security audit logs" ON public.security_audit_log;
DROP POLICY IF EXISTS "Public can view audit logs" ON public.security_audit_log;

CREATE POLICY "Admin only security audit access"
ON public.security_audit_log FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

-- Allow system inserts for audit logging
CREATE POLICY "System can insert audit logs"
ON public.security_audit_log FOR INSERT
WITH CHECK (true);

-- 4. CRITICAL: Secure account lockouts (admin only)
DROP POLICY IF EXISTS "Admins only can view account lockouts" ON public.account_lockouts;
DROP POLICY IF EXISTS "Public can view lockouts" ON public.account_lockouts;

CREATE POLICY "Admin only lockout management"
ON public.account_lockouts FOR ALL TO authenticated
USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- 5. Create user_sessions table if it doesn't exist and secure it
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone NOT NULL
);

ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own sessions"
ON public.user_sessions FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions"
ON public.user_sessions FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);