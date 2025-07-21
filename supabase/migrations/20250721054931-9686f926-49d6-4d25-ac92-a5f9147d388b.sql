
-- Update the task_type enum to include all Jira issue types
ALTER TYPE public.task_type ADD VALUE IF NOT EXISTS 'story';
ALTER TYPE public.task_type ADD VALUE IF NOT EXISTS 'epic';
ALTER TYPE public.task_type ADD VALUE IF NOT EXISTS 'initiative';
ALTER TYPE public.task_type ADD VALUE IF NOT EXISTS 'task';
ALTER TYPE public.task_type ADD VALUE IF NOT EXISTS 'subtask';

-- Add story points column for agile planning
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS story_points INTEGER;

-- Create function to validate task hierarchy constraints
CREATE OR REPLACE FUNCTION public.validate_task_hierarchy()
RETURNS TRIGGER AS $$
BEGIN
  -- Sub-tasks can only be under stories, tasks, or bugs
  IF NEW.hierarchy_level = 'subtask' AND NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE id = NEW.parent_id 
      AND (hierarchy_level = 'story' OR hierarchy_level = 'task' OR task_type = 'bug')
    ) THEN
      RAISE EXCEPTION 'Sub-tasks can only be created under Stories, Tasks, or Bugs';
    END IF;
  END IF;
  
  -- Stories can only be under epics
  IF NEW.hierarchy_level = 'story' AND NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE id = NEW.parent_id 
      AND hierarchy_level = 'epic'
    ) THEN
      RAISE EXCEPTION 'Stories can only be created under Epics';
    END IF;
  END IF;
  
  -- Epics can only be under initiatives
  IF NEW.hierarchy_level = 'epic' AND NEW.parent_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.tasks 
      WHERE id = NEW.parent_id 
      AND hierarchy_level = 'initiative'
    ) THEN
      RAISE EXCEPTION 'Epics can only be created under Initiatives';
    END IF;
  END IF;
  
  -- Initiatives cannot have parents
  IF NEW.hierarchy_level = 'initiative' AND NEW.parent_id IS NOT NULL THEN
    RAISE EXCEPTION 'Initiatives cannot have parent tasks';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for hierarchy validation
DROP TRIGGER IF EXISTS validate_task_hierarchy_trigger ON public.tasks;
CREATE TRIGGER validate_task_hierarchy_trigger
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION validate_task_hierarchy();

-- Create function to calculate story points rollup
CREATE OR REPLACE FUNCTION public.calculate_story_points_rollup(task_id_param uuid)
RETURNS INTEGER AS $$
DECLARE
  total_points INTEGER := 0;
  direct_points INTEGER := 0;
BEGIN
  -- Get direct story points
  SELECT COALESCE(story_points, 0) INTO direct_points
  FROM public.tasks
  WHERE id = task_id_param;
  
  -- Get sum of child story points
  SELECT COALESCE(SUM(story_points), 0) INTO total_points
  FROM public.tasks
  WHERE parent_id = task_id_param;
  
  -- Return direct points if no children, otherwise return sum of children
  IF total_points > 0 THEN
    RETURN total_points;
  ELSE
    RETURN direct_points;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create index for better performance on hierarchy queries
CREATE INDEX IF NOT EXISTS idx_tasks_hierarchy_parent ON public.tasks(parent_id, hierarchy_level);
CREATE INDEX IF NOT EXISTS idx_tasks_story_points ON public.tasks(story_points) WHERE story_points IS NOT NULL;
