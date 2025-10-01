-- Phase 0: Foundation - Part 2: Workspaces and Spaces
-- Create workspaces table (top-level organization container)
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  settings JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workspace_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
  CONSTRAINT workspace_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Create spaces table (department/team level container within workspace)
CREATE TABLE IF NOT EXISTS public.spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  space_type TEXT DEFAULT 'general',
  settings JSONB DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workspace_id, slug),
  CONSTRAINT space_name_length CHECK (char_length(name) >= 2 AND char_length(name) <= 100),
  CONSTRAINT space_slug_format CHECK (slug ~ '^[a-z0-9-]+$')
);

-- Add workspace and space columns to existing projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS space_id UUID REFERENCES public.spaces(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS project_key TEXT,
ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'::jsonb;

-- Create unique constraint on project_key within workspace
CREATE UNIQUE INDEX IF NOT EXISTS projects_workspace_key_unique 
ON public.projects(workspace_id, project_key) 
WHERE project_key IS NOT NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON public.workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_spaces_workspace_id ON public.spaces(workspace_id);
CREATE INDEX IF NOT EXISTS idx_spaces_slug ON public.spaces(workspace_id, slug);
CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON public.projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_space_id ON public.projects(space_id);
CREATE INDEX IF NOT EXISTS idx_projects_key ON public.projects(project_key);

-- Enable RLS
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles without recursion
CREATE OR REPLACE FUNCTION public.check_user_role(user_id UUID, required_role team_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.user_id = $1 
    AND profiles.role = $2
  );
END;
$$;

-- RLS Policies for workspaces
CREATE POLICY "Users can view workspaces they have access to"
ON public.workspaces FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Org admins can manage workspaces"
ON public.workspaces FOR ALL
USING (check_user_role(auth.uid(), 'org_admin'));

-- RLS Policies for spaces
CREATE POLICY "Users can view spaces in accessible workspaces"
ON public.spaces FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Space admins and org admins can manage spaces"
ON public.spaces FOR ALL
USING (
  check_user_role(auth.uid(), 'org_admin') OR
  check_user_role(auth.uid(), 'space_admin')
);

-- Update trigger for timestamps
CREATE TRIGGER update_workspaces_updated_at
BEFORE UPDATE ON public.workspaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_spaces_updated_at
BEFORE UPDATE ON public.spaces
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();