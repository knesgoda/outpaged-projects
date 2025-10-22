-- Create boards table
CREATE TABLE IF NOT EXISTS boards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'container', -- 'container', 'query', or 'hybrid'
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  space_id uuid,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  icon text,
  color text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  archived_at timestamptz,
  settings jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on boards
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

-- Board RLS policies
CREATE POLICY "Users can view boards in their projects"
  ON boards FOR SELECT
  USING (
    project_id IS NULL OR
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = boards.project_id
      AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

CREATE POLICY "Users can manage boards in their projects"
  ON boards FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = boards.project_id
      AND p.owner_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all boards"
  ON boards FOR ALL
  USING (is_admin(auth.uid()));

-- Create board_views table
CREATE TABLE IF NOT EXISTS board_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id uuid REFERENCES boards(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  view_mode text NOT NULL DEFAULT 'table', -- 'table', 'kanban', 'timeline', 'calendar', 'master'
  is_default boolean DEFAULT false,
  position integer DEFAULT 0,
  configuration jsonb DEFAULT '{}'::jsonb,
  filter_expression jsonb DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on board_views
ALTER TABLE board_views ENABLE ROW LEVEL SECURITY;

-- Board views RLS policies
CREATE POLICY "Users can view board views"
  ON board_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      LEFT JOIN projects p ON b.project_id = p.id
      WHERE b.id = board_views.board_id
      AND (b.project_id IS NULL OR p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
    )
  );

CREATE POLICY "Users can manage board views in their projects"
  ON board_views FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM boards b
      JOIN projects p ON b.project_id = p.id
      WHERE b.id = board_views.board_id
      AND p.owner_id = auth.uid()
    )
  );

-- Add board integration columns to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS default_board_id uuid,
ADD COLUMN IF NOT EXISTS board_settings jsonb DEFAULT '{
  "defaultViewMode": "kanban",
  "enabledViews": ["kanban", "table", "timeline", "calendar", "gantt"]
}'::jsonb;

-- Add foreign key after boards table exists
ALTER TABLE projects
ADD CONSTRAINT fk_projects_default_board
FOREIGN KEY (default_board_id) REFERENCES boards(id) ON DELETE SET NULL;

-- Create user project view preferences table
CREATE TABLE IF NOT EXISTS user_project_view_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  default_view_mode text DEFAULT 'kanban',
  view_settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- Enable RLS
ALTER TABLE user_project_view_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_project_view_preferences
CREATE POLICY "Users can manage their own view preferences"
  ON user_project_view_preferences
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_boards_project_id ON boards(project_id);
CREATE INDEX IF NOT EXISTS idx_boards_workspace_id ON boards(workspace_id);
CREATE INDEX IF NOT EXISTS idx_board_views_board_id ON board_views(board_id);
CREATE INDEX IF NOT EXISTS idx_user_project_view_prefs ON user_project_view_preferences(user_id, project_id);

-- Create function to auto-create board for new projects
CREATE OR REPLACE FUNCTION create_default_board_for_project()
RETURNS TRIGGER AS $$
DECLARE
  new_board_id uuid;
  new_view_id uuid;
BEGIN
  -- Create a default board for the project
  INSERT INTO boards (name, description, type, project_id, workspace_id, created_by)
  VALUES (
    NEW.name || ' Board',
    'Default board for ' || NEW.name,
    'container',
    NEW.id,
    NEW.workspace_id,
    NEW.owner_id
  )
  RETURNING id INTO new_board_id;

  -- Create default Kanban view
  INSERT INTO board_views (board_id, name, view_mode, is_default, position, created_by)
  VALUES (new_board_id, 'Kanban', 'kanban', true, 0, NEW.owner_id)
  RETURNING id INTO new_view_id;

  -- Create Table view
  INSERT INTO board_views (board_id, name, view_mode, is_default, position, created_by)
  VALUES (new_board_id, 'Table', 'table', false, 1, NEW.owner_id);

  -- Create Timeline view
  INSERT INTO board_views (board_id, name, view_mode, is_default, position, created_by)
  VALUES (new_board_id, 'Timeline', 'timeline', false, 2, NEW.owner_id);

  -- Update project with default board
  UPDATE projects SET default_board_id = new_board_id WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to auto-create board for new projects
DROP TRIGGER IF EXISTS trigger_create_default_board ON projects;
CREATE TRIGGER trigger_create_default_board
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION create_default_board_for_project();