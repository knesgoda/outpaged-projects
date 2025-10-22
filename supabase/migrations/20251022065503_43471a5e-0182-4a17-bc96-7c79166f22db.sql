-- Phase 1: Status Workflow & Board Modes

-- Create task_statuses table for custom status management
CREATE TABLE IF NOT EXISTS public.task_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Todo' CHECK (category IN ('Todo', 'InProgress', 'Done')),
  color TEXT DEFAULT '#6b7280',
  position INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(project_id, key)
);

-- Add RLS policies for task_statuses
ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Project members can view task statuses"
  ON public.task_statuses FOR SELECT
  USING (is_project_member(project_id, auth.uid()));

CREATE POLICY "Project admins can manage task statuses"
  ON public.task_statuses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = task_statuses.project_id
      AND p.owner_id = auth.uid()
    )
  );

-- Add board mode to existing boards table (if column doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'boards' AND column_name = 'mode'
  ) THEN
    ALTER TABLE public.boards
      ADD COLUMN mode TEXT DEFAULT 'kanban' CHECK (mode IN ('kanban', 'scrum'));
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_statuses_project_id ON public.task_statuses(project_id);
CREATE INDEX IF NOT EXISTS idx_task_statuses_position ON public.task_statuses(project_id, position);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_task_statuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_task_statuses_updated_at
  BEFORE UPDATE ON public.task_statuses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_task_statuses_updated_at();