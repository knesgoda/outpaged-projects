-- 20251005060000_search_tasks.sql
DO $$
BEGIN
  IF to_regclass('public.tasks') IS NOT NULL THEN
    ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS search tsvector;
    CREATE INDEX IF NOT EXISTS tasks_search_idx ON public.tasks USING gin(search);
    CREATE OR REPLACE FUNCTION public.tasks_tsv_update() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      NEW.search :=
        setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B');
      RETURN NEW;
    END$$;
    DROP TRIGGER IF EXISTS trg_tasks_tsv ON public.tasks;
    CREATE TRIGGER trg_tasks_tsv BEFORE INSERT OR UPDATE ON public.tasks
    FOR EACH ROW EXECUTE FUNCTION public.tasks_tsv_update();
  END IF;
END$$;
