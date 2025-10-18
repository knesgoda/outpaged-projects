import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useBacklogRanking() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const updateRank = async (taskId: string, newRank: number) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ backlog_rank: newRank })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Rank updated',
        description: 'Task ranking updated successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error updating rank',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const reorderTasks = async (tasks: Array<{ id: string; rank: number }>) => {
    setLoading(true);
    try {
      const updates = tasks.map((task) =>
        supabase
          .from('tasks')
          .update({ backlog_rank: task.rank })
          .eq('id', task.id)
      );

      await Promise.all(updates);

      toast({
        title: 'Backlog reordered',
        description: 'Tasks reordered successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Error reordering tasks',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    updateRank,
    reorderTasks,
    loading,
  };
}
