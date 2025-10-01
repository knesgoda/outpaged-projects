-- Phase 1: Core Workflow Engine Foundation

-- Workflow Templates Table
CREATE TABLE IF NOT EXISTS public.workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'design', 'software', 'marketing', 'operations', 'custom'
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Workflow States Table
CREATE TABLE IF NOT EXISTS public.workflow_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_template_id UUID REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  state_category TEXT NOT NULL, -- 'draft', 'todo', 'in_progress', 'in_review', 'on_hold', 'done'
  position INTEGER NOT NULL,
  color TEXT DEFAULT '#6b7280',
  required_fields JSONB DEFAULT '[]'::jsonb, -- Array of field names that must be filled
  requires_approval BOOLEAN DEFAULT false,
  approval_roles JSONB DEFAULT '[]'::jsonb, -- Array of roles that can approve
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Workflow Transitions Table
CREATE TABLE IF NOT EXISTS public.workflow_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_template_id UUID REFERENCES public.workflow_templates(id) ON DELETE CASCADE,
  from_state_id UUID REFERENCES public.workflow_states(id) ON DELETE CASCADE,
  to_state_id UUID REFERENCES public.workflow_states(id) ON DELETE CASCADE,
  conditions JSONB DEFAULT '{}'::jsonb, -- Validation conditions
  post_actions JSONB DEFAULT '[]'::jsonb, -- Actions to execute after transition
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Project Workflows (instances of templates)
CREATE TABLE IF NOT EXISTS public.project_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  workflow_template_id UUID REFERENCES public.workflow_templates(id),
  item_type TEXT NOT NULL, -- 'task', 'story', 'bug', etc.
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, item_type)
);

-- Handoffs Table
CREATE TABLE IF NOT EXISTS public.handoffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_item_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  target_item_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  from_team TEXT NOT NULL,
  to_team TEXT NOT NULL,
  handoff_type TEXT NOT NULL, -- 'design_to_software', 'design_to_marketing', etc.
  exit_criteria JSONB DEFAULT '{}'::jsonb,
  acceptance_checklist JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  context_data JSONB DEFAULT '{}'::jsonb, -- Preserved context from source
  created_by UUID REFERENCES auth.users(id),
  accepted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enhanced Custom Fields (extending existing)
CREATE TABLE IF NOT EXISTS public.project_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_type TEXT NOT NULL, -- 'text', 'number', 'select', 'multi_select', 'user', 'team', 'date', 'date_range', 'time_estimate', 'story_points', 'file', 'url', 'formula', 'rollup'
  options JSONB DEFAULT '[]'::jsonb, -- For select/multi-select
  formula TEXT, -- For formula fields
  rollup_config JSONB, -- For rollup fields
  is_required BOOLEAN DEFAULT false,
  is_private BOOLEAN DEFAULT false, -- For leadership/HR notes
  applies_to TEXT[] DEFAULT ARRAY['task'], -- Which item types this applies to
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- SLA Definitions
CREATE TABLE IF NOT EXISTS public.sla_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  priority TEXT NOT NULL, -- 'critical', 'high', 'medium', 'low'
  response_time_minutes INTEGER NOT NULL,
  resolution_time_minutes INTEGER NOT NULL,
  business_hours_only BOOLEAN DEFAULT true,
  pause_states TEXT[] DEFAULT ARRAY[]::TEXT[], -- States where SLA timer pauses
  escalation_rules JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- SLA Tracking
CREATE TABLE IF NOT EXISTS public.sla_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  sla_definition_id UUID REFERENCES public.sla_definitions(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  paused_at TIMESTAMP WITH TIME ZONE,
  resumed_at TIMESTAMP WITH TIME ZONE,
  breached_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  time_paused_minutes INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active', -- 'active', 'paused', 'breached', 'resolved'
  escalation_level INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.workflow_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Workflow Templates
CREATE POLICY "Anyone can view active workflow templates"
  ON public.workflow_templates FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage workflow templates"
  ON public.workflow_templates FOR ALL
  USING (is_admin(auth.uid()));

-- RLS Policies for Workflow States
CREATE POLICY "Anyone can view workflow states"
  ON public.workflow_states FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage workflow states"
  ON public.workflow_states FOR ALL
  USING (is_admin(auth.uid()));

-- RLS Policies for Workflow Transitions
CREATE POLICY "Anyone can view workflow transitions"
  ON public.workflow_transitions FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage workflow transitions"
  ON public.workflow_transitions FOR ALL
  USING (is_admin(auth.uid()));

-- RLS Policies for Project Workflows
CREATE POLICY "Project members can view workflows"
  ON public.project_workflows FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Project owners can manage workflows"
  ON public.project_workflows FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_workflows.project_id
    AND p.owner_id = auth.uid()
  ));

-- RLS Policies for Handoffs
CREATE POLICY "Project members can view handoffs"
  ON public.handoffs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    WHERE (t.id = handoffs.source_item_id OR t.id = handoffs.target_item_id)
    AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
  ));

CREATE POLICY "Project members can manage handoffs"
  ON public.handoffs FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    WHERE (t.id = handoffs.source_item_id OR t.id = handoffs.target_item_id)
    AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
  ));

-- RLS Policies for Custom Fields
CREATE POLICY "Project members can view custom fields"
  ON public.project_custom_fields FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Project owners can manage custom fields"
  ON public.project_custom_fields FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = project_custom_fields.project_id
    AND p.owner_id = auth.uid()
  ));

-- RLS Policies for SLA Definitions
CREATE POLICY "Project members can view SLA definitions"
  ON public.sla_definitions FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Project owners can manage SLA definitions"
  ON public.sla_definitions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = sla_definitions.project_id
    AND p.owner_id = auth.uid()
  ));

-- RLS Policies for SLA Tracking
CREATE POLICY "Project members can view SLA tracking"
  ON public.sla_tracking FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.projects p ON t.project_id = p.id
    WHERE t.id = sla_tracking.task_id
    AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
  ));

CREATE POLICY "System can manage SLA tracking"
  ON public.sla_tracking FOR ALL
  USING (true);

-- Create indexes
CREATE INDEX idx_workflow_states_template ON public.workflow_states(workflow_template_id);
CREATE INDEX idx_workflow_transitions_template ON public.workflow_transitions(workflow_template_id);
CREATE INDEX idx_project_workflows_project ON public.project_workflows(project_id);
CREATE INDEX idx_handoffs_source ON public.handoffs(source_item_id);
CREATE INDEX idx_handoffs_target ON public.handoffs(target_item_id);
CREATE INDEX idx_sla_tracking_task ON public.sla_tracking(task_id);

-- Insert default workflow templates
INSERT INTO public.workflow_templates (name, description, category, is_default, is_active) VALUES
  ('Design Workflow', 'Standard design workflow with handoff capabilities', 'design', true, true),
  ('Software Development', 'Agile software development workflow', 'software', true, true),
  ('Marketing Campaign', 'Marketing campaign workflow with approval gates', 'marketing', true, true),
  ('Operations Request', 'Operations and incident management workflow', 'operations', true, true);