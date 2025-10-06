-- 20251005060010_search_projects.sql
DO $$
BEGIN
  IF to_regclass('public.projects') IS NOT NULL THEN
    ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS search tsvector;
    CREATE INDEX IF NOT EXISTS projects_search_idx ON public.projects USING gin(search);
    CREATE OR REPLACE FUNCTION public.projects_tsv_update() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      NEW.search :=
        setweight(to_tsvector('simple', coalesce(NEW.name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B');
      RETURN NEW;
    END$$;
    DROP TRIGGER IF EXISTS trg_projects_tsv ON public.projects;
    CREATE TRIGGER trg_projects_tsv BEFORE INSERT OR UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.projects_tsv_update();
  END IF;
END$$;
