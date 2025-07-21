-- Fix infinite recursion issues in comments, time_entries, and sprints RLS policies

-- Fix comments policies
DROP POLICY IF EXISTS "Users can view comments for tasks they can access" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments on accessible tasks" ON public.comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
DROP POLICY IF EXISTS "Admins can view all comments" ON public.comments;
DROP POLICY IF EXISTS "Admins can manage all comments" ON public.comments;

-- Create simplified comments policies
CREATE POLICY "Users can view comments in their projects" 
ON public.comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    WHERE t.id = comments.task_id 
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Project members can view comments" 
ON public.comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = comments.task_id 
    AND public.is_project_member(t.project_id, auth.uid())
  )
);

CREATE POLICY "Users can create comments on their project tasks" 
ON public.comments 
FOR INSERT 
WITH CHECK (
  auth.uid() = author_id AND
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    WHERE t.id = comments.task_id 
    AND (p.owner_id = auth.uid() OR public.is_project_member(t.project_id, auth.uid()))
  )
);

CREATE POLICY "Users can update their own comments" 
ON public.comments 
FOR UPDATE 
USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own comments" 
ON public.comments 
FOR DELETE 
USING (auth.uid() = author_id);

CREATE POLICY "Admins can manage all comments" 
ON public.comments 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Fix time_entries policies
DROP POLICY IF EXISTS "Users can view time entries for tasks they can access" ON public.time_entries;
DROP POLICY IF EXISTS "Users can create time entries for accessible tasks" ON public.time_entries;
DROP POLICY IF EXISTS "Users can update their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Users can delete their own time entries" ON public.time_entries;
DROP POLICY IF EXISTS "Admins can manage all time entries" ON public.time_entries;

-- Create simplified time_entries policies
CREATE POLICY "Users can view time entries in their projects" 
ON public.time_entries 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    WHERE t.id = time_entries.task_id 
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Project members can view time entries" 
ON public.time_entries 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = time_entries.task_id 
    AND public.is_project_member(t.project_id, auth.uid())
  )
);

CREATE POLICY "Users can create time entries for their project tasks" 
ON public.time_entries 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    WHERE t.id = time_entries.task_id 
    AND (p.owner_id = auth.uid() OR public.is_project_member(t.project_id, auth.uid()))
  )
);

CREATE POLICY "Users can update their own time entries" 
ON public.time_entries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time entries" 
ON public.time_entries 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all time entries" 
ON public.time_entries 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Fix sprints policies
DROP POLICY IF EXISTS "Users can view sprints for projects they are members of" ON public.sprints;
DROP POLICY IF EXISTS "Project members can manage sprints" ON public.sprints;
DROP POLICY IF EXISTS "Admins can view all sprints" ON public.sprints;
DROP POLICY IF EXISTS "Admins can manage all sprints" ON public.sprints;

-- Create simplified sprints policies
CREATE POLICY "Users can view sprints in their projects" 
ON public.sprints 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = sprints.project_id 
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Project members can view sprints" 
ON public.sprints 
FOR SELECT 
USING (
  public.is_project_member(project_id, auth.uid())
);

CREATE POLICY "Project owners can manage sprints" 
ON public.sprints 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = sprints.project_id 
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Project members can manage sprints" 
ON public.sprints 
FOR ALL 
USING (
  public.is_project_member(project_id, auth.uid())
);

CREATE POLICY "Admins can manage all sprints" 
ON public.sprints 
FOR ALL 
USING (public.is_admin(auth.uid()));