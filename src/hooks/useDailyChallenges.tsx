import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  challenge_type: 'sprint' | 'milestone' | 'collaboration' | 'innovation' | 'completion';
  requirements: any;
  rewards: any;
  difficulty_level: number;
  active_date: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  created_by: string;
}

export interface DailyChallengeCompletion {
  id: string;
  user_id: string;
  challenge_id: string;
  completed_at: string;
  completion_data: any;
  experience_earned: number;
  points_earned: number;
}

export const useDailyChallenges = () => {
  const [challenges, setChallenges] = useState<DailyChallenge[]>([]);
  const [completions, setCompletions] = useState<DailyChallengeCompletion[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTodaysChallenges();
    fetchUserCompletions();
  }, []);

  const fetchTodaysChallenges = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_challenges')
        .select('*')
        .eq('is_active', true)
        .gte('expires_at', new Date().toISOString())
        .order('difficulty_level', { ascending: true });

      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error('Error fetching daily challenges:', error);
      toast({
        title: "Error",
        description: "Failed to load daily challenges",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserCompletions = async () => {
    try {
      const { data, error } = await supabase
        .from('user_daily_completions')
        .select('*')
        .gte('completed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('completed_at', { ascending: false });

      if (error) throw error;
      setCompletions(data || []);
    } catch (error) {
      console.error('Error fetching user completions:', error);
    }
  };

  const completeChallenge = async (
    challengeId: string,
    completionData: Record<string, any> = {}
  ) => {
    try {
      const challenge = challenges.find(c => c.id === challengeId);
      if (!challenge) throw new Error('Challenge not found');

      const { data, error } = await supabase
        .from('user_daily_completions')
        .insert({
          challenge_id: challengeId,
          completion_data: completionData,
          experience_earned: challenge.rewards?.experience || 0,
          points_earned: challenge.rewards?.points || 0,
        } as any)
        .select()
        .single();

      if (error) throw error;
      
      setCompletions(prev => [data, ...prev]);
      
      toast({
        title: "Challenge Completed!",
        description: `You earned ${data.experience_earned} XP and ${data.points_earned} points!`,
      });

      return data;
    } catch (error) {
      console.error('Error completing challenge:', error);
      toast({
        title: "Error",
        description: "Failed to complete challenge",
        variant: "destructive",
      });
      return null;
    }
  };

  const isChallengeCompleted = (challengeId: string) => {
    return completions.some(completion => 
      completion.challenge_id === challengeId &&
      new Date(completion.completed_at).toDateString() === new Date().toDateString()
    );
  };

  const getTodaysCompletions = () => {
    const today = new Date().toDateString();
    return completions.filter(completion => 
      new Date(completion.completed_at).toDateString() === today
    );
  };

  return {
    challenges,
    completions,
    loading,
    completeChallenge,
    isChallengeCompleted,
    getTodaysCompletions,
    refetch: () => {
      fetchTodaysChallenges();
      fetchUserCompletions();
    },
  };
};