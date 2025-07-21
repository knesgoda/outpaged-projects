-- Fix all infinite recursion issues in projects RLS policies
-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view projects they are members of" ON public.projects;
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;
DROP POLICY IF EXISTS "Admins can manage all projects" ON public.projects;
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
DROP POLICY IF EXISTS "Project owners can update their projects" ON public.projects;
DROP POLICY IF EXISTS "Project owners can delete their projects" ON public.projects;

-- Create a security definer function to check project membership
CREATE OR REPLACE FUNCTION public.is_project_member(project_id uuid, user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.project_members pm 
    WHERE pm.project_id = $1 AND pm.user_id = $2
  );
END;
$$;

-- Create simplified policies
CREATE POLICY "Users can view their own projects" 
ON public.projects 
FOR SELECT 
USING (auth.uid() = owner_id);

CREATE POLICY "Users can view projects they are members of" 
ON public.projects 
FOR SELECT 
USING (public.is_project_member(id, auth.uid()));

CREATE POLICY "Admins can view all projects" 
ON public.projects 
FOR SELECT 
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can create projects" 
ON public.projects 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Project owners can update their projects" 
ON public.projects 
FOR UPDATE 
USING (auth.uid() = owner_id);

CREATE POLICY "Project owners can delete their projects" 
ON public.projects 
FOR DELETE 
USING (auth.uid() = owner_id);

CREATE POLICY "Admins can manage all projects" 
ON public.projects 
FOR ALL 
USING (public.is_admin(auth.uid()));