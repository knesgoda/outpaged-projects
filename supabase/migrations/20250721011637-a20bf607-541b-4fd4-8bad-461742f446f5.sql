-- Create time_entries table for tracking time spent on tasks
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL,
  user_id UUID NOT NULL,
  description TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER GENERATED ALWAYS AS (
    CASE 
      WHEN ended_at IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
      ELSE NULL
    END
  ) STORED,
  is_running BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for time entries
CREATE POLICY "Users can view time entries for tasks they can access" 
ON public.time_entries 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN project_members pm ON p.id = pm.project_id
    WHERE t.id = time_entries.task_id 
    AND (p.owner_id = auth.uid() OR pm.user_id = auth.uid())
  )
);

CREATE POLICY "Users can create time entries for accessible tasks" 
ON public.time_entries 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    LEFT JOIN project_members pm ON p.id = pm.project_id
    WHERE t.id = time_entries.task_id 
    AND (p.owner_id = auth.uid() OR pm.user_id = auth.uid())
  )
);

CREATE POLICY "Users can update their own time entries" 
ON public.time_entries 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time entries" 
ON public.time_entries 
FOR DELETE 
USING (auth.uid() = user_id);

-- Admins can manage all time entries
CREATE POLICY "Admins can manage all time entries" 
ON public.time_entries 
FOR ALL 
USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_time_entries_updated_at
  BEFORE UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure only one running timer per user
CREATE UNIQUE INDEX idx_time_entries_running_user 
ON public.time_entries (user_id) 
WHERE is_running = TRUE;

-- Create index for performance
CREATE INDEX idx_time_entries_task_user ON public.time_entries (task_id, user_id);
CREATE INDEX idx_time_entries_user_date ON public.time_entries (user_id, started_at);

-- Create a function to stop running timers before starting a new one
CREATE OR REPLACE FUNCTION public.stop_running_timer_before_start()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_running = TRUE THEN
    -- Stop any currently running timers for this user
    UPDATE public.time_entries 
    SET is_running = FALSE, 
        ended_at = NOW(),
        updated_at = NOW()
    WHERE user_id = NEW.user_id 
    AND is_running = TRUE 
    AND id != COALESCE(NEW.id, gen_random_uuid());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically stop running timers
CREATE TRIGGER stop_running_timer_before_start_trigger
  BEFORE INSERT OR UPDATE ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.stop_running_timer_before_start();