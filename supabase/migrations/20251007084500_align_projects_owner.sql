-- Align projects schema with application expectations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'projects'
      AND column_name = 'owner'
  ) THEN
    ALTER TABLE public.projects ADD COLUMN owner uuid;
    UPDATE public.projects SET owner = owner_id WHERE owner IS NULL;
    BEGIN
      ALTER TABLE public.projects
        ADD CONSTRAINT projects_owner_fkey
        FOREIGN KEY (owner)
        REFERENCES auth.users(id)
        ON DELETE CASCADE;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END
$$;

ALTER TABLE public.projects ALTER COLUMN owner SET NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_projects_owner_columns()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.owner := COALESCE(NEW.owner, NEW.owner_id);
  NEW.owner_id := COALESCE(NEW.owner_id, NEW.owner);
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'sync_projects_owner_columns'
  ) THEN
    CREATE TRIGGER sync_projects_owner_columns
    BEFORE INSERT OR UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_projects_owner_columns();
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'project_status'
  ) THEN
    BEGIN
      ALTER TYPE public.project_status ADD VALUE IF NOT EXISTS 'archived';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END
$$;

ALTER TABLE public.projects ALTER COLUMN status SET DEFAULT 'active';
UPDATE public.projects SET status = 'active' WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS projects_owner_idx ON public.projects(owner);
