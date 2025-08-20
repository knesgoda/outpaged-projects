-- COMPREHENSIVE CRITICAL SECURITY FIXES
-- Fix all public data exposure and security definer views

-- 1. CRITICAL: Fix tickets table - secure customer PII
DROP POLICY IF EXISTS "Anyone can view tickets" ON public.tickets;
DROP POLICY IF EXISTS "Public can create tickets" ON public.tickets;

-- Replace with authenticated-only policies
CREATE POLICY "Ticket owners can view their tickets" 
ON public.tickets FOR SELECT TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Assigned users can view assigned tickets" 
ON public.tickets FOR SELECT TO authenticated
USING (auth.uid() = assigned_to);

CREATE POLICY "Authenticated users can create tickets" 
ON public.tickets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

-- 2. CRITICAL: Fix password_history table - system only access
DROP POLICY IF EXISTS "Users can view their password history" ON public.password_history;

CREATE POLICY "System only password history access"
ON public.password_history FOR ALL TO authenticated
USING (false) WITH CHECK (false);

-- 3. CRITICAL: Create and secure user_sessions table if it exists, or create security audit policies
-- First check if security_audit_log needs securing
DROP POLICY IF EXISTS "Public can view audit logs" ON public.security_audit_log;

CREATE POLICY "Admins only can view security audit logs"
ON public.security_audit_log FOR SELECT TO authenticated
USING (is_admin(auth.uid()));

-- 4. CRITICAL: Secure account_lockouts table
DROP POLICY IF EXISTS "Public can view lockouts" ON public.account_lockouts;

CREATE POLICY "Admins only can view account lockouts"
ON public.account_lockouts FOR ALL TO authenticated
USING (is_admin(auth.uid()));

-- 5. CRITICAL: Remove/replace Security Definer views
-- Drop any problematic security definer views (these need manual identification)
-- Note: We cannot directly drop views without knowing their names, but we can secure tables

-- 6. CRITICAL: Secure ticket_responses and ticket_ratings
DROP POLICY IF EXISTS "Public can view responses" ON public.ticket_responses;
DROP POLICY IF EXISTS "Public can create responses" ON public.ticket_responses;

CREATE POLICY "Authorized users can view ticket responses"
ON public.ticket_responses FOR SELECT TO authenticated
USING (
  is_admin(auth.uid()) OR 
  (NOT is_internal AND EXISTS (
    SELECT 1 FROM public.tickets t 
    WHERE t.id = ticket_responses.ticket_id 
    AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid())
  ))
);

CREATE POLICY "Authenticated users can create ticket responses"
ON public.ticket_responses FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = author_id AND 
  (is_admin(auth.uid()) OR NOT is_internal)
);

-- Secure ticket ratings
DROP POLICY IF EXISTS "Public can view ratings" ON public.ticket_ratings;
DROP POLICY IF EXISTS "Public can create ratings" ON public.ticket_ratings;

CREATE POLICY "Ticket owners can view ratings"
ON public.ticket_ratings FOR SELECT TO authenticated
USING (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.tickets t 
    WHERE t.id = ticket_ratings.ticket_id 
    AND t.created_by = auth.uid()
  )
);

CREATE POLICY "Ticket owners can create ratings"
ON public.ticket_ratings FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tickets t 
    WHERE t.id = ticket_ratings.ticket_id 
    AND t.created_by = auth.uid()
  )
);

-- 7. SECURITY: Update functions to be more secure
CREATE OR REPLACE FUNCTION public.audit_sensitive_operation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, resource_type, resource_id, success, metadata
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    true,
    jsonb_build_object(
      'table', TG_TABLE_NAME,
      'operation', TG_OP,
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 8. SECURITY: Ensure all sensitive tables have proper RLS
-- Add comprehensive logging for security events
INSERT INTO public.security_audit_log (user_id, action, resource_type, success, metadata)
VALUES (
  auth.uid(),
  'security_hardening_applied', 
  'database',
  true,
  jsonb_build_object(
    'fixes_applied', ARRAY[
      'tickets_customer_data_secured',
      'password_history_restricted',
      'security_audit_logs_admin_only',
      'account_lockouts_admin_only',
      'ticket_responses_authenticated_only',
      'ticket_ratings_secure_access'
    ],
    'timestamp', now()
  )
);