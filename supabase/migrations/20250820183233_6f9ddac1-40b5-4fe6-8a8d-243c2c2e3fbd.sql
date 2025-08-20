-- CRITICAL SECURITY FIXES - Part 1: Fix profiles table public exposure

-- 1. FIX CRITICAL: Remove public access to profiles table with admin status
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create secure profile viewing policies that don't expose admin status publicly
CREATE POLICY "Authenticated users can view basic profile info" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (true);

-- 2. ENHANCE: Add audit logging for sensitive operations
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
DROP TRIGGER IF EXISTS audit_profiles_changes ON public.profiles;
CREATE TRIGGER audit_profiles_changes 
  AFTER UPDATE OR DELETE ON public.profiles 
  FOR EACH ROW EXECUTE FUNCTION public.audit_sensitive_operation();

DROP TRIGGER IF EXISTS audit_admin_changes ON public.profiles;
CREATE TRIGGER audit_admin_changes 
  AFTER UPDATE ON public.profiles 
  FOR EACH ROW 
  WHEN (OLD.is_admin IS DISTINCT FROM NEW.is_admin)
  EXECUTE FUNCTION public.audit_sensitive_operation();