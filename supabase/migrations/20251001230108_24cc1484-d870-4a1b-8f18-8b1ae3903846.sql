-- Phase 0: Foundation - Part 4: Custom Fields System (Fixed)
-- Custom field definitions table
CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_type custom_field_type NOT NULL,
  description TEXT,
  options JSONB DEFAULT '[]'::jsonb,
  formula TEXT,
  rollup_config JSONB,
  validation_rules JSONB DEFAULT '{}'::jsonb,
  is_required BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false,
  applies_to TEXT[] DEFAULT ARRAY['task'],
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT custom_field_name_length CHECK (char_length(name) >= 1 AND char_length(name) <= 100)
);

-- Custom field values table
CREATE TABLE IF NOT EXISTS public.item_custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  field_definition_id UUID NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(item_id, field_definition_id)
);

-- Enhanced task_relationships table with all relationship types
ALTER TABLE public.task_relationships
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_project ON public.custom_field_definitions(project_id);
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_workspace ON public.custom_field_definitions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_item_custom_field_values_item ON public.item_custom_field_values(item_id);
CREATE INDEX IF NOT EXISTS idx_item_custom_field_values_field ON public.item_custom_field_values(field_definition_id);

-- Enable RLS
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_custom_field_values ENABLE ROW LEVEL SECURITY;

-- RLS Policies for custom_field_definitions
CREATE POLICY "Users can view custom fields in accessible projects"
ON public.custom_field_definitions FOR SELECT
USING (
  (project_id IS NULL AND workspace_id IS NULL) OR
  (project_id IS NOT NULL AND is_project_member(project_id, auth.uid())) OR
  (workspace_id IS NOT NULL AND auth.uid() IS NOT NULL)
);

CREATE POLICY "Project leads can manage project custom fields"
ON public.custom_field_definitions FOR ALL
USING (
  project_id IS NOT NULL AND 
  (check_user_role(auth.uid(), 'org_admin') OR 
   check_user_role(auth.uid(), 'project_lead') OR
   is_project_member(project_id, auth.uid()))
);

CREATE POLICY "Org admins can manage workspace custom fields"
ON public.custom_field_definitions FOR ALL
USING (
  workspace_id IS NOT NULL AND 
  check_user_role(auth.uid(), 'org_admin')
);

-- RLS Policies for item_custom_field_values
CREATE POLICY "Users can view custom field values in accessible items"
ON public.item_custom_field_values FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = item_custom_field_values.item_id
    AND is_project_member(t.project_id, auth.uid())
  )
);

CREATE POLICY "Project members can manage custom field values"
ON public.item_custom_field_values FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = item_custom_field_values.item_id
    AND is_project_member(t.project_id, auth.uid())
  )
);

-- Update triggers
CREATE TRIGGER update_custom_field_definitions_updated_at
BEFORE UPDATE ON public.custom_field_definitions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_item_custom_field_values_updated_at
BEFORE UPDATE ON public.item_custom_field_values
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();