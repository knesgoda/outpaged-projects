
-- Add a trigger to automatically create status mappings when columns are created
CREATE OR REPLACE FUNCTION create_default_status_mapping()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a status mapping for the new column
  -- Use the column name as the status value (lowercased and with spaces replaced by underscores)
  INSERT INTO public.task_status_mappings (
    project_id,
    column_id,
    status_value,
    display_name
  ) VALUES (
    NEW.project_id,
    NEW.id,
    LOWER(REPLACE(NEW.name, ' ', '_')),
    NEW.name
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_create_status_mapping
  AFTER INSERT ON public.kanban_columns
  FOR EACH ROW
  EXECUTE FUNCTION create_default_status_mapping();

-- Add some default status mappings for existing columns
INSERT INTO public.task_status_mappings (project_id, column_id, status_value, display_name)
SELECT 
  kc.project_id,
  kc.id,
  CASE 
    WHEN kc.name = 'To Do' THEN 'todo'
    WHEN kc.name = 'In Progress' THEN 'in_progress'
    WHEN kc.name = 'Review' THEN 'in_review'
    WHEN kc.name = 'Done' THEN 'done'
    ELSE LOWER(REPLACE(kc.name, ' ', '_'))
  END,
  kc.name
FROM public.kanban_columns kc
WHERE kc.is_default = true
ON CONFLICT DO NOTHING;
