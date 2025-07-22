import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface SkillDevelopment {
  id: string;
  user_id: string;
  skill_name: string;
  current_level: number;
  experience_points: number;
  milestones_achieved: string[];
  last_activity_at: string;
  created_at: string;
}

export const useSkillDevelopment = () => {
  const [skills, setSkills] = useState<SkillDevelopment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserSkills();
  }, []);

  const fetchUserSkills = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('skill_development')
        .select('*')
        .order('experience_points', { ascending: false });

      if (error) throw error;
      setSkills(data || []);
    } catch (error) {
      console.error('Error fetching skills:', error);
      toast({
        title: "Error",
        description: "Failed to load skill development",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addExperience = async (skillName: string, experience: number) => {
    try {
      // Check if skill exists
      let skill = skills.find(s => s.skill_name === skillName);
      
      if (skill) {
        // Update existing skill
        const newExperience = skill.experience_points + experience;
        const newLevel = calculateLevel(newExperience);
        const leveledUp = newLevel > skill.current_level;

        const { data, error } = await supabase
          .from('skill_development')
          .update({
            experience_points: newExperience,
            current_level: newLevel,
            last_activity_at: new Date().toISOString(),
          })
          .eq('id', skill.id)
          .select()
          .single();

        if (error) throw error;

        setSkills(prev => prev.map(s => s.id === skill!.id ? data : s));

        if (leveledUp) {
          toast({
            title: "Level Up!",
            description: `${skillName} is now level ${newLevel}!`,
          });
        }

        return data;
      } else {
        // Create new skill
        const level = calculateLevel(experience);
        const { data, error } = await supabase
          .from('skill_development')
          .insert({
            skill_name: skillName,
            experience_points: experience,
            current_level: level,
          } as any)
          .select()
          .single();

        if (error) throw error;

        setSkills(prev => [...prev, data]);
        return data;
      }
    } catch (error) {
      console.error('Error adding experience:', error);
      toast({
        title: "Error",
        description: "Failed to update skill experience",
        variant: "destructive",
      });
      return null;
    }
  };

  const addMilestone = async (skillName: string, milestone: string) => {
    try {
      const skill = skills.find(s => s.skill_name === skillName);
      if (!skill) return null;

      const updatedMilestones = [...skill.milestones_achieved];
      if (!updatedMilestones.includes(milestone)) {
        updatedMilestones.push(milestone);
      }

      const { data, error } = await supabase
        .from('skill_development')
        .update({
          milestones_achieved: updatedMilestones,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', skill.id)
        .select()
        .single();

      if (error) throw error;

      setSkills(prev => prev.map(s => s.id === skill.id ? data : s));

      toast({
        title: "Milestone Achieved!",
        description: `${milestone} in ${skillName}`,
      });

      return data;
    } catch (error) {
      console.error('Error adding milestone:', error);
      return null;
    }
  };

  const calculateLevel = (experience: number): number => {
    // Each level requires 100 * level XP
    // Level 1: 0-99, Level 2: 100-299, Level 3: 300-599, etc.
    let level = 1;
    let requiredExp = 100;
    let totalRequired = 0;

    while (experience >= totalRequired + requiredExp) {
      totalRequired += requiredExp;
      level++;
      requiredExp = 100 * level;
    }

    return level;
  };

  const getExperienceForNextLevel = (skill: SkillDevelopment): number => {
    const nextLevel = skill.current_level + 1;
    const requiredForNextLevel = 100 * nextLevel;
    let totalRequiredForCurrentLevel = 0;
    
    for (let i = 1; i < skill.current_level; i++) {
      totalRequiredForCurrentLevel += 100 * i;
    }

    return totalRequiredForCurrentLevel + requiredForNextLevel - skill.experience_points;
  };

  const getProgressToNextLevel = (skill: SkillDevelopment): number => {
    const experienceForCurrentLevel = skill.experience_points;
    let totalRequiredForCurrentLevel = 0;
    
    for (let i = 1; i < skill.current_level; i++) {
      totalRequiredForCurrentLevel += 100 * i;
    }

    const experienceInCurrentLevel = experienceForCurrentLevel - totalRequiredForCurrentLevel;
    const requiredForNextLevel = 100 * skill.current_level;
    
    return Math.min((experienceInCurrentLevel / requiredForNextLevel) * 100, 100);
  };

  return {
    skills,
    loading,
    addExperience,
    addMilestone,
    getExperienceForNextLevel,
    getProgressToNextLevel,
    refetch: fetchUserSkills,
  };
};