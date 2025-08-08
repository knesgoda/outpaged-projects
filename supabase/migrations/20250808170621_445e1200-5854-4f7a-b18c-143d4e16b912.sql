` tags. I’ll announce a plan that outlines these changes, but I’ll skip including a quick reply this time since the SQL needs approval first. I’ll also append a troubleshooting link for the user.

Now, let’s wrap this up with the SQL commands and a suggestion to refresh after the migration. 

<lov-sql>
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_user_id_key') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_members_user_id_fkey') THEN
    ALTER TABLE public.project_members ADD CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.assign_task_ticket_number() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number <= 0 THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.project_id::text));
    NEW.ticket_number = get_next_ticket_number(NEW.project_id);
  END IF;
  RETURN NEW;
END;
$function$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_task_ticket_number') THEN
    CREATE TRIGGER set_task_ticket_number BEFORE INSERT ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.assign_task_ticket_number();
  END IF;
END $$;
