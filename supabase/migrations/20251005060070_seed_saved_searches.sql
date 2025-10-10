-- 20251005060070_seed_saved_searches.sql
DO $$
DECLARE
  seed_user uuid;
BEGIN
  SELECT id
  INTO seed_user
  FROM auth.users
  ORDER BY created_at
  LIMIT 1;

  IF seed_user IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.saved_searches
    WHERE user_id = seed_user
      AND name = 'My open tasks'
  ) THEN
    INSERT INTO public.saved_searches (user_id, name, query, filters)
    VALUES (
      seed_user,
      'My open tasks',
      'status:open assignee:me',
      '{"type":"task"}'::jsonb
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.saved_searches
    WHERE user_id = seed_user
      AND name = 'Product docs'
  ) THEN
    INSERT INTO public.saved_searches (user_id, name, query, filters)
    VALUES (
      seed_user,
      'Product docs',
      'product spec',
      '{"type":"doc"}'::jsonb
    );
  END IF;
END $$;
