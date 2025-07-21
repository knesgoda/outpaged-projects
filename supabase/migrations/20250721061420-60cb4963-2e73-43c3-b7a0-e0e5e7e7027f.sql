
-- Add custom columns support
CREATE TABLE public.kanban_columns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  color TEXT DEFAULT '#6b7280',
  wip_limit INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_kanban_columns_project_id ON public.kanban_columns(project_id);
CREATE INDEX idx_kanban_columns_position ON public.kanban_columns(project_id, position);

-- Enable RLS
ALTER TABLE public.kanban_columns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kanban_columns
CREATE POLICY "Users can view columns in their projects" 
  ON public.kanban_columns 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = kanban_columns.project_id 
    AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
  ));

CREATE POLICY "Project owners can manage columns" 
  ON public.kanban_columns 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = kanban_columns.project_id 
    AND p.owner_id = auth.uid()
  ));

CREATE POLICY "Project members can manage columns" 
  ON public.kanban_columns 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = kanban_columns.project_id 
    AND is_project_member(p.id, auth.uid())
  ));

-- Add swimlanes support
CREATE TABLE public.swimlanes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  color TEXT DEFAULT '#6b7280',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for swimlanes
CREATE INDEX idx_swimlanes_project_id ON public.swimlanes(project_id);
CREATE INDEX idx_swimlanes_position ON public.swimlanes(project_id, position);

-- Enable RLS for swimlanes
ALTER TABLE public.swimlanes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for swimlanes
CREATE POLICY "Users can view swimlanes in their projects" 
  ON public.swimlanes 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = swimlanes.project_id 
    AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
  ));

CREATE POLICY "Project owners can manage swimlanes" 
  ON public.swimlanes 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = swimlanes.project_id 
    AND p.owner_id = auth.uid()
  ));

CREATE POLICY "Project members can manage swimlanes" 
  ON public.swimlanes 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = swimlanes.project_id 
    AND is_project_member(p.id, auth.uid())
  ));

-- Add swimlane_id to tasks table
ALTER TABLE public.tasks ADD COLUMN swimlane_id UUID;

-- Add custom status support by extending the existing status with custom mapping
CREATE TABLE public.task_status_mappings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  column_id UUID NOT NULL,
  status_value TEXT NOT NULL,
  display_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, column_id, status_value)
);

-- Add indexes for status mappings
CREATE INDEX idx_task_status_mappings_project_id ON public.task_status_mappings(project_id);
CREATE INDEX idx_task_status_mappings_column_id ON public.task_status_mappings(column_id);

-- Enable RLS for status mappings
ALTER TABLE public.task_status_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for status mappings
CREATE POLICY "Users can view status mappings in their projects" 
  ON public.task_status_mappings 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = task_status_mappings.project_id 
    AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
  ));

CREATE POLICY "Project owners can manage status mappings" 
  ON public.task_status_mappings 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = task_status_mappings.project_id 
    AND p.owner_id = auth.uid()
  ));

CREATE POLICY "Project members can manage status mappings" 
  ON public.task_status_mappings 
  FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = task_status_mappings.project_id 
    AND is_project_member(p.id, auth.uid())
  ));

-- Add trigger to update updated_at
CREATE TRIGGER update_kanban_columns_updated_at 
  BEFORE UPDATE ON public.kanban_columns 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_swimlanes_updated_at 
  BEFORE UPDATE ON public.swimlanes 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default columns for existing projects
INSERT INTO public.kanban_columns (project_id, name, position, is_default)
SELECT 
  p.id as project_id,
  column_name,
  column_position,
  true as is_default
FROM projects p
CROSS JOIN (
  VALUES 
    ('To Do', 1),
    ('In Progress', 2),
    ('Review', 3),
    ('Done', 4)
) AS default_columns(column_name, column_position);

-- Insert default swimlane for existing projects
INSERT INTO public.swimlanes (project_id, name, position, is_default)
SELECT 
  p.id as project_id,
  'Default' as name,
  1 as position,
  true as is_default
FROM projects p;

-- Update existing tasks to use default swimlane
UPDATE public.tasks 
SET swimlane_id = (
  SELECT s.id 
  FROM swimlanes s 
  WHERE s.project_id = tasks.project_id 
  AND s.is_default = true 
  LIMIT 1
);
