
-- Create enum for relationship types
CREATE TYPE task_relationship_type AS ENUM ('blocks', 'depends_on', 'duplicates', 'relates_to');

-- Create the task_relationships table
CREATE TABLE public.task_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_task_id UUID NOT NULL,
  target_task_id UUID NOT NULL,
  relationship_type task_relationship_type NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  notes TEXT,
  CONSTRAINT fk_source_task FOREIGN KEY (source_task_id) REFERENCES public.tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_target_task FOREIGN KEY (target_task_id) REFERENCES public.tasks(id) ON DELETE CASCADE,
  CONSTRAINT no_self_relationship CHECK (source_task_id != target_task_id),
  CONSTRAINT unique_relationship UNIQUE (source_task_id, target_task_id, relationship_type)
);

-- Enable RLS
ALTER TABLE public.task_relationships ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view relationships for tasks in their projects"
  ON public.task_relationships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks st
      JOIN public.projects p ON st.project_id = p.id
      WHERE st.id = source_task_id 
      AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
    AND
    EXISTS (
      SELECT 1 FROM public.tasks tt
      JOIN public.projects p ON tt.project_id = p.id
      WHERE tt.id = target_task_id 
      AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

CREATE POLICY "Users can create relationships for tasks in their projects"
  ON public.task_relationships FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND
    EXISTS (
      SELECT 1 FROM public.tasks st
      JOIN public.projects p ON st.project_id = p.id
      WHERE st.id = source_task_id 
      AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
    AND
    EXISTS (
      SELECT 1 FROM public.tasks tt
      JOIN public.projects p ON tt.project_id = p.id
      WHERE tt.id = target_task_id 
      AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

CREATE POLICY "Users can delete relationships they created"
  ON public.task_relationships FOR DELETE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can update relationships they created"
  ON public.task_relationships FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Admins can manage all relationships"
  ON public.task_relationships FOR ALL
  USING (is_admin(auth.uid()));

-- Create function to prevent circular dependencies
CREATE OR REPLACE FUNCTION prevent_circular_dependency()
RETURNS TRIGGER AS $$
BEGIN
  -- Only check for circular dependencies with 'blocks' and 'depends_on' relationships
  IF NEW.relationship_type IN ('blocks', 'depends_on') THEN
    -- Check if adding this relationship would create a circular dependency
    IF EXISTS (
      WITH RECURSIVE dependency_chain AS (
        -- Start with the new relationship
        SELECT NEW.target_task_id as task_id, NEW.source_task_id as blocks_task_id, 1 as depth
        
        UNION ALL
        
        -- Follow the chain of dependencies
        SELECT tr.target_task_id, dc.blocks_task_id, dc.depth + 1
        FROM task_relationships tr
        JOIN dependency_chain dc ON tr.source_task_id = dc.task_id
        WHERE tr.relationship_type IN ('blocks', 'depends_on')
        AND dc.depth < 10 -- Prevent infinite recursion
      )
      SELECT 1 FROM dependency_chain 
      WHERE task_id = blocks_task_id -- Circular dependency detected
    ) THEN
      RAISE EXCEPTION 'Cannot create relationship: would create circular dependency';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent circular dependencies
CREATE TRIGGER prevent_circular_dependency_trigger
  BEFORE INSERT ON public.task_relationships
  FOR EACH ROW
  EXECUTE FUNCTION prevent_circular_dependency();

-- Create function to get task relationships
CREATE OR REPLACE FUNCTION get_task_relationships(task_id_param UUID)
RETURNS TABLE(
  id UUID,
  source_task_id UUID,
  target_task_id UUID,
  relationship_type task_relationship_type,
  created_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  notes TEXT,
  source_task_title TEXT,
  target_task_title TEXT,
  source_task_status task_status,
  target_task_status task_status
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
