-- Fix infinite recursion issues in tasks and project_members RLS policies
-- Drop problematic policies for project_members
DROP POLICY IF EXISTS "Users can view project members for projects they are members of" ON public.project_members;
DROP POLICY IF EXISTS "Project owners can manage project members" ON public.project_members;
DROP POLICY IF EXISTS "Admins can view all project members" ON public.project_members;
DROP POLICY IF EXISTS "Admins can manage all project members" ON public.project_members;

-- Create simplified project_members policies
CREATE POLICY "Users can view project members for their projects" 
ON public.project_members 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_members.project_id 
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own project memberships" 
ON public.project_members 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Project owners can manage project members" 
ON public.project_members 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_members.project_id 
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all project members" 
ON public.project_members 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Fix tasks policies if they have recursion issues
DROP POLICY IF EXISTS "Users can view tasks for projects they are members of" ON public.tasks;
DROP POLICY IF EXISTS "Project members can manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can view all tasks" ON public.tasks;
DROP POLICY IF EXISTS "Admins can manage all tasks" ON public.tasks;

-- Create simplified tasks policies
CREATE POLICY "Users can view tasks in their projects" 
ON public.tasks 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = tasks.project_id 
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Users can view tasks in projects they are members of" 
ON public.tasks 
FOR SELECT 
USING (
  public.is_project_member(project_id, auth.uid())
);

CREATE POLICY "Project owners can manage tasks" 
ON public.tasks 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = tasks.project_id 
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Project members can manage tasks" 
ON public.tasks 
FOR ALL 
USING (
  public.is_project_member(project_id, auth.uid())
);

CREATE POLICY "Admins can manage all tasks" 
ON public.tasks 
FOR ALL 
USING (public.is_admin(auth.uid()));