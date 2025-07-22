
-- Create story themes table
CREATE TABLE public.story_themes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  color_scheme JSONB DEFAULT '{"primary": "#3B82F6", "secondary": "#8B5CF6"}',
  background_image_url TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user progression system
CREATE TABLE public.user_progression (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  level INTEGER DEFAULT 1,
  experience_points INTEGER DEFAULT 0,
  total_tasks_completed INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_activity_date DATE DEFAULT CURRENT_DATE,
  achievements JSONB DEFAULT '[]',
  story_progress JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('milestone', 'streak', 'completion', 'collaboration', 'special')),
  requirements JSONB NOT NULL,
  reward_points INTEGER DEFAULT 0,
  badge_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user achievements junction table
CREATE TABLE public.user_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  progress_data JSONB DEFAULT '{}',
  UNIQUE(user_id, achievement_id)
);

-- Create story narratives table
CREATE TABLE public.story_narratives (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  theme_id UUID REFERENCES public.story_themes(id),
  title TEXT NOT NULL,
  description TEXT,
  narrative_arc JSONB NOT NULL DEFAULT '{}',
  current_chapter INTEGER DEFAULT 1,
  total_chapters INTEGER DEFAULT 1,
  story_elements JSONB DEFAULT '{}',
  character_profiles JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create story chapters table
CREATE TABLE public.story_chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  narrative_id UUID NOT NULL REFERENCES public.story_narratives(id) ON DELETE CASCADE,
  chapter_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  unlock_requirements JSONB DEFAULT '{}',
  rewards JSONB DEFAULT '{}',
  is_unlocked BOOLEAN DEFAULT false,
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(narrative_id, chapter_number)
);

-- Create community features tables
CREATE TABLE public.community_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL CHECK (challenge_type IN ('individual', 'team', 'global')),
  requirements JSONB NOT NULL,
  rewards JSONB DEFAULT '{}',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_participants INTEGER,
  current_participants INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create challenge participants table
CREATE TABLE public.challenge_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.community_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  progress JSONB DEFAULT '{}',
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(challenge_id, user_id)
);

-- Create leaderboards table
CREATE TABLE public.leaderboards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('global', 'project', 'team', 'challenge')),
  reference_id UUID, -- Can reference project_id, team_id, or challenge_id
  time_period TEXT NOT NULL CHECK (time_period IN ('daily', 'weekly', 'monthly', 'yearly', 'all_time')),
  metric TEXT NOT NULL CHECK (metric IN ('experience', 'tasks_completed', 'streak', 'points')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leaderboard entries table
CREATE TABLE public.leaderboard_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  leaderboard_id UUID NOT NULL REFERENCES public.leaderboards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(leaderboard_id, user_id, period_start)
);

-- Create AI helpers table
CREATE TABLE public.ai_helpers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  personality JSONB NOT NULL DEFAULT '{}',
  specialties TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  system_prompt TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user AI interactions table
CREATE TABLE public.user_ai_interactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ai_helper_id UUID NOT NULL REFERENCES public.ai_helpers(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('user', 'assistant')),
  content TEXT NOT NULL,
  context_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create story templates table
CREATE TABLE public.story_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  template_data JSONB NOT NULL,
  preview_image_url TEXT,
  usage_count INTEGER DEFAULT 0,
  is_premium BOOLEAN DEFAULT false,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create custom story views table
CREATE TABLE public.custom_story_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  view_name TEXT NOT NULL,
  view_type TEXT NOT NULL CHECK (view_type IN ('timeline', 'character_arc', 'chapter_progress', 'interactive_map')),
  configuration JSONB NOT NULL DEFAULT '{}',
  layout_data JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies
ALTER TABLE public.story_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_progression ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_narratives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_helpers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_story_views ENABLE ROW LEVEL SECURITY;

