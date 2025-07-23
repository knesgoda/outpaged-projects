-- Phase 2: Database Security Hardening

-- 1. Add proper audit logging table
CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view security audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Only system can insert audit logs (no user access)
CREATE POLICY "System can insert security audit logs" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (false); -- No users can insert directly

-- 2. Add account lockout table for failed login attempts
CREATE TABLE IF NOT EXISTS public.account_lockouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  failed_attempts INTEGER NOT NULL DEFAULT 1,
  locked_until TIMESTAMP WITH TIME ZONE,
  last_attempt TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(email)
);

-- Enable RLS on account lockouts
ALTER TABLE public.account_lockouts ENABLE ROW LEVEL SECURITY;

-- Only admins can view account lockouts
CREATE POLICY "Admins can manage account lockouts" 
ON public.account_lockouts 
FOR ALL 
USING (is_admin(auth.uid()));

-- 3. Add password history table to prevent reuse
CREATE TABLE IF NOT EXISTS public.password_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on password history
ALTER TABLE public.password_history ENABLE ROW LEVEL SECURITY;

-- Only the user can view their password history
CREATE POLICY "Users can view their password history" 
ON public.password_history 
FOR SELECT 
USING (auth.uid() = user_id);

-- 4. Add session management table
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_activity TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sessions
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only view their own sessions
CREATE POLICY "Users can view their own sessions" 
ON public.user_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own sessions (for logout)
CREATE POLICY "Users can update their own sessions" 
ON public.user_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- 5. Create security function for safe email domain admin check
CREATE OR REPLACE FUNCTION public.is_verified_admin_email(email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  allowed_domains TEXT[] := ARRAY['outpaged.com', 'company.com']; -- Add your verified domains
  email_domain TEXT;
BEGIN
  -- Extract domain from email
  email_domain := lower(split_part(email, '@', 2));
  
  -- Check if domain is in allowed list and email is verified
  RETURN email_domain = ANY(allowed_domains);
END;
$$;

-- 6. Update the handle_new_user function to be more secure
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_full_name TEXT;
  user_role public.team_role;
  is_admin BOOLEAN;
BEGIN
  -- Sanitize and validate the full name
  user_full_name := COALESCE(
    trim(NEW.raw_user_meta_data->>'full_name'),
    split_part(NEW.email, '@', 1)
  );
  
  -- Limit full name length for security
  IF length(user_full_name) > 100 THEN
    user_full_name := left(user_full_name, 100);
  END IF;
  
  -- Only allow admin for verified email domains and confirmed emails
  is_admin := is_verified_admin_email(NEW.email) AND NEW.email_confirmed_at IS NOT NULL;
  
  -- Set role based on admin status
  user_role := CASE 
    WHEN is_admin THEN 'super_admin'::public.team_role
    ELSE 'developer'::public.team_role
  END;

  -- Insert user profile
  INSERT INTO public.profiles (user_id, full_name, role, is_admin)
  VALUES (NEW.id, user_full_name, user_role, is_admin);
  
  -- Log the account creation
  INSERT INTO public.security_audit_log (
    user_id, action, resource_type, success, metadata
  ) VALUES (
    NEW.id,
    'user_account_created',
    'profile',
    true,
    jsonb_build_object(
      'email', NEW.email,
      'is_admin', is_admin,
      'role', user_role
    )
  );
  
  RETURN NEW;
END;
$$;

-- 7. Create function to audit admin privilege changes
CREATE OR REPLACE FUNCTION public.audit_admin_privilege_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only log if admin status actually changed
  IF TG_OP = 'UPDATE' AND OLD.is_admin != NEW.is_admin THEN
    INSERT INTO public.security_audit_log (
      user_id, action, resource_type, resource_id, success, metadata
    ) VALUES (
      auth.uid(),
      'admin_privilege_change',
      'profile',
      NEW.user_id,
      true,
      jsonb_build_object(
        'target_user_id', NEW.user_id,
        'old_admin_status', OLD.is_admin,
        'new_admin_status', NEW.is_admin,
        'changed_by', auth.uid()
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for admin privilege changes
DROP TRIGGER IF EXISTS audit_admin_changes ON public.profiles;
CREATE TRIGGER audit_admin_changes
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION audit_admin_privilege_change();

-- 8. Add rate limiting for critical operations
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address or user ID
  action_type TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(identifier, action_type)
);

-- Enable RLS on rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only admins can view rate limits
CREATE POLICY "Admins can view rate limits" 
ON public.rate_limits 
FOR SELECT 
USING (is_admin(auth.uid()));

-- 9. Update existing functions to have secure search paths
-- This ensures all our functions use the correct search path

-- Update is_admin function to log access attempts
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result BOOLEAN;
BEGIN
  -- Check admin status
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = $1 AND is_admin = TRUE
  ) INTO result;
  
  -- Log admin check for monitoring
  INSERT INTO public.security_audit_log (
    user_id, action, resource_type, success, metadata
  ) VALUES (
    auth.uid(),
    'admin_status_check',
    'profile',
    true,
    jsonb_build_object('checked_user_id', $1, 'result', result)
  );
  
  RETURN result;
END;
$$;