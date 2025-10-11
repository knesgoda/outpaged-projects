-- Add advanced column metadata support
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'kanban_column_type') THEN
    CREATE TYPE kanban_column_type AS ENUM (
      'status',
      'assignee',
      'dependency',
      'formula',
      'rollup',
      'mirror',
      'connect'
    );
  END IF;
END
$$;

ALTER TABLE public.kanban_columns
  ADD COLUMN IF NOT EXISTS column_type kanban_column_type NOT NULL DEFAULT 'status';

ALTER TABLE public.kanban_columns
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE public.kanban_columns
SET column_type = 'status'
WHERE column_type IS NULL;

ALTER TABLE public.kanban_columns
  ALTER COLUMN column_type DROP DEFAULT;
