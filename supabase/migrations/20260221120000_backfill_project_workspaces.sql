-- Backfill workspace_id for legacy project rows that were created before
-- workspace scoping was enforced in the application layer. The goal is to
-- associate every project with a workspace so that the mobile client (and
-- other workspace-aware surfaces) can surface the expected records.
DO $$
DECLARE
  workspace_count INTEGER;
  default_workspace UUID;
BEGIN
  -- 1. Prefer the workspace that is implied by an assigned space. Spaces
  -- always belong to a workspace, so this gives us an authoritative value
  -- when the relationship exists.
  UPDATE public.projects AS p
  SET workspace_id = s.workspace_id
  FROM public.spaces AS s
  WHERE p.workspace_id IS NULL
    AND p.space_id = s.id
    AND s.workspace_id IS NOT NULL;

  -- 2. If a project owner also created a workspace, assume that workspace is
  -- the intended home for their projects. When multiple workspaces satisfy
  -- this criteria we pick the earliest one that user created.
  WITH owner_workspaces AS (
    SELECT
      p.id AS project_id,
      w.id AS workspace_id,
      row_number() OVER (PARTITION BY p.id ORDER BY w.created_at ASC) AS position
    FROM public.projects AS p
    JOIN public.workspaces AS w
      ON w.created_by = p.owner_id
    WHERE p.workspace_id IS NULL
  )
  UPDATE public.projects AS p
  SET workspace_id = ow.workspace_id
  FROM owner_workspaces AS ow
  WHERE p.id = ow.project_id
    AND ow.position = 1;

  -- 3. As a final fallback, if the instance only has a single workspace we
  -- associate every remaining legacy project with that workspace.
  SELECT COUNT(*) INTO workspace_count FROM public.workspaces;

  IF workspace_count = 1 THEN
    SELECT id INTO default_workspace FROM public.workspaces LIMIT 1;

    UPDATE public.projects
    SET workspace_id = default_workspace
    WHERE workspace_id IS NULL;
  END IF;

  -- 4. Surface any remaining projects so operators can make a targeted fix.
  RAISE NOTICE 'Projects still missing workspace_id: %',
    (SELECT json_agg(id) FROM public.projects WHERE workspace_id IS NULL);
END;
$$;