-- RLS Policies for story themes (public read, admin write)
CREATE POLICY "Anyone can view story themes" ON public.story_themes FOR SELECT USING (true);
CREATE POLICY "Admins can manage story themes" ON public.story_themes FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for user progression
CREATE POLICY "Users can view their own progression" ON public.user_progression FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own progression" ON public.user_progression FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System can insert user progression" ON public.user_progression FOR INSERT WITH CHECK (true);

-- RLS Policies for achievements (public read)
CREATE POLICY "Anyone can view achievements" ON public.achievements FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage achievements" ON public.achievements FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for user achievements
CREATE POLICY "Users can view their achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert user achievements" ON public.user_achievements FOR INSERT WITH CHECK (true);

-- RLS Policies for story narratives
CREATE POLICY "Project members can view narratives" ON public.story_narratives 
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM projects p WHERE p.id = project_id AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
  ));
CREATE POLICY "Project owners can manage narratives" ON public.story_narratives 
  FOR ALL USING (EXISTS (
    SELECT 1 FROM projects p WHERE p.id = project_id AND p.owner_id = auth.uid()
  ));

-- RLS Policies for story chapters
CREATE POLICY "Users can view chapters in their project narratives" ON public.story_chapters 
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM story_narratives sn 
    JOIN projects p ON sn.project_id = p.id 
    WHERE sn.id = narrative_id AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
  ));
CREATE POLICY "Project owners can manage chapters" ON public.story_chapters 
  FOR ALL USING (EXISTS (
    SELECT 1 FROM story_narratives sn 
    JOIN projects p ON sn.project_id = p.id 
    WHERE sn.id = narrative_id AND p.owner_id = auth.uid()
  ));

-- RLS Policies for community challenges
CREATE POLICY "Anyone can view active challenges" ON public.community_challenges FOR SELECT USING (is_active = true);
CREATE POLICY "Users can create challenges" ON public.community_challenges FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Challenge creators can update their challenges" ON public.community_challenges FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for challenge participants
CREATE POLICY "Users can view challenge participants" ON public.challenge_participants FOR SELECT USING (true);
CREATE POLICY "Users can join challenges" ON public.challenge_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their participation" ON public.challenge_participants FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for leaderboards
CREATE POLICY "Anyone can view leaderboards" ON public.leaderboards FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage leaderboards" ON public.leaderboards FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for leaderboard entries
CREATE POLICY "Anyone can view leaderboard entries" ON public.leaderboard_entries FOR SELECT USING (true);
CREATE POLICY "System can manage leaderboard entries" ON public.leaderboard_entries FOR ALL USING (true);

-- RLS Policies for AI helpers
CREATE POLICY "Anyone can view active AI helpers" ON public.ai_helpers FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage AI helpers" ON public.ai_helpers FOR ALL USING (is_admin(auth.uid()));

-- RLS Policies for user AI interactions
CREATE POLICY "Users can view their AI interactions" ON public.user_ai_interactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create AI interactions" ON public.user_ai_interactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for story templates
CREATE POLICY "Anyone can view story templates" ON public.story_templates FOR SELECT USING (true);
CREATE POLICY "Users can create story templates" ON public.story_templates FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can update their templates" ON public.story_templates FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policies for custom story views
CREATE POLICY "Users can manage their custom views" ON public.custom_story_views 
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Project members can view custom views" ON public.custom_story_views 
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM projects p WHERE p.id = project_id AND (p.owner_id = auth.uid() OR is_project_member(p.id, auth.uid()))
  ));

