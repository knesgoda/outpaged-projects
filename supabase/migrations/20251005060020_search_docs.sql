-- 20251005060020_search_docs.sql
DO $$
BEGIN
  IF to_regclass('public.doc_pages') IS NOT NULL THEN
    ALTER TABLE public.doc_pages ADD COLUMN IF NOT EXISTS search tsvector;
    CREATE INDEX IF NOT EXISTS doc_pages_search_idx ON public.doc_pages USING gin(search);
    CREATE OR REPLACE FUNCTION public.doc_pages_tsv_update() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      NEW.search :=
        setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW.body_markdown, '')), 'B');
      RETURN NEW;
    END$$;
    DROP TRIGGER IF EXISTS trg_doc_pages_tsv ON public.doc_pages;
    CREATE TRIGGER trg_doc_pages_tsv BEFORE INSERT OR UPDATE ON public.doc_pages
    FOR EACH ROW EXECUTE FUNCTION public.doc_pages_tsv_update();
  END IF;
END$$;
