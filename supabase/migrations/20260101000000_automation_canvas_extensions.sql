-- Extend automation tables to support canvas definitions, versioning, and execution logs

ALTER TABLE public.automation_rules
  ADD COLUMN IF NOT EXISTS graph_definition JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}'::jsonb;

ALTER TABLE public.automation_rules
  ADD COLUMN IF NOT EXISTS governance JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.automation_rules
  ADD COLUMN IF NOT EXISTS current_version_id UUID;

CREATE TABLE IF NOT EXISTS public.automation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  name TEXT,
  notes TEXT,
  definition JSONB NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (automation_id, version_number)
);

ALTER TABLE public.automation_rules
  ADD CONSTRAINT automation_rules_current_version_fk
  FOREIGN KEY (current_version_id)
  REFERENCES public.automation_versions(id)
  ON DELETE SET NULL;

ALTER TABLE public.automation_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view automation versions" ON public.automation_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.automation_rules ar
      JOIN public.projects p ON p.id = ar.project_id
      WHERE ar.id = automation_versions.automation_id
        AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

CREATE POLICY "Project owners can manage automation versions" ON public.automation_versions
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.automation_rules ar
      JOIN public.projects p ON p.id = ar.project_id
      WHERE ar.id = automation_versions.automation_id
        AND (p.owner_id = auth.uid() OR is_project_owner(p.id, auth.uid()))
    )
  );

ALTER TABLE public.automation_executions
  ADD COLUMN IF NOT EXISTS input JSONB,
  ADD COLUMN IF NOT EXISTS output JSONB,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER,
  ADD COLUMN IF NOT EXISTS version_id UUID REFERENCES public.automation_versions(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.automation_run_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.automation_executions(id) ON DELETE CASCADE,
  node_id TEXT,
  step_id TEXT,
  input JSONB,
  output JSONB,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_run_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view automation run logs" ON public.automation_run_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.automation_executions ae
      JOIN public.automation_rules ar ON ar.id = ae.rule_id
      JOIN public.projects p ON p.id = ar.project_id
      WHERE ae.id = automation_run_logs.execution_id
        AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

CREATE POLICY "Project owners can manage automation run logs" ON public.automation_run_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.automation_executions ae
      JOIN public.automation_rules ar ON ar.id = ae.rule_id
      JOIN public.projects p ON p.id = ar.project_id
      WHERE ae.id = automation_run_logs.execution_id
        AND (p.owner_id = auth.uid() OR is_project_owner(p.id, auth.uid()))
    )
  );

CREATE OR REPLACE FUNCTION public.next_automation_version_number()
RETURNS TRIGGER AS $$
DECLARE
  current_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_number), 0)
    INTO current_version
    FROM public.automation_versions
   WHERE automation_id = NEW.automation_id;

  NEW.version_number := current_version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS automation_versions_set_number ON public.automation_versions;

CREATE TRIGGER automation_versions_set_number
  BEFORE INSERT ON public.automation_versions
  FOR EACH ROW
  WHEN (NEW.version_number IS NULL OR NEW.version_number <= 0)
  EXECUTE FUNCTION public.next_automation_version_number();
