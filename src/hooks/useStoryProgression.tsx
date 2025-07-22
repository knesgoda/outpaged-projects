import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface StoryProgression {
  id: string;
  user_id: string;
  narrative_id: string;
  current_chapter_id: string | null;
  chapters_completed: string[];
  choices_made: any;
  custom_variables: any;
  started_at: string;
  last_activity_at: string;
  completion_percentage: number;
  is_completed: boolean;
  completed_at: string | null;
}

export const useStoryProgression = (narrativeId?: string) => {
  const [progression, setProgression] = useState<StoryProgression | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (narrativeId) {
      fetchProgression(narrativeId);
    }
  }, [narrativeId]);

  const fetchProgression = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('story_progression')
        .select('*')
        .eq('narrative_id', id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setProgression(data);
    } catch (error) {
      console.error('Error fetching story progression:', error);
      toast({
        title: "Error",
        description: "Failed to load story progression",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createProgression = async (narrativeId: string) => {
    try {
      const { data, error } = await supabase
        .from('story_progression')
        .insert({ narrative_id: narrativeId } as any)
        .select()
        .single();

      if (error) throw error;
      setProgression(data);
      return data;
    } catch (error) {
      console.error('Error creating story progression:', error);
      toast({
        title: "Error",
        description: "Failed to start story progression",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateProgression = async (updates: Partial<StoryProgression>) => {
    if (!progression) return;

    try {
      const { data, error } = await supabase
        .from('story_progression')
        .update(updates)
        .eq('id', progression.id)
        .select()
        .single();

      if (error) throw error;
      setProgression(data);
      return data;
    } catch (error) {
      console.error('Error updating story progression:', error);
      toast({
        title: "Error",
        description: "Failed to update story progression",
        variant: "destructive",
      });
      return null;
    }
  };

  const completeChapter = async (chapterId: string) => {
    if (!progression) return;

    const updatedChapters = [...progression.chapters_completed];
    if (!updatedChapters.includes(chapterId)) {
      updatedChapters.push(chapterId);
    }

    return updateProgression({
      chapters_completed: updatedChapters,
      current_chapter_id: chapterId,
    });
  };

  const makeChoice = async (choiceKey: string, choice: any) => {
    if (!progression) return;

    const updatedChoices = {
      ...progression.choices_made,
      [choiceKey]: choice,
    };

    return updateProgression({
      choices_made: updatedChoices,
    });
  };

  return {
    progression,
    loading,
    createProgression,
    updateProgression,
    completeChapter,
    makeChoice,
    refetch: () => narrativeId && fetchProgression(narrativeId),
  };
};