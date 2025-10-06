-- 20251005060060_saved_searches.sql
DO $$
BEGIN
  IF to_regclass('public.saved_searches') IS NULL THEN
    CREATE TABLE public.saved_searches (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      name text NOT NULL,
      query text NOT NULL,
      filters jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
    CREATE POLICY saved_searches_self_rw ON public.saved_searches
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
    CREATE INDEX IF NOT EXISTS saved_searches_user_idx
      ON public.saved_searches(user_id, created_at DESC);
  ELSE
    ALTER TABLE public.saved_searches
      ADD COLUMN IF NOT EXISTS name text NOT NULL,
      ADD COLUMN IF NOT EXISTS query text NOT NULL,
      ADD COLUMN IF NOT EXISTS filters jsonb NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
      ADD COLUMN IF NOT EXISTS user_id uuid;
    IF NOT EXISTS (
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname = 'saved_searches_user_idx'
    ) THEN
      CREATE INDEX saved_searches_user_idx
        ON public.saved_searches(user_id, created_at DESC);
    END IF;
    BEGIN
      ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      CREATE POLICY saved_searches_self_rw ON public.saved_searches
        FOR ALL TO authenticated
        USING (user_id = auth.uid())
        WITH CHECK (user_id = auth.uid());
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END$$;
