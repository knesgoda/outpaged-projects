-- 20251005060030_search_files.sql
DO $$
BEGIN
  IF to_regclass('public.project_files') IS NOT NULL THEN
    ALTER TABLE public.project_files DROP COLUMN IF EXISTS search;
    DROP TRIGGER IF EXISTS trg_project_files_tsv ON public.project_files;
    DROP FUNCTION IF EXISTS public.project_files_tsv_update();
    PERFORM search_private.register_source('public.project_files', 'file', 'id', 'workspace_id');
  END IF;
END $$;
