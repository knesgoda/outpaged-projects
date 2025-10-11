-- 20251005060010_search_projects.sql
DO $$
BEGIN
  IF to_regclass('public.projects') IS NOT NULL THEN
    ALTER TABLE public.projects DROP COLUMN IF EXISTS search;
    DROP TRIGGER IF EXISTS trg_projects_tsv ON public.projects;
    DROP FUNCTION IF EXISTS public.projects_tsv_update();
    PERFORM search_private.register_source('public.projects', 'project', 'id', 'workspace_id');
  END IF;
END $$;
