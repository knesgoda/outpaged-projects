-- 20251005060040_search_comments.sql
DO $$
BEGIN
  IF to_regclass('public.comments') IS NOT NULL THEN
    ALTER TABLE public.comments DROP COLUMN IF EXISTS search;
    DROP TRIGGER IF EXISTS trg_comments_tsv ON public.comments;
    DROP FUNCTION IF EXISTS public.comments_tsv_update();
    PERFORM search_private.register_source('public.comments', 'comment', 'id', 'workspace_id');
  END IF;
END $$;
