-- 20251005060040_search_comments.sql
DO $$
BEGIN
  IF to_regclass('public.comments') IS NOT NULL THEN
    ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS search tsvector;
    CREATE INDEX IF NOT EXISTS comments_search_idx ON public.comments USING gin(search);
    CREATE OR REPLACE FUNCTION public.comments_tsv_update() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      NEW.search := setweight(to_tsvector('simple', coalesce(NEW.body_markdown, '')), 'B');
      RETURN NEW;
    END$$;
    DROP TRIGGER IF EXISTS trg_comments_tsv ON public.comments;
    CREATE TRIGGER trg_comments_tsv BEFORE INSERT OR UPDATE ON public.comments
    FOR EACH ROW EXECUTE FUNCTION public.comments_tsv_update();
  END IF;
END$$;
