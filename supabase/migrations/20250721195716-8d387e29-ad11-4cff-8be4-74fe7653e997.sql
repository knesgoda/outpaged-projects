
-- Create team invitations table for managing invites
CREATE TABLE public.team_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  role team_role NOT NULL DEFAULT 'developer',
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on team_invitations
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies for team_invitations
CREATE POLICY "Users can view invitations they sent" 
  ON public.team_invitations 
  FOR SELECT 
  USING (auth.uid() = invited_by);

CREATE POLICY "Users can create invitations" 
  ON public.team_invitations 
  FOR INSERT 
  WITH CHECK (auth.uid() = invited_by);

CREATE POLICY "Users can update invitations they sent" 
  ON public.team_invitations 
  FOR UPDATE 
  USING (auth.uid() = invited_by);

CREATE POLICY "Admins can manage all invitations" 
  ON public.team_invitations 
  FOR ALL 
  USING (is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_team_invitations_updated_at
  BEFORE UPDATE ON public.team_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_team_invitations_email ON public.team_invitations(email);
CREATE INDEX idx_team_invitations_invited_by ON public.team_invitations(invited_by);
CREATE INDEX idx_team_invitations_project_id ON public.team_invitations(project_id);

-- Create function to check if user can delete default project
CREATE OR REPLACE FUNCTION public.can_delete_default_project(project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only admins can delete the default "My First Project"
  RETURN is_admin(auth.uid()) AND EXISTS (
    SELECT 1 FROM public.projects 
    WHERE id = project_id 
    AND name = 'My First Project'
  );
END;
$$;

-- Update projects table to allow deletion of default project by admins
CREATE POLICY "Admins can delete default project" 
  ON public.projects 
  FOR DELETE 
  USING (can_delete_default_project(id));

-- Add function to get team member statistics
CREATE OR REPLACE FUNCTION public.get_team_member_stats(member_user_id UUID)
RETURNS TABLE(
  projects_count INTEGER,
  tasks_completed INTEGER,
  total_time_minutes INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((
      SELECT COUNT(DISTINCT pm.project_id)::INTEGER 
      FROM public.project_members pm 
      WHERE pm.user_id = member_user_id
    ), 0) as projects_count,
    COALESCE((
      SELECT COUNT(*)::INTEGER 
      FROM public.tasks t 
      WHERE t.assignee_id = member_user_id 
      AND t.status = 'done'
    ), 0) as tasks_completed,
    COALESCE((
      SELECT SUM(te.duration_minutes)::INTEGER 
      FROM public.time_entries te 
      WHERE te.user_id = member_user_id
    ), 0) as total_time_minutes;
END;
$$;

-- Create function to validate task hierarchy for Kanban display
CREATE OR REPLACE FUNCTION public.should_show_in_kanban(task_hierarchy task_hierarchy_level)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT task_hierarchy IN ('story', 'task', 'subtask');
$$;

-- Add constraint to ensure only appropriate tasks appear in Kanban
ALTER TABLE public.tasks 
ADD CONSTRAINT check_kanban_hierarchy 
CHECK (
  hierarchy_level IN ('initiative', 'epic') OR 
  should_show_in_kanban(hierarchy_level)
);
