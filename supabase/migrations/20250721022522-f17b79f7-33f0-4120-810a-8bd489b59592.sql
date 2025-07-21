-- Fix remaining function search path security issues
-- This prevents SQL injection attacks by setting explicit search paths

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role, is_admin)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    CASE 
      WHEN NEW.email IN ('kevin@outpaged.com', 'carlos@outpaged.com') THEN 'super_admin'::public.team_role
      ELSE 'developer'::public.team_role
    END,
    CASE 
      WHEN NEW.email IN ('kevin@outpaged.com', 'carlos@outpaged.com') THEN TRUE
      ELSE FALSE
    END
  );
  RETURN NEW;
END;
$function$;

-- Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = $1 AND is_admin = TRUE
  );
END;
$function$;

-- Fix stop_running_timer_before_start function
CREATE OR REPLACE FUNCTION public.stop_running_timer_before_start()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.is_running = TRUE THEN
    -- Stop any currently running timers for this user
    UPDATE public.time_entries 
    SET is_running = FALSE, 
        ended_at = NOW(),
        updated_at = NOW()
    WHERE user_id = NEW.user_id 
    AND is_running = TRUE 
    AND id != COALESCE(NEW.id, gen_random_uuid());
  END IF;
  
  RETURN NEW;
END;
$function$;