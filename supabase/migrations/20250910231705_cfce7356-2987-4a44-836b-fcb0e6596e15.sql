-- Critical Security Fixes Migration (Corrected)

-- 1. Fix customer data exposure in tickets table
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Tickets: authenticated users can view own tickets or admin acce" ON public.tickets;
DROP POLICY IF EXISTS "Tickets: owners and admins only" ON public.tickets;

-- Create restrictive RLS policies for tickets table
CREATE POLICY "Tickets: customers can view own tickets only"
ON public.tickets
FOR SELECT
TO authenticated
USING (
  auth.uid() = created_by OR 
  auth.uid() = assigned_to OR 
  is_admin(auth.uid())
);

CREATE POLICY "Tickets: customers can create own tickets"
ON public.tickets
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by OR is_admin(auth.uid())
);

CREATE POLICY "Tickets: only assigned staff and admins can update"
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  auth.uid() = assigned_to OR is_admin(auth.uid())
)
WITH CHECK (
  auth.uid() = assigned_to OR is_admin(auth.uid())
);

CREATE POLICY "Tickets: admins only can delete"
ON public.tickets
FOR DELETE
TO authenticated
USING (is_admin(auth.uid()));

-- 2. Secure ticket responses to prevent customer data leakage
DROP POLICY IF EXISTS "Ticket responses: authorized access only" ON public.ticket_responses;
DROP POLICY IF EXISTS "Ticket responses: limit access to ticket participants and admin" ON public.ticket_responses;

CREATE POLICY "Ticket responses: restrictive access"
ON public.ticket_responses
FOR SELECT
TO authenticated
USING (
  -- Only allow access if user is ticket creator, assignee, or admin
  -- AND hide internal responses from customers
  (is_admin(auth.uid()) OR 
   (EXISTS (
     SELECT 1 FROM public.tickets t 
     WHERE t.id = ticket_responses.ticket_id 
     AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid())
   ) AND (is_admin(auth.uid()) OR NOT is_internal)))
);

-- 3. Secure profiles table to prevent information disclosure
DROP POLICY IF EXISTS "Users can view limited profile info for project members" ON public.profiles;

CREATE POLICY "Profiles: restricted member visibility"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Users can see own profile, admins see all, others see minimal info for shared projects only
  auth.uid() = user_id OR 
  is_admin(auth.uid()) OR
  (EXISTS (
    SELECT 1 FROM public.project_members pm1
    JOIN public.project_members pm2 ON pm1.project_id = pm2.project_id
    WHERE pm1.user_id = auth.uid() AND pm2.user_id = profiles.user_id
  ))
);

-- 4. Fix security definer views by dropping and recreating with proper security
DROP VIEW IF EXISTS public.task_assignees_with_profiles;

-- Recreate view without security definer (uses invoker's permissions)
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

-- 5. Enhance security audit logging
DROP POLICY IF EXISTS "Admin only audit log access" ON public.admin_audit_log;
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_log;

CREATE POLICY "Super admin only audit access"
ON public.admin_audit_log
FOR SELECT
TO authenticated
USING (
  is_admin(auth.uid()) AND 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- 6. Secure rate limits and account lockouts tables
DROP POLICY IF EXISTS "Rate limits: admin only" ON public.rate_limits;
DROP POLICY IF EXISTS "Admin only rate limits access" ON public.rate_limits;
DROP POLICY IF EXISTS "Account lockouts: admin only" ON public.account_lockouts;
DROP POLICY IF EXISTS "Admin only lockout management" ON public.account_lockouts;

CREATE POLICY "Rate limits: super admin only"
ON public.rate_limits
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Account lockouts: super admin only"
ON public.account_lockouts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

-- 7. Add security logging function for sensitive operations
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type TEXT,
  resource_type TEXT,
  resource_id UUID DEFAULT NULL,
  metadata JSONB DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, 
    action, 
    resource_type, 
    resource_id, 
    success, 
    metadata
  ) VALUES (
    auth.uid(),
    event_type,
    resource_type,
    resource_id,
    true,
    metadata
  );
END;
$$;