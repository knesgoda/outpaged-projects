-- Phase 1: Create a default workspace if none exists
DO $$
DECLARE
  default_workspace_id UUID;
  first_user_id UUID;
BEGIN
  -- Check if we have any workspaces
  IF NOT EXISTS (SELECT 1 FROM workspaces LIMIT 1) THEN
    -- Get the first user (project owner) to own the default workspace
    SELECT DISTINCT owner_id INTO first_user_id 
    FROM projects 
    WHERE owner_id IS NOT NULL 
    LIMIT 1;
    
    -- Create default workspace
    INSERT INTO workspaces (id, name, slug, description, created_by)
    VALUES (
      gen_random_uuid(),
      'Default Workspace',
      'default-workspace',
      'Default workspace for existing projects',
      COALESCE(first_user_id, (SELECT id FROM auth.users LIMIT 1))
    )
    RETURNING id INTO default_workspace_id;
    
    -- Update all projects with NULL workspace_id to use the default workspace
    UPDATE projects 
    SET workspace_id = default_workspace_id,
        updated_at = now()
    WHERE workspace_id IS NULL;
    
    RAISE NOTICE 'Created default workspace % and updated % projects', 
      default_workspace_id, 
      (SELECT COUNT(*) FROM projects WHERE workspace_id = default_workspace_id);
  END IF;
END $$;

-- Phase 2: Add constraint to ensure workspace_id is always set for new projects
-- (We'll handle this in application code to avoid breaking existing NULL values during transition)

COMMENT ON COLUMN projects.workspace_id IS 'Every project must belong to a workspace. NULL values are legacy only.';