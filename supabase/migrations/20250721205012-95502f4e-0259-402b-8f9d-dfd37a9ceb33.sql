-- Create task_assignees table for many-to-many relationship
CREATE TABLE public.task_assignees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

-- Create policies for task_assignees
CREATE POLICY "Users can view assignees for tasks in their projects" 
ON public.task_assignees 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM tasks t 
  JOIN projects p ON t.project_id = p.id 
  WHERE t.id = task_assignees.task_id 
  AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
));

CREATE POLICY "Users can assign people to tasks in their projects" 
ON public.task_assignees 
FOR INSERT 
WITH CHECK (
  auth.uid() = assigned_by 
  AND EXISTS (
    SELECT 1 FROM tasks t 
    JOIN projects p ON t.project_id = p.id 
    WHERE t.id = task_assignees.task_id 
    AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
  )
);

CREATE POLICY "Users can remove assignees from tasks in their projects" 
ON public.task_assignees 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM tasks t 
  JOIN projects p ON t.project_id = p.id 
  WHERE t.id = task_assignees.task_id 
  AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
));

CREATE POLICY "Admins can manage all task assignees" 
ON public.task_assignees 
FOR ALL 
USING (is_admin(auth.uid()));

-- Create a view to easily get task assignees with profile info
CREATE OR REPLACE VIEW public.task_assignees_with_profiles AS
SELECT 
  ta.id,
  ta.task_id,
  ta.user_id,
  ta.assigned_at,
  ta.assigned_by,
  p.full_name,
  p.avatar_url
FROM public.task_assignees ta
JOIN public.profiles p ON ta.user_id = p.user_id;

-- Create function to migrate existing assignees
CREATE OR REPLACE FUNCTION public.migrate_existing_assignees()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert existing assignees into the new table
  INSERT INTO public.task_assignees (task_id, user_id, assigned_by)
  SELECT 
    id as task_id,
    assignee_id as user_id,
    reporter_id as assigned_by
  FROM public.tasks 
  WHERE assignee_id IS NOT NULL
  ON CONFLICT (task_id, user_id) DO NOTHING;
END;
$$;

-- Run the migration
SELECT public.migrate_existing_assignees();

-- Create index for better performance
CREATE INDEX idx_task_assignees_task_id ON public.task_assignees(task_id);
CREATE INDEX idx_task_assignees_user_id ON public.task_assignees(user_id);