
-- Create enums for various types
CREATE TYPE story_theme_category AS ENUM ('fantasy', 'sci_fi', 'adventure', 'mystery', 'corporate', 'space', 'medieval');
CREATE TYPE achievement_type AS ENUM ('milestone', 'streak', 'completion', 'collaboration', 'leadership', 'innovation');
CREATE TYPE challenge_type AS ENUM ('sprint', 'milestone', 'collaboration', 'innovation', 'completion');
CREATE TYPE leaderboard_type AS ENUM ('global', 'project', 'team', 'challenge');
CREATE TYPE ai_helper_personality AS ENUM ('mentor', 'cheerleader', 'analyst', 'creative', 'technical');

-- Update story themes table
ALTER TABLE story_themes 
ADD COLUMN IF NOT EXISTS category story_theme_category DEFAULT 'fantasy',
ADD COLUMN IF NOT EXISTS difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS estimated_duration_days INTEGER DEFAULT 30;

-- Update story narratives table  
ALTER TABLE story_narratives
ADD COLUMN IF NOT EXISTS difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS estimated_completion_time INTEGER DEFAULT 2160, -- 36 hours in minutes
ADD COLUMN IF NOT EXISTS completion_percentage DECIMAL(5,2) DEFAULT 0.00;

-- Update story chapters table
ALTER TABLE story_chapters
ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS prerequisite_chapters UUID[],
ADD COLUMN IF NOT EXISTS experience_reward INTEGER DEFAULT 100;

-- Update achievements table
ALTER TABLE achievements
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS is_secret BOOLEAN DEFAULT FALSE;

-- Update AI helpers table
ALTER TABLE ai_helpers
ADD COLUMN IF NOT EXISTS personality_type ai_helper_personality DEFAULT 'mentor',
ADD COLUMN IF NOT EXISTS interaction_style JSONB DEFAULT '{"tone": "friendly", "formality": "casual"}',
ADD COLUMN IF NOT EXISTS expertise_areas TEXT[] DEFAULT '{}';

-- Update community challenges table
ALTER TABLE community_challenges
ADD COLUMN IF NOT EXISTS difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
ADD COLUMN IF NOT EXISTS experience_reward INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS badge_reward TEXT;

-- Update leaderboards table
ALTER TABLE leaderboards
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS filters JSONB DEFAULT '{}';

-- Update user progression table
ALTER TABLE user_progression
ADD COLUMN IF NOT EXISTS current_narrative_id UUID REFERENCES story_narratives(id),
ADD COLUMN IF NOT EXISTS active_challenges UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS preferred_themes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS skill_points JSONB DEFAULT '{"leadership": 0, "collaboration": 0, "innovation": 0, "efficiency": 0}';

-- Create story progression tracking table
CREATE TABLE IF NOT EXISTS story_progression (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    narrative_id UUID NOT NULL REFERENCES story_narratives(id) ON DELETE CASCADE,
    current_chapter_id UUID REFERENCES story_chapters(id),
    chapters_completed UUID[] DEFAULT '{}',
    choices_made JSONB DEFAULT '{}',
    custom_variables JSONB DEFAULT '{}',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completion_percentage DECIMAL(5,2) DEFAULT 0.00,
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, narrative_id)
);

-- Enable RLS on story progression
ALTER TABLE story_progression ENABLE ROW LEVEL SECURITY;

-- Create policies for story progression
CREATE POLICY "Users can view their own story progression" 
    ON story_progression FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own story progression" 
    ON story_progression FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own story progression" 
    ON story_progression FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Create daily challenges table
CREATE TABLE IF NOT EXISTS daily_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    challenge_type challenge_type NOT NULL,
    requirements JSONB NOT NULL,
    rewards JSONB DEFAULT '{"experience": 100, "points": 50}',
    difficulty_level INTEGER DEFAULT 1 CHECK (difficulty_level BETWEEN 1 AND 5),
    active_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '1 day'),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID NOT NULL
);

-- Enable RLS on daily challenges
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;

-- Create policies for daily challenges
CREATE POLICY "Anyone can view active daily challenges" 
    ON daily_challenges FOR SELECT 
    USING (is_active = TRUE AND expires_at > now());

CREATE POLICY "Admins can manage daily challenges" 
    ON daily_challenges FOR ALL 
    USING (is_admin(auth.uid()));

-- Create user daily challenge completions table
CREATE TABLE IF NOT EXISTS user_daily_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    challenge_id UUID NOT NULL REFERENCES daily_challenges(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    completion_data JSONB DEFAULT '{}',
    experience_earned INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    UNIQUE(user_id, challenge_id)
);

-- Enable RLS on user daily completions
ALTER TABLE user_daily_completions ENABLE ROW LEVEL SECURITY;

-- Create policies for user daily completions
CREATE POLICY "Users can view their own daily completions" 
    ON user_daily_completions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily completions" 
    ON user_daily_completions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Create skill development table
CREATE TABLE IF NOT EXISTS skill_development (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    skill_name TEXT NOT NULL,
    current_level INTEGER DEFAULT 1 CHECK (current_level >= 1),
    experience_points INTEGER DEFAULT 0 CHECK (experience_points >= 0),
    milestones_achieved TEXT[] DEFAULT '{}',
    last_activity_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, skill_name)
);

-- Enable RLS on skill development
ALTER TABLE skill_development ENABLE ROW LEVEL SECURITY;

-- Create policies for skill development
CREATE POLICY "Users can view their own skill development" 
    ON skill_development FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own skill development" 
    ON skill_development FOR ALL 
    USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_story_progression_user_narrative ON story_progression(user_id, narrative_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_active_date ON daily_challenges(active_date, is_active);
CREATE INDEX IF NOT EXISTS idx_user_daily_completions_user_date ON user_daily_completions(user_id, completed_at);
CREATE INDEX IF NOT EXISTS idx_skill_development_user_skill ON skill_development(user_id, skill_name);

-- Create trigger to update story progression percentage
CREATE OR REPLACE FUNCTION update_story_progression_percentage()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate completion percentage based on completed chapters
    UPDATE story_progression 
    SET completion_percentage = (
        SELECT ROUND(
            (array_length(NEW.chapters_completed, 1)::DECIMAL / 
             GREATEST(
                 (SELECT COUNT(*) FROM story_chapters WHERE narrative_id = NEW.narrative_id), 
                 1
             )) * 100, 
            2
        )
    ),
    last_activity_at = now(),
    is_completed = (
        array_length(NEW.chapters_completed, 1) >= 
        (SELECT COUNT(*) FROM story_chapters WHERE narrative_id = NEW.narrative_id)
    ),
    completed_at = CASE 
        WHEN (array_length(NEW.chapters_completed, 1) >= 
              (SELECT COUNT(*) FROM story_chapters WHERE narrative_id = NEW.narrative_id))
             AND NEW.completed_at IS NULL
        THEN now()
        ELSE NEW.completed_at
    END
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_story_progression ON story_progression;
CREATE TRIGGER trigger_update_story_progression
    AFTER UPDATE ON story_progression
    FOR EACH ROW
    WHEN (OLD.chapters_completed IS DISTINCT FROM NEW.chapters_completed)
    EXECUTE FUNCTION update_story_progression_percentage();
