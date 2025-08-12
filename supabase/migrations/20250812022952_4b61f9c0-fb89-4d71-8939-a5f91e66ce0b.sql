-- Enable realtime and full row data for notifications table
DO $$ BEGIN
  -- Ensure table exists before altering (will raise exception if not); ignore if it doesn't exist
  PERFORM 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'notifications';
  IF FOUND THEN
    -- Ensure updates send full row for realtime
    EXECUTE 'ALTER TABLE public.notifications REPLICA IDENTITY FULL';
    -- Add to realtime publication if not already present
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
    END IF;
  END IF;
END $$;