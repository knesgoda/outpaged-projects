-- 20251005060050_search_profiles.sql
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    ALTER TABLE public.profiles DROP COLUMN IF EXISTS search;
    DROP TRIGGER IF EXISTS trg_profiles_tsv ON public.profiles;
    DROP FUNCTION IF EXISTS public.profiles_tsv_update();
    PERFORM search_private.register_source('public.profiles', 'user', 'id', 'workspace_id');
  END IF;
END $$;
