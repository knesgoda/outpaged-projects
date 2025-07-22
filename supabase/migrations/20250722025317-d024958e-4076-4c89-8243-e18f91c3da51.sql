
-- First, let's check if user_daily_completions table exists and create it if not
CREATE TABLE IF NOT EXISTS public.user_daily_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id UUID NOT NULL REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completion_data JSONB DEFAULT '{}',
  experience_earned INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  UNIQUE(user_id, challenge_id, DATE(completed_at))
);

-- Enable RLS
ALTER TABLE public.user_daily_completions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own completions" 
  ON public.user_daily_completions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own completions" 
  ON public.user_daily_completions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own completions" 
  ON public.user_daily_completions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create a function to automatically update skill development when tasks are completed
CREATE OR REPLACE FUNCTION public.update_skill_on_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when task status changes to 'done'
  IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
    -- Add experience based on task type and story points
    INSERT INTO public.skill_development (user_id, skill_name, experience_points)
    VALUES (
      COALESCE(NEW.assignee_id, NEW.reporter_id),
      CASE 
        WHEN NEW.task_type = 'bug' THEN 'problem-solving'
        WHEN NEW.task_type = 'feature_request' THEN 'development'
        WHEN NEW.hierarchy_level = 'epic' THEN 'leadership'
        ELSE 'collaboration'
      END,
      COALESCE(NEW.story_points * 10, 25)
    )
    ON CONFLICT (user_id, skill_name) 
    DO UPDATE SET 
      experience_points = skill_development.experience_points + EXCLUDED.experience_points,
      last_activity_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for task completion
DROP TRIGGER IF EXISTS trigger_skill_update_on_task_completion ON public.tasks;
CREATE TRIGGER trigger_skill_update_on_task_completion
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_skill_on_task_completion();

-- Add some sample daily challenges
INSERT INTO public.daily_challenges (title, description, challenge_type, requirements, rewards, difficulty_level, created_by) 
VALUES 
  ('Complete 3 Tasks', 'Complete any 3 tasks today', 'sprint', '{"tasks_required": 3}', '{"points": 100, "experience": 200}', 1, (SELECT user_id FROM public.profiles WHERE is_admin = true LIMIT 1)),
  ('Bug Hunter', 'Fix 2 bugs today', 'completion', '{"bug_tasks_required": 2}', '{"points": 150, "experience": 300}', 2, (SELECT user_id FROM public.profiles WHERE is_admin = true LIMIT 1)),
  ('Team Player', 'Comment on 5 different tasks', 'collaboration', '{"comments_required": 5}', '{"points": 75, "experience": 150}', 1, (SELECT user_id FROM public.profiles WHERE is_admin = true LIMIT 1))
ON CONFLICT DO NOTHING;

-- Add some sample story themes
INSERT INTO public.story_themes (name, category, description, difficulty_level, estimated_duration_days)
VALUES 
  ('Startup Journey', 'business', 'Navigate the challenges of building a startup from idea to launch', 3, 45),
  ('Code Quest', 'technical', 'Master programming skills through epic coding challenges', 4, 60),
  ('Team Builder', 'collaboration', 'Learn to build and lead effective development teams', 2, 30)
ON CONFLICT DO NOTHING;
