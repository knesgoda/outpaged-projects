-- 20251005060020_search_docs.sql
DO $$
BEGIN
  IF to_regclass('public.doc_pages') IS NOT NULL THEN
    ALTER TABLE public.doc_pages DROP COLUMN IF EXISTS search;
    DROP TRIGGER IF EXISTS trg_doc_pages_tsv ON public.doc_pages;
    DROP FUNCTION IF EXISTS public.doc_pages_tsv_update();
    PERFORM search_private.register_source('public.doc_pages', 'doc', 'id', 'workspace_id');
  END IF;
END $$;
