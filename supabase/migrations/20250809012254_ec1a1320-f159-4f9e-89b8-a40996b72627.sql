
-- 1) Clean up any duplicate profiles by user_id, keeping the earliest row
WITH ranked AS (
  SELECT
    id,
    user_id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) AS rn
  FROM public.profiles
)
DELETE FROM public.profiles p
USING ranked r
WHERE p.id = r.id
  AND r.rn > 1;

-- 2) Ensure profiles.user_id is unique (needed for a proper FK reference)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'uniq_profiles_user_id'
  ) THEN
    CREATE UNIQUE INDEX uniq_profiles_user_id ON public.profiles(user_id);
  END IF;
END$$;

-- 3) Add FK from project_members.user_id -> profiles.user_id
-- Use the exact name expected by PostgREST embedding: project_members_user_id_fkey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_schema = 'public'
      AND table_name = 'project_members'
      AND constraint_name = 'project_members_user_id_fkey'
  ) THEN
    ALTER TABLE public.project_members
    ADD CONSTRAINT project_members_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(user_id)
    ON DELETE CASCADE;
  END IF;
END$$;

-- 4) Add BEFORE INSERT trigger to auto-assign ticket_number per project
-- Uses existing function public.assign_task_ticket_number()
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'tasks_assign_ticket_number'
  ) THEN
    CREATE TRIGGER tasks_assign_ticket_number
    BEFORE INSERT ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_task_ticket_number();
  END IF;
END$$;
