
-- 1) Ensure profiles.user_id is unique so we can reference it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_unique') THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
  END IF;
END$$;

-- 2) Add FK from project_members.user_id -> profiles.user_id
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_members_user_id_fkey') THEN
    ALTER TABLE public.project_members
      ADD CONSTRAINT project_members_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END$$;

-- 3) Allow project members to view project members (not just owners)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'project_members' 
      AND policyname = 'Project members can view project members'
  ) THEN
    CREATE POLICY "Project members can view project members"
      ON public.project_members
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 
          FROM public.projects p 
          WHERE p.id = project_members.project_id
            AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
        )
      );
  END IF;
END$$;

-- 4) Assign task ticket_number atomically per project to avoid 23505 duplicates
CREATE OR REPLACE FUNCTION public.assign_task_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Always assign next available number scoped per project under an advisory lock
  PERFORM pg_advisory_xact_lock(hashtext(NEW.project_id::text), 1);

  SELECT COALESCE(MAX(ticket_number), 0) + 1
    INTO NEW.ticket_number
  FROM public.tasks
  WHERE project_id = NEW.project_id;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_assign_task_ticket_number ON public.tasks;

CREATE TRIGGER trg_assign_task_ticket_number
BEFORE INSERT ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.assign_task_ticket_number();
