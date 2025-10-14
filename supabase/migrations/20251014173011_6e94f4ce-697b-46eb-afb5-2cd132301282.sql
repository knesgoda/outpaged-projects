-- Migrate comments table to support multiple entity types
-- First, add new columns without dropping existing ones to preserve data
ALTER TABLE public.comments 
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id uuid,
  ADD COLUMN IF NOT EXISTS author uuid,
  ADD COLUMN IF NOT EXISTS parent_id uuid,
  ADD COLUMN IF NOT EXISTS body_markdown text,
  ADD COLUMN IF NOT EXISTS body_html text,
  ADD COLUMN IF NOT EXISTS body_json jsonb,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz,
  ADD COLUMN IF NOT EXISTS edited_by uuid;

-- Migrate existing data
UPDATE public.comments 
SET 
  entity_type = 'task',
  entity_id = task_id,
  author = author_id,
  body_markdown = content,
  body_html = content
WHERE entity_type IS NULL;

-- Now make required columns NOT NULL
ALTER TABLE public.comments 
  ALTER COLUMN entity_type SET NOT NULL,
  ALTER COLUMN entity_id SET NOT NULL,
  ALTER COLUMN author SET NOT NULL,
  ALTER COLUMN body_markdown SET NOT NULL;

-- Create comment mentions table
CREATE TABLE IF NOT EXISTS public.comment_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  mentioned_user uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, mentioned_user)
);

-- Create comment cross-references (backlinks) table
CREATE TABLE IF NOT EXISTS public.comment_backlinks (
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  context text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, target_type, target_id)
);

-- Create comment reactions table
CREATE TABLE IF NOT EXISTS public.comment_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id, emoji)
);

-- Create comment history table for edit tracking
CREATE TABLE IF NOT EXISTS public.comment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  body_markdown text NOT NULL,
  body_html text,
  body_json jsonb,
  edited_at timestamptz NOT NULL DEFAULT now(),
  edited_by uuid
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_entity ON public.comments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON public.comments(author);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comment_mentions_user ON public.comment_mentions(mentioned_user);
CREATE INDEX IF NOT EXISTS idx_comment_backlinks_target ON public.comment_backlinks(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_comment_reactions_comment ON public.comment_reactions(comment_id);

-- Enable RLS on new tables
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_backlinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for comment_mentions
CREATE POLICY "Users can view mentions in accessible comments"
  ON public.comment_mentions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.comments c
      WHERE c.id = comment_mentions.comment_id
      AND (
        (c.entity_type = 'task' AND EXISTS (
          SELECT 1 FROM tasks t WHERE t.id = c.entity_id AND is_project_member(t.project_id, auth.uid())
        ))
        OR (c.entity_type = 'project' AND is_project_member(c.entity_id::uuid, auth.uid()))
        OR c.author = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage mentions in their comments"
  ON public.comment_mentions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.comments c
      WHERE c.id = comment_mentions.comment_id AND c.author = auth.uid()
    )
  );

-- RLS policies for comment_backlinks
CREATE POLICY "Users can view backlinks in accessible comments"
  ON public.comment_backlinks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.comments c
      WHERE c.id = comment_backlinks.comment_id
      AND (
        (c.entity_type = 'task' AND EXISTS (
          SELECT 1 FROM tasks t WHERE t.id = c.entity_id AND is_project_member(t.project_id, auth.uid())
        ))
        OR (c.entity_type = 'project' AND is_project_member(c.entity_id::uuid, auth.uid()))
        OR c.author = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage backlinks in their comments"
  ON public.comment_backlinks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.comments c
      WHERE c.id = comment_backlinks.comment_id AND c.author = auth.uid()
    )
  );

-- RLS policies for comment_reactions
CREATE POLICY "Users can view reactions on accessible comments"
  ON public.comment_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.comments c
      WHERE c.id = comment_reactions.comment_id
      AND (
        (c.entity_type = 'task' AND EXISTS (
          SELECT 1 FROM tasks t WHERE t.id = c.entity_id AND is_project_member(t.project_id, auth.uid())
        ))
        OR (c.entity_type = 'project' AND is_project_member(c.entity_id::uuid, auth.uid()))
        OR c.author = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their own reactions"
  ON public.comment_reactions FOR ALL
  USING (user_id = auth.uid());

-- RLS policies for comment_history
CREATE POLICY "Users can view history of accessible comments"
  ON public.comment_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.comments c
      WHERE c.id = comment_history.comment_id
      AND (
        (c.entity_type = 'task' AND EXISTS (
          SELECT 1 FROM tasks t WHERE t.id = c.entity_id AND is_project_member(t.project_id, auth.uid())
        ))
        OR (c.entity_type = 'project' AND is_project_member(c.entity_id::uuid, auth.uid()))
        OR c.author = auth.uid()
      )
    )
  );