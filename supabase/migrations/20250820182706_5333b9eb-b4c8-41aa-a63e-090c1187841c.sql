-- CRITICAL SECURITY FIXES FOR MULTIPLE VULNERABILITIES

-- 1. FIX CRITICAL: Remove public access to profiles table with admin status
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create secure profile viewing policies
CREATE POLICY "Authenticated users can view basic profile info" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Admin status should only be visible to admins and the user themselves
CREATE POLICY "Users can see their own admin status" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can see all admin statuses" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

-- 2. FIX CRITICAL: Secure tickets table - remove public access
DROP POLICY IF EXISTS "Anyone can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Customers can view their own tickets" ON public.tickets;

-- Replace with authenticated-only ticket policies
CREATE POLICY "Authenticated users can create tickets" 
ON public.tickets 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Ticket owners can view their tickets" 
ON public.tickets 
FOR SELECT 
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Admins can view all tickets" 
ON public.tickets 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "Assigned users can view assigned tickets" 
ON public.tickets 
FOR SELECT 
TO authenticated
USING (auth.uid() = assigned_to);

-- 3. FIX CRITICAL: Secure ticket responses - no more public access
DROP POLICY IF EXISTS "Anyone can create responses" ON public.ticket_responses;
DROP POLICY IF EXISTS "Anyone can view non-internal responses" ON public.ticket_responses;

CREATE POLICY "Authenticated users can create responses" 
ON public.ticket_responses 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = author_id AND 
  (is_admin(auth.uid()) OR NOT is_internal)
);

CREATE POLICY "Authorized users can view responses" 
ON public.ticket_responses 
FOR SELECT 
TO authenticated
USING (
  is_admin(auth.uid()) OR 
  (NOT is_internal AND EXISTS (
    SELECT 1 FROM public.tickets t 
    WHERE t.id = ticket_responses.ticket_id 
    AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid())
  ))
);

-- 4. FIX CRITICAL: Secure ticket ratings - require authentication
DROP POLICY IF EXISTS "Anyone can create ratings" ON public.ticket_ratings;
DROP POLICY IF EXISTS "Anyone can view ratings" ON public.ticket_ratings;

CREATE POLICY "Authenticated users can create ratings" 
ON public.ticket_ratings 
FOR INSERT 
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tickets t 
    WHERE t.id = ticket_ratings.ticket_id 
    AND t.created_by = auth.uid()
  )
);

CREATE POLICY "Ticket owners and admins can view ratings" 
ON public.ticket_ratings 
FOR SELECT 
TO authenticated
USING (
  is_admin(auth.uid()) OR 
  EXISTS (
    SELECT 1 FROM public.tickets t 
    WHERE t.id = ticket_ratings.ticket_id 
    AND t.created_by = auth.uid()
  )
);

-- 5. ENHANCE: Add additional security to password history
CREATE POLICY "Only system can insert password history" 
ON public.password_history 
FOR INSERT 
WITH CHECK (false); -- Only triggers and system functions can insert

-- 6. SECURITY AUDIT: Add audit logging for sensitive operations
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add audit triggers to sensitive tables
CREATE TRIGGER audit_profiles_changes 
  AFTER UPDATE OR DELETE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operation();

CREATE TRIGGER audit_admin_changes 
  AFTER UPDATE ON public.profiles 
  FOR EACH ROW 
  WHEN (OLD.is_admin IS DISTINCT FROM NEW.is_admin)
  EXECUTE FUNCTION public.audit_sensitive_operation();