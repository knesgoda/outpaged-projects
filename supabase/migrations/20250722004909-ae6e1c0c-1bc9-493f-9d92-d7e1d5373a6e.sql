-- Security Fix 1: Prevent privilege escalation in profiles table
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create secure policies that prevent is_admin modification
CREATE POLICY "Users can update their own profile (non-admin fields)" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND
  -- Prevent users from modifying is_admin field
  is_admin = (SELECT is_admin FROM public.profiles WHERE user_id = auth.uid())
);

CREATE POLICY "Users can insert their own profile (non-admin fields)" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  -- Ensure is_admin is false for user-created profiles
  is_admin = false
);

-- Security Fix 2: Create admin-only policy for is_admin updates
CREATE POLICY "Only admins can modify admin status" 
ON public.profiles 
FOR UPDATE 
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Security Fix 3: Secure the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only allow specific verified emails to become admins
  -- Use a more secure whitelist approach
  INSERT INTO public.profiles (user_id, full_name, role, is_admin)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    CASE 
      WHEN NEW.email = ANY(ARRAY['kevin@outpaged.com', 'carlos@outpaged.com']) 
      THEN 'super_admin'::public.team_role
      ELSE 'developer'::public.team_role
    END,
    CASE 
      WHEN NEW.email = ANY(ARRAY['kevin@outpaged.com', 'carlos@outpaged.com']) 
      THEN TRUE
      ELSE FALSE
    END
  );
  RETURN NEW;
END;
$$;

-- Security Fix 4: Add audit logging for admin actions
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  target_user_id UUID,
  target_table TEXT,
  target_record_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.admin_audit_log 
FOR SELECT 
USING (is_admin(auth.uid()));

-- Security Fix 5: Create secure admin verification function
CREATE OR REPLACE FUNCTION public.verify_admin_action(action_type TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log the admin action attempt
  INSERT INTO public.admin_audit_log (admin_user_id, action)
  VALUES (auth.uid(), action_type);
  
  -- Verify admin status
  RETURN is_admin(auth.uid());
END;
$$;