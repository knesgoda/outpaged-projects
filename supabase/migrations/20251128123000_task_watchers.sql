CREATE TABLE IF NOT EXISTS public.task_watchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  added_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_watchers_task_id ON public.task_watchers(task_id);
CREATE INDEX IF NOT EXISTS idx_task_watchers_user_id ON public.task_watchers(user_id);

ALTER TABLE public.task_watchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view task watchers"
  ON public.task_watchers FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_watchers.task_id
        AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

CREATE POLICY IF NOT EXISTS "Users can manage task watchers"
  ON public.task_watchers FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_watchers.task_id
        AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_watchers.task_id
        AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );
