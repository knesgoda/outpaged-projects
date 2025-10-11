-- Extend task type enum with additional operational item types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'task_type' AND e.enumlabel = 'incident'
  ) THEN
    ALTER TYPE task_type ADD VALUE 'incident';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'task_type' AND e.enumlabel = 'change'
  ) THEN
    ALTER TYPE task_type ADD VALUE 'change';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'task_type' AND e.enumlabel = 'test'
  ) THEN
    ALTER TYPE task_type ADD VALUE 'test';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'task_type' AND e.enumlabel = 'risk'
  ) THEN
    ALTER TYPE task_type ADD VALUE 'risk';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'task_type' AND e.enumlabel = 'request'
  ) THEN
    ALTER TYPE task_type ADD VALUE 'request';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'task_type' AND e.enumlabel = 'idea'
  ) THEN
    ALTER TYPE task_type ADD VALUE 'idea';
  END IF;
END $$;

-- Core scheduling and estimate fields
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS actual_hours NUMERIC(8,2);

-- Lightweight metadata for external links
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS external_links JSONB DEFAULT '[]'::JSONB;

-- Dedicated table for labelled task tags
CREATE TABLE IF NOT EXISTS public.task_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_tags_task_id ON public.task_tags(task_id);

-- Attachments metadata persisted in relational table
CREATE TABLE IF NOT EXISTS public.task_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES public.profiles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_files_task_id ON public.task_files(task_id);

-- External resource links associated to tasks
CREATE TABLE IF NOT EXISTS public.task_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT,
  url TEXT NOT NULL,
  link_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_links_task_id ON public.task_links(task_id);

-- Explicit subitem mapping table to support rollups and ordering
CREATE TABLE IF NOT EXISTS public.task_subitems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  child_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  rollup_weight NUMERIC(6,3) DEFAULT 1.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(user_id),
  UNIQUE (parent_task_id, child_task_id)
);

CREATE INDEX IF NOT EXISTS idx_task_subitems_parent ON public.task_subitems(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_task_subitems_child ON public.task_subitems(child_task_id);

-- Dependency relations table for explicit directional edges
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_dependency_type') THEN
    CREATE TYPE task_dependency_type AS ENUM (
      'blocks',
      'blocked_by',
      'relates_to',
      'duplicates',
      'fixes',
      'caused_by',
      'follows'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  target_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  dependency_type task_dependency_type NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(user_id),
  UNIQUE (source_task_id, target_task_id, dependency_type)
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_source ON public.task_dependencies(source_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_target ON public.task_dependencies(target_task_id);

-- Enable row level security and align policies with task access controls
ALTER TABLE public.task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_subitems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;

-- Policies for task_tags
CREATE POLICY IF NOT EXISTS "Users can view task tags"
  ON public.task_tags FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_tags.task_id
        AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

CREATE POLICY IF NOT EXISTS "Users can manage task tags"
  ON public.task_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_tags.task_id
        AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_tags.task_id
        AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

-- Policies for task_files
CREATE POLICY IF NOT EXISTS "Users can view task files"
  ON public.task_files FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_files.task_id
        AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

CREATE POLICY IF NOT EXISTS "Users can manage task files"
  ON public.task_files FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_files.task_id
        AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_files.task_id
        AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

-- Policies for task_links
CREATE POLICY IF NOT EXISTS "Users can view task links"
  ON public.task_links FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_links.task_id
        AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

CREATE POLICY IF NOT EXISTS "Users can manage task links"
  ON public.task_links FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_links.task_id
        AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_links.task_id
        AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

-- Policies for task_subitems
CREATE POLICY IF NOT EXISTS "Users can view task subitems"
  ON public.task_subitems FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_subitems.parent_task_id
        AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

CREATE POLICY IF NOT EXISTS "Users can manage task subitems"
  ON public.task_subitems FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_subitems.parent_task_id
        AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      JOIN public.projects p ON p.id = t.project_id
      WHERE t.id = task_subitems.parent_task_id
        AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

-- Policies for task_dependencies
CREATE POLICY IF NOT EXISTS "Users can view task dependencies"
  ON public.task_dependencies FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks st
      JOIN public.projects p ON p.id = st.project_id
      WHERE st.id = task_dependencies.source_task_id
        AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
    OR EXISTS (
      SELECT 1
      FROM public.tasks tt
      JOIN public.projects p2 ON p2.id = tt.project_id
      WHERE tt.id = task_dependencies.target_task_id
        AND (p2.owner_id = auth.uid() OR is_project_member(p2.id, auth.uid()))
    )
  );

CREATE POLICY IF NOT EXISTS "Users can manage task dependencies"
  ON public.task_dependencies FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks st
      JOIN public.projects p ON p.id = st.project_id
      WHERE st.id = task_dependencies.source_task_id
        AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
    AND EXISTS (
      SELECT 1
      FROM public.tasks tt
      JOIN public.projects p2 ON p2.id = tt.project_id
      WHERE tt.id = task_dependencies.target_task_id
        AND (p2.owner_id = auth.uid() OR is_project_member(p2.id, auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.tasks st
      JOIN public.projects p ON p.id = st.project_id
      WHERE st.id = task_dependencies.source_task_id
        AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
    AND EXISTS (
      SELECT 1
      FROM public.tasks tt
      JOIN public.projects p2 ON p2.id = tt.project_id
      WHERE tt.id = task_dependencies.target_task_id
        AND (p2.owner_id = auth.uid() OR is_project_member(p2.id, auth.uid()))
    )
  );
