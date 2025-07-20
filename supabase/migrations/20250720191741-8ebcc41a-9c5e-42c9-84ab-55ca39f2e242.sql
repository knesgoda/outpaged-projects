-- Add admin role type and update profiles table
ALTER TYPE public.team_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Add is_admin column to profiles for quick admin checks
ALTER TABLE public.profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;

-- Update the profile creation function to handle admin assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if user is admin (for RLS policies)
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = $1 AND is_admin = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Add admin policies for projects (admins can see all projects)
CREATE POLICY "Admins can view all projects" 
ON public.projects FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all projects" 
ON public.projects FOR ALL 
USING (public.is_admin(auth.uid()));

-- Add admin policies for tasks (admins can see all tasks)
CREATE POLICY "Admins can view all tasks" 
ON public.tasks FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all tasks" 
ON public.tasks FOR ALL 
USING (public.is_admin(auth.uid()));

-- Add admin policies for sprints (admins can see all sprints)
CREATE POLICY "Admins can view all sprints" 
ON public.sprints FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all sprints" 
ON public.sprints FOR ALL 
USING (public.is_admin(auth.uid()));

-- Add admin policies for project members (admins can see all project members)
CREATE POLICY "Admins can view all project members" 
ON public.project_members FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all project members" 
ON public.project_members FOR ALL 
USING (public.is_admin(auth.uid()));

-- Add admin policies for comments (admins can see all comments)
CREATE POLICY "Admins can view all comments" 
ON public.comments FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage all comments" 
ON public.comments FOR ALL 
USING (public.is_admin(auth.uid()));