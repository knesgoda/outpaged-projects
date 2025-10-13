-- Portfolios and portfolio relationships
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'portfolio_status') THEN
    CREATE TYPE public.portfolio_status AS ENUM ('draft', 'active', 'paused', 'archived');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  status public.portfolio_status NOT NULL DEFAULT 'active',
  health TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, lower(name))
);

CREATE TABLE IF NOT EXISTS public.portfolio_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  strategic_importance NUMERIC(6,2),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (portfolio_id, project_id)
);

CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  contribution_weight NUMERIC(6,3),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (portfolio_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_portfolios_workspace ON public.portfolios(workspace_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_portfolio ON public.portfolio_projects(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_projects_project ON public.portfolio_projects(project_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_portfolio ON public.portfolio_items(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_items_project ON public.portfolio_items(project_id);

ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_members_select_portfolios"
  ON public.portfolios FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_manage_portfolios"
  ON public.portfolios FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_select_portfolio_projects"
  ON public.portfolio_projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_manage_portfolio_projects"
  ON public.portfolio_projects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_select_portfolio_items"
  ON public.portfolio_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_members_manage_portfolio_items"
  ON public.portfolio_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workspace_members wm
      WHERE wm.user_id = auth.uid()
    )
  );

CREATE TRIGGER update_portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP VIEW IF EXISTS public.portfolio_overview;

CREATE VIEW public.portfolio_overview AS
WITH project_counts AS (
  SELECT
    portfolio_id,
    COUNT(DISTINCT project_id) AS project_count
  FROM public.portfolio_projects
  GROUP BY portfolio_id
),
item_counts AS (
  SELECT
    pi.portfolio_id,
    COUNT(pi.item_id) AS item_count,
    COUNT(pi.item_id) FILTER (
      WHERE t.status IN ('done', 'completed', 'resolved', 'closed')
    ) AS completed_item_count
  FROM public.portfolio_items pi
  LEFT JOIN public.tasks t ON t.id = pi.item_id
  GROUP BY pi.portfolio_id
)
SELECT
  p.id,
  p.workspace_id,
  p.owner_id,
  p.name,
  p.description,
  p.status,
  p.health,
  p.metadata,
  p.created_at,
  p.updated_at,
  COALESCE(pc.project_count, 0) AS project_count,
  COALESCE(ic.item_count, 0) AS item_count,
  COALESCE(ic.completed_item_count, 0) AS completed_item_count
FROM public.portfolios p
LEFT JOIN project_counts pc ON pc.portfolio_id = p.id
LEFT JOIN item_counts ic ON ic.portfolio_id = p.id;

GRANT SELECT ON public.portfolio_overview TO authenticated;
