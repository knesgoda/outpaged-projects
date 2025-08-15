-- Create task relationships table for dependencies
CREATE TABLE public.task_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_task_id UUID NOT NULL,
  target_task_id UUID NOT NULL,
  relationship_type task_relationship_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  notes TEXT,
  UNIQUE(source_task_id, target_task_id, relationship_type)
);

-- Create custom enum for relationship types
CREATE TYPE task_relationship_type AS ENUM (
  'blocks',
  'depends_on',
  'relates_to',
  'duplicates',
  'parent_child'
);

-- Create project templates table
CREATE TABLE public.project_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL DEFAULT '{}',
  category TEXT NOT NULL DEFAULT 'general',
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  usage_count INTEGER NOT NULL DEFAULT 0
);

-- Create team workload tracking table
CREATE TABLE public.team_workload (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL,
  week_start_date DATE NOT NULL,
  allocated_hours INTEGER NOT NULL DEFAULT 40,
  logged_hours INTEGER NOT NULL DEFAULT 0,
  capacity_percentage DECIMAL(5,2) NOT NULL DEFAULT 100.00,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id, week_start_date)
);

-- Create project portfolio table
CREATE TABLE public.project_portfolios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create portfolio projects junction table
CREATE TABLE public.portfolio_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  portfolio_id UUID NOT NULL,
  project_id UUID NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  strategic_value TEXT,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(portfolio_id, project_id)
);

-- Add start_date and due_date to tasks if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'start_date') THEN
    ALTER TABLE public.tasks ADD COLUMN start_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'due_date') THEN
    ALTER TABLE public.tasks ADD COLUMN due_date DATE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'estimated_hours') THEN
    ALTER TABLE public.tasks ADD COLUMN estimated_hours DECIMAL(5,2);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.task_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_workload ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_relationships
CREATE POLICY "Users can view task relationships in their projects"
ON public.task_relationships FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    WHERE (t.id = task_relationships.source_task_id OR t.id = task_relationships.target_task_id)
    AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
  )
);

CREATE POLICY "Users can create task relationships in their projects"
ON public.task_relationships FOR INSERT
WITH CHECK (
  auth.uid() = created_by AND
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    WHERE t.id = task_relationships.source_task_id
    AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
  ) AND
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    WHERE t.id = task_relationships.target_task_id
    AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
  )
);

CREATE POLICY "Users can delete task relationships they created"
ON public.task_relationships FOR DELETE
USING (auth.uid() = created_by);

-- RLS Policies for project_templates
CREATE POLICY "Users can view public templates and their own"
ON public.project_templates FOR SELECT
USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create templates"
ON public.project_templates FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own templates"
ON public.project_templates FOR UPDATE
USING (auth.uid() = created_by);

-- RLS Policies for team_workload
CREATE POLICY "Users can view workload in their projects"
ON public.team_workload FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = team_workload.project_id
    AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
  )
);

CREATE POLICY "Project members can manage workload"
ON public.team_workload FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = team_workload.project_id
    AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
  )
);

-- RLS Policies for portfolios
CREATE POLICY "Users can view portfolios they own or are members of"
ON public.project_portfolios FOR SELECT
USING (auth.uid() = owner_id);

CREATE POLICY "Users can create portfolios"
ON public.project_portfolios FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Portfolio owners can manage their portfolios"
ON public.project_portfolios FOR ALL
USING (auth.uid() = owner_id);

-- RLS Policies for portfolio_projects
CREATE POLICY "Users can view portfolio projects they have access to"
ON public.portfolio_projects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.project_portfolios pf
    WHERE pf.id = portfolio_projects.portfolio_id
    AND pf.owner_id = auth.uid()
  )
);

CREATE POLICY "Portfolio owners can manage portfolio projects"
ON public.portfolio_projects FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.project_portfolios pf
    WHERE pf.id = portfolio_projects.portfolio_id
    AND pf.owner_id = auth.uid()
  )
);

-- Add updated_at triggers
CREATE TRIGGER update_project_templates_updated_at
BEFORE UPDATE ON public.project_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_workload_updated_at
BEFORE UPDATE ON public.team_workload
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_portfolios_updated_at
BEFORE UPDATE ON public.project_portfolios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to prevent circular dependencies
CREATE OR REPLACE FUNCTION public.prevent_circular_dependency()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check for circular dependencies with 'blocks' and 'depends_on' relationships
  IF NEW.relationship_type IN ('blocks', 'depends_on') THEN
    -- Check if adding this relationship would create a circular dependency
    IF EXISTS (
      WITH RECURSIVE dependency_chain AS (
        -- Start with the new relationship
        SELECT NEW.target_task_id as task_id, NEW.source_task_id as blocks_task_id, 1 as depth
        
        UNION ALL
        
        -- Follow the chain of dependencies
        SELECT tr.target_task_id, dc.blocks_task_id, dc.depth + 1
        FROM public.task_relationships tr
        JOIN dependency_chain dc ON tr.source_task_id = dc.task_id
        WHERE tr.relationship_type IN ('blocks', 'depends_on')
        AND dc.depth < 10 -- Prevent infinite recursion
      )
      SELECT 1 FROM dependency_chain 
      WHERE task_id = blocks_task_id -- Circular dependency detected
    ) THEN
      RAISE EXCEPTION 'Cannot create relationship: would create circular dependency';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add trigger to prevent circular dependencies
CREATE TRIGGER prevent_circular_dependency_trigger
BEFORE INSERT ON public.task_relationships
FOR EACH ROW
EXECUTE FUNCTION public.prevent_circular_dependency();

-- Create function to get task relationships
CREATE OR REPLACE FUNCTION public.get_task_relationships(task_id_param UUID)
RETURNS TABLE(
  id UUID,
  source_task_id UUID,
  target_task_id UUID,
  relationship_type task_relationship_type,
  created_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  notes TEXT,
  source_task_title TEXT,
  target_task_title TEXT,
  source_task_status task_status,
  target_task_status task_status
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tr.id,
    tr.source_task_id,
    tr.target_task_id,
    tr.relationship_type,
    tr.created_at,
    tr.created_by,
    tr.notes,
    st.title as source_task_title,
    tt.title as target_task_title,
    st.status as source_task_status,
    tt.status as target_task_status
  FROM public.task_relationships tr
  JOIN public.tasks st ON tr.source_task_id = st.id
  JOIN public.tasks tt ON tr.target_task_id = tt.id
  WHERE tr.source_task_id = task_id_param OR tr.target_task_id = task_id_param
  ORDER BY tr.created_at DESC;
END;
$$;