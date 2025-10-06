-- 20251005060050_search_profiles.sql
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS search tsvector;
    CREATE INDEX IF NOT EXISTS profiles_search_idx ON public.profiles USING gin(search);
    CREATE OR REPLACE FUNCTION public.profiles_tsv_update() RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      NEW.search :=
        setweight(to_tsvector('simple', coalesce(NEW.full_name, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(NEW.department, '')), 'C');
      RETURN NEW;
    END$$;
    DROP TRIGGER IF EXISTS trg_profiles_tsv ON public.profiles;
    CREATE TRIGGER trg_profiles_tsv BEFORE INSERT OR UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.profiles_tsv_update();
  END IF;
END$$;
