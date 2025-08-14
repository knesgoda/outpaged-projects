-- Phase 1: Workflow Automation Engine Database Schema

-- Create enum types for automation system
CREATE TYPE automation_trigger_type AS ENUM (
  'status_change',
  'assignment_change', 
  'due_date_approaching',
  'field_update',
  'task_created',
  'comment_added',
  'time_logged'
);

CREATE TYPE automation_action_type AS ENUM (
  'assign_user',
  'change_status',
  'update_field',
  'send_notification',
  'create_subtask',
  'add_comment',
  'set_due_date',
  'move_to_project'
);

CREATE TYPE automation_condition_operator AS ENUM (
  'equals',
  'not_equals',
  'contains',
  'greater_than',
  'less_than',
  'is_empty',
  'is_not_empty'
);

-- Automation rules table
CREATE TABLE public.automation_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE
);

-- Automation triggers - what starts the automation
CREATE TABLE public.automation_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  trigger_type automation_trigger_type NOT NULL,
  conditions JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of condition objects
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Automation actions - what the automation does
CREATE TABLE public.automation_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  action_type automation_action_type NOT NULL,
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Configuration for the action
  execution_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Automation execution log
CREATE TABLE public.automation_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE,
  triggered_by UUID,
  trigger_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions_executed JSONB NOT NULL DEFAULT '[]'::jsonb,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  executed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Custom fields system for dynamic task properties
CREATE TYPE custom_field_type AS ENUM (
  'text',
  'number',
  'select',
  'multi_select',
  'date',
  'boolean',
  'user',
  'url'
);

CREATE TABLE public.custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  field_type custom_field_type NOT NULL,
  options JSONB DEFAULT '[]'::jsonb, -- For select/multi-select fields
  is_required BOOLEAN NOT NULL DEFAULT false,
  default_value JSONB,
  position INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, name)
);

-- Custom field values for tasks
CREATE TABLE public.task_custom_fields (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(task_id, custom_field_id)
);

-- Enable RLS on all new tables
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_custom_fields ENABLE ROW LEVEL SECURITY;

-- RLS Policies for automation_rules
CREATE POLICY "Project members can view automation rules" ON public.automation_rules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = automation_rules.project_id 
      AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

CREATE POLICY "Project owners can manage automation rules" ON public.automation_rules
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = automation_rules.project_id 
      AND p.owner_id = auth.uid()
    )
  );

-- RLS Policies for automation_triggers
CREATE POLICY "Project members can view automation triggers" ON public.automation_triggers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.automation_rules ar
      JOIN public.projects p ON ar.project_id = p.id
      WHERE ar.id = automation_triggers.rule_id 
      AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

CREATE POLICY "Project owners can manage automation triggers" ON public.automation_triggers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.automation_rules ar
      JOIN public.projects p ON ar.project_id = p.id
      WHERE ar.id = automation_triggers.rule_id 
      AND p.owner_id = auth.uid()
    )
  );

-- RLS Policies for automation_actions
CREATE POLICY "Project members can view automation actions" ON public.automation_actions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.automation_rules ar
      JOIN public.projects p ON ar.project_id = p.id
      WHERE ar.id = automation_actions.rule_id 
      AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

CREATE POLICY "Project owners can manage automation actions" ON public.automation_actions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.automation_rules ar
      JOIN public.projects p ON ar.project_id = p.id
      WHERE ar.id = automation_actions.rule_id 
      AND p.owner_id = auth.uid()
    )
  );

-- RLS Policies for automation_executions
CREATE POLICY "Project members can view automation executions" ON public.automation_executions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.automation_rules ar
      JOIN public.projects p ON ar.project_id = p.id
      WHERE ar.id = automation_executions.rule_id 
      AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

-- RLS Policies for custom_fields
CREATE POLICY "Project members can view custom fields" ON public.custom_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = custom_fields.project_id 
      AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

CREATE POLICY "Project owners can manage custom fields" ON public.custom_fields
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = custom_fields.project_id 
      AND p.owner_id = auth.uid()
    )
  );

-- RLS Policies for task_custom_fields
CREATE POLICY "Project members can view task custom fields" ON public.task_custom_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE t.id = task_custom_fields.task_id 
      AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

CREATE POLICY "Project members can manage task custom fields" ON public.task_custom_fields
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      JOIN public.projects p ON t.project_id = p.id
      WHERE t.id = task_custom_fields.task_id 
      AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

-- Add triggers for updated_at columns
CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_custom_fields_updated_at
  BEFORE UPDATE ON public.custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_custom_fields_updated_at
  BEFORE UPDATE ON public.task_custom_fields
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to execute automation rules
CREATE OR REPLACE FUNCTION public.execute_automation_rule(
  rule_id_param UUID,
  task_id_param UUID,
  trigger_data_param JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rule_record RECORD;
  action_record RECORD;
  execution_id UUID;
  success BOOLEAN := true;
  error_msg TEXT := '';
BEGIN
  -- Get the automation rule
  SELECT * INTO rule_record FROM public.automation_rules WHERE id = rule_id_param AND is_active = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Create execution log entry
  INSERT INTO public.automation_executions (rule_id, task_id, triggered_by, trigger_data)
  VALUES (rule_id_param, task_id_param, auth.uid(), trigger_data_param)
  RETURNING id INTO execution_id;

  -- Execute actions in order
  FOR action_record IN 
    SELECT * FROM public.automation_actions 
    WHERE rule_id = rule_id_param 
    ORDER BY execution_order
  LOOP
    BEGIN
      -- Execute action based on type
      CASE action_record.action_type
        WHEN 'change_status' THEN
          UPDATE public.tasks 
          SET status = (action_record.action_config->>'status')::task_status
          WHERE id = task_id_param;
          
        WHEN 'assign_user' THEN
          -- Handle user assignment through task_assignees table
          INSERT INTO public.task_assignees (task_id, user_id, assigned_by)
          VALUES (task_id_param, (action_record.action_config->>'user_id')::UUID, auth.uid())
          ON CONFLICT (task_id, user_id) DO NOTHING;
          
        WHEN 'add_comment' THEN
          INSERT INTO public.comments (task_id, author_id, content)
          VALUES (task_id_param, auth.uid(), action_record.action_config->>'content');
          
        WHEN 'update_field' THEN
          -- Handle custom field updates
          INSERT INTO public.task_custom_fields (task_id, custom_field_id, value)
          VALUES (
            task_id_param, 
            (action_record.action_config->>'field_id')::UUID,
            action_record.action_config->'value'
          )
          ON CONFLICT (task_id, custom_field_id) 
          DO UPDATE SET value = action_record.action_config->'value', updated_at = now();
          
        ELSE
          -- Log unsupported action type
          error_msg := 'Unsupported action type: ' || action_record.action_type;
          success := false;
      END CASE;
    EXCEPTION
      WHEN OTHERS THEN
        error_msg := SQLERRM;
        success := false;
    END;
  END LOOP;

  -- Update execution log
  UPDATE public.automation_executions 
  SET success = success, error_message = NULLIF(error_msg, '')
  WHERE id = execution_id;

  -- Update rule execution count
  UPDATE public.automation_rules 
  SET execution_count = execution_count + 1, last_executed_at = now()
  WHERE id = rule_id_param;

  RETURN success;
END;
$function$;