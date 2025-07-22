-- Add project code field and task ticket numbering system

-- Add code field to projects table
ALTER TABLE public.projects ADD COLUMN code TEXT;

-- Add ticket_number field to tasks table  
ALTER TABLE public.tasks ADD COLUMN ticket_number INTEGER;

-- Create unique index for ticket numbers per project
CREATE UNIQUE INDEX idx_tasks_project_ticket_number ON public.tasks(project_id, ticket_number);

-- Create function to get next ticket number for a project
CREATE OR REPLACE FUNCTION public.get_next_ticket_number(project_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_number INTEGER;
BEGIN
  -- Get the highest ticket number for this project and add 1
  SELECT COALESCE(MAX(ticket_number), 0) + 1 
  INTO next_number
  FROM public.tasks 
  WHERE project_id = project_id_param;
  
  RETURN next_number;
END;
$$;

-- Create trigger function to auto-assign ticket numbers
CREATE OR REPLACE FUNCTION public.assign_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only assign ticket number if not already set
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number = get_next_ticket_number(NEW.project_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign ticket numbers on insert
CREATE TRIGGER trigger_assign_ticket_number
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION assign_ticket_number();

-- Update existing project with code
UPDATE public.projects 
SET code = 'IRP' 
WHERE name = 'Investor Ready Preparation';

-- Assign ticket numbers to existing tasks in order of creation
WITH numbered_tasks AS (
  SELECT 
    id,
    project_id,
    ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at) as new_ticket_number
  FROM public.tasks
  WHERE ticket_number IS NULL
)
UPDATE public.tasks 
SET ticket_number = numbered_tasks.new_ticket_number
FROM numbered_tasks
WHERE tasks.id = numbered_tasks.id;