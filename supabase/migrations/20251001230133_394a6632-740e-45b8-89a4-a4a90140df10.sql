-- Phase 0: Foundation - Part 5: Comprehensive Audit Log
-- Create audit_log table for all changes
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'create', 'update', 'delete', 'status_change', etc.
  entity_type TEXT NOT NULL, -- 'task', 'project', 'workspace', 'custom_field', etc.
  entity_id UUID NOT NULL,
  changes JSONB NOT NULL DEFAULT '{}'::jsonb, -- before/after values
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context (IP, user agent, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);

-- Enable RLS
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_log
CREATE POLICY "Org admins can view all audit logs"
ON public.audit_log FOR SELECT
USING (check_user_role(auth.uid(), 'org_admin'));

CREATE POLICY "Users can view their own audit logs"
ON public.audit_log FOR SELECT
USING (user_id = auth.uid());

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.audit_log FOR INSERT
WITH CHECK (true);

-- Create function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_changes JSONB DEFAULT '{}'::jsonb,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, changes, metadata)
  VALUES (p_user_id, p_action, p_entity_type, p_entity_id, p_changes, p_metadata)
  RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;

-- Create trigger function to automatically log task changes
CREATE OR REPLACE FUNCTION public.audit_task_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  changes_obj JSONB := '{}'::jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM log_audit_event(
      auth.uid(),
      'create',
      'task',
      NEW.id,
      jsonb_build_object('new', to_jsonb(NEW))
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Build changes object with only changed fields
    IF OLD.title != NEW.title THEN
      changes_obj := changes_obj || jsonb_build_object('title', jsonb_build_object('old', OLD.title, 'new', NEW.title));
    END IF;
    IF OLD.status != NEW.status THEN
      changes_obj := changes_obj || jsonb_build_object('status', jsonb_build_object('old', OLD.status, 'new', NEW.status));
    END IF;
    IF OLD.priority != NEW.priority THEN
      changes_obj := changes_obj || jsonb_build_object('priority', jsonb_build_object('old', OLD.priority, 'new', NEW.priority));
    END IF;
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      changes_obj := changes_obj || jsonb_build_object('assignee_id', jsonb_build_object('old', OLD.assignee_id, 'new', NEW.assignee_id));
    END IF;
    
    IF changes_obj != '{}'::jsonb THEN
      PERFORM log_audit_event(
        auth.uid(),
        'update',
        'task',
        NEW.id,
        changes_obj
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM log_audit_event(
      auth.uid(),
      'delete',
      'task',
      OLD.id,
      jsonb_build_object('old', to_jsonb(OLD))
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for task auditing
DROP TRIGGER IF EXISTS audit_task_changes_trigger ON public.tasks;
CREATE TRIGGER audit_task_changes_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.audit_task_changes();