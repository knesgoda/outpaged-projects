-- Fix the remaining function search path issues

-- Fix remaining functions that don't have search_path set
CREATE OR REPLACE FUNCTION public.update_story_progression_percentage()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
    -- Calculate completion percentage based on completed chapters
    UPDATE story_progression 
    SET completion_percentage = (
        SELECT ROUND(
            (array_length(NEW.chapters_completed, 1)::DECIMAL / 
             GREATEST(
                 (SELECT COUNT(*) FROM story_chapters WHERE narrative_id = NEW.narrative_id), 
                 1
             )) * 100, 
            2
        )
    ),
    last_activity_at = now(),
    is_completed = (
        array_length(NEW.chapters_completed, 1) >= 
        (SELECT COUNT(*) FROM story_chapters WHERE narrative_id = NEW.narrative_id)
    ),
    completed_at = CASE 
        WHEN (array_length(NEW.chapters_completed, 1) >= 
              (SELECT COUNT(*) FROM story_chapters WHERE narrative_id = NEW.narrative_id))
             AND NEW.completed_at IS NULL
        THEN now()
        ELSE NEW.completed_at
    END
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_status_mapping()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  -- Check if a status mapping already exists for this column
  IF NOT EXISTS (
    SELECT 1 FROM task_status_mappings 
    WHERE column_id = NEW.id AND project_id = NEW.project_id
  ) THEN
    -- Create default status mapping based on column name
    INSERT INTO task_status_mappings (
      project_id,
      column_id,
      status_value,
      display_name
    ) VALUES (
      NEW.project_id,
      NEW.id,
      CASE 
        WHEN LOWER(NEW.name) LIKE '%todo%' OR LOWER(NEW.name) LIKE '%to do%' THEN 'todo'
        WHEN LOWER(NEW.name) LIKE '%progress%' OR LOWER(NEW.name) LIKE '%doing%' THEN 'in_progress'
        WHEN LOWER(NEW.name) LIKE '%review%' OR LOWER(NEW.name) LIKE '%testing%' THEN 'in_review'
        WHEN LOWER(NEW.name) LIKE '%done%' OR LOWER(NEW.name) LIKE '%complete%' THEN 'done'
        ELSE LOWER(REPLACE(NEW.name, ' ', '_'))
      END,
      NEW.name
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_task_relationships(task_id_param UUID)
RETURNS TABLE(id UUID, source_task_id UUID, target_task_id UUID, relationship_type task_relationship_type, created_at TIMESTAMP WITH TIME ZONE, created_by UUID, notes TEXT, source_task_title TEXT, target_task_title TEXT, source_task_status task_status, target_task_status task_status)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tr.id,
    tr.source_task_id,
    tr.target_task_id,
    tr.relationship_type,
    tr.created_at,
    tr.created_by,
    tr.notes,
    st.title as source_task_title,
    tt.title as target_task_title,
    st.status as source_task_status,
    tt.status as target_task_status
  FROM public.task_relationships tr
  JOIN public.tasks st ON tr.source_task_id = st.id
  JOIN public.tasks tt ON tr.target_task_id = tt.id
  WHERE tr.source_task_id = task_id_param OR tr.target_task_id = task_id_param
  ORDER BY tr.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_story_points_rollup(task_id_param UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.create_default_status_mapping()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;