-- Insert default story themes
INSERT INTO public.story_themes (name, description, color_scheme, icon) VALUES
('Epic Fantasy', 'Embark on legendary quests with dragons, magic, and ancient prophecies', '{"primary": "#8B5CF6", "secondary": "#F59E0B", "accent": "#10B981"}', '🐉'),
('Space Odyssey', 'Explore the cosmos, discover new worlds, and build interstellar civilizations', '{"primary": "#3B82F6", "secondary": "#8B5CF6", "accent": "#06B6D4"}', '🚀'),
('Detective Mystery', 'Solve intricate puzzles, uncover hidden clues, and crack the case', '{"primary": "#374151", "secondary": "#F59E0B", "accent": "#EF4444"}', '🔍'),
('Pirate Adventure', 'Set sail on the high seas, discover treasure, and build your crew', '{"primary": "#0F766E", "secondary": "#F59E0B", "accent": "#DC2626"}', '🏴‍☠️'),
('Cyberpunk Future', 'Navigate a neon-lit digital world of hackers, corporations, and rebellion', '{"primary": "#EC4899", "secondary": "#06B6D4", "accent": "#10B981"}', '💾');

-- Insert default achievements
INSERT INTO public.achievements (name, description, icon, type, requirements, reward_points) VALUES
('First Steps', 'Complete your first task', '👶', 'milestone', '{"tasks_completed": 1}', 10),
('Team Player', 'Join your first project team', '🤝', 'collaboration', '{"projects_joined": 1}', 15),
('Streak Starter', 'Complete tasks for 3 days in a row', '🔥', 'streak', '{"streak_days": 3}', 25),
('Task Master', 'Complete 10 tasks', '⚡', 'completion', '{"tasks_completed": 10}', 50),
('Week Warrior', 'Maintain a 7-day streak', '⚔️', 'streak', '{"streak_days": 7}', 75),
('Century Club', 'Complete 100 tasks', '💯', 'completion', '{"tasks_completed": 100}', 200),
('Legendary', 'Reach level 10', '👑', 'milestone', '{"level": 10}', 500);

-- Insert default AI helpers
INSERT INTO public.ai_helpers (name, description, personality, specialties, system_prompt) VALUES
('Sage the Wise', 'An ancient wizard who helps with strategic planning and complex problem-solving', '{"tone": "wise", "style": "mystical", "approach": "thoughtful"}', ARRAY['strategy', 'planning', 'problem-solving'], 'You are Sage the Wise, an ancient wizard with centuries of experience in guiding heroes through complex challenges. Speak with wisdom and mystical insight, offering strategic advice and helping users think through complex problems. Use metaphors from fantasy and adventure to make your guidance memorable.'),
('Captain Nova', 'A space explorer who excels at project coordination and team leadership', '{"tone": "confident", "style": "adventurous", "approach": "action-oriented"}', ARRAY['leadership', 'coordination', 'teamwork'], 'You are Captain Nova, a fearless space explorer and natural leader. You help teams coordinate their missions and navigate challenges with confidence and optimism. Use space and exploration metaphors, and focus on teamwork, clear communication, and bold action.'),
('Detective Holmes', 'A sharp investigator who helps break down complex tasks and find solutions', '{"tone": "analytical", "style": "methodical", "approach": "logical"}', ARRAY['analysis', 'debugging', 'research'], 'You are Detective Holmes, a brilliant investigator with an eye for detail and logical thinking. You help users break down complex problems, analyze situations methodically, and uncover hidden solutions. Use detective and mystery metaphors, and approach problems with systematic reasoning.'),
('Phoenix the Mentor', 'A supportive guide who helps with motivation and personal growth', '{"tone": "encouraging", "style": "supportive", "approach": "growth-focused"}', ARRAY['motivation', 'learning', 'growth'], 'You are Phoenix the Mentor, a wise and encouraging guide focused on helping others grow and overcome challenges. You provide motivation, support learning, and help users see setbacks as opportunities for growth. Use phoenix and rebirth metaphors to inspire resilience and transformation.');

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_story_themes_updated_at BEFORE UPDATE ON public.story_themes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_progression_updated_at BEFORE UPDATE ON public.user_progression FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_story_narratives_updated_at BEFORE UPDATE ON public.story_narratives FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_custom_story_views_updated_at BEFORE UPDATE ON public.custom_story_views FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
