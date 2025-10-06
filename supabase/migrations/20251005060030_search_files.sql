-- 20251005060030_search_files.sql
DO $$
BEGIN
  IF to_regclass('public.project_files') IS NOT NULL THEN
    ALTER TABLE public.project_files ADD COLUMN IF NOT EXISTS search tsvector;
    CREATE INDEX IF NOT EXISTS project_files_search_idx ON public.project_files USING gin(search);
    CREATE OR REPLACE FUNCTION public.project_files_tsv_update() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      NEW.search :=
        setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW.path, '')), 'B');
      RETURN NEW;
    END$$;
    DROP TRIGGER IF EXISTS trg_project_files_tsv ON public.project_files;
    CREATE TRIGGER trg_project_files_tsv BEFORE INSERT OR UPDATE ON public.project_files
    FOR EACH ROW EXECUTE FUNCTION public.project_files_tsv_update();
  END IF;
END$$;
