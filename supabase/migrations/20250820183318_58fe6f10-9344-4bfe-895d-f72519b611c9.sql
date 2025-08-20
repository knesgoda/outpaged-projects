-- CRITICAL SECURITY FIXES - Part 2: Fix tickets and remaining vulnerabilities

-- 1. FIX CRITICAL: Secure tickets table - remove public access and fix existing policies
DROP POLICY IF EXISTS "Anyone can create tickets" ON public.tickets;
DROP POLICY IF EXISTS "Customers can view their own tickets" ON public.tickets;

-- Replace with secure authenticated-only ticket policies
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

CREATE POLICY "Assigned users can view assigned tickets" 
ON public.tickets 
FOR SELECT 
TO authenticated
USING (auth.uid() = assigned_to);

-- 2. FIX CRITICAL: Secure ticket responses - no more public access
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

-- 3. FIX CRITICAL: Secure ticket ratings - require authentication
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

-- 4. ENHANCE: Add additional security to password history
CREATE POLICY "Only system can insert password history" 
ON public.password_history 
FOR INSERT 
WITH CHECK (false); -- Only triggers and system functions can insert

-- 5. FIX: Update functions to have immutable search path
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