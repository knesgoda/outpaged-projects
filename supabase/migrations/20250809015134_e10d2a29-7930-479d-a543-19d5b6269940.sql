
-- 1) Remove the legacy ticket-number trigger/function to prevent duplicate assignment
DROP TRIGGER IF EXISTS trigger_assign_ticket_number ON public.tasks;
DROP FUNCTION IF EXISTS public.assign_ticket_number();

-- 2) Ensure the safe (locked) trigger exists and is the only one active
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'tasks_assign_ticket_number'
  ) THEN
    CREATE TRIGGER tasks_assign_ticket_number
    BEFORE INSERT ON public.tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.assign_task_ticket_number();
  END IF;
END $$;
