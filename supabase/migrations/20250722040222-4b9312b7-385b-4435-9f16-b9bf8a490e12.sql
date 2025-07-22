-- Create roadmap milestones table
CREATE TABLE public.roadmap_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'at_risk')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  start_date DATE,
  end_date DATE,
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  team_assigned TEXT,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.roadmap_milestones ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view milestones in their projects"
ON public.roadmap_milestones
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = roadmap_milestones.project_id 
    AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
  )
);

CREATE POLICY "Project owners can manage milestones"
ON public.roadmap_milestones
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = roadmap_milestones.project_id 
    AND p.owner_id = auth.uid()
  )
);

CREATE POLICY "Project members can manage milestones"
ON public.roadmap_milestones
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = roadmap_milestones.project_id 
    AND is_project_member(p.id, auth.uid())
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_roadmap_milestones_updated_at
BEFORE UPDATE ON public.roadmap_milestones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();