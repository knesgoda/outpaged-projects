-- Add status_keys column to kanban_columns for many-to-one mapping
ALTER TABLE public.kanban_columns
  ADD COLUMN IF NOT EXISTS status_keys TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add metadata column for additional column configuration
ALTER TABLE public.kanban_columns
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create index for status_keys lookups
CREATE INDEX IF NOT EXISTS idx_kanban_columns_status_keys ON public.kanban_columns USING GIN(status_keys);