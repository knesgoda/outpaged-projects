import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from '@/hooks/use-toast';

export interface TimeEntry {
  id: string;
  task_id: string;
  user_id: string;
  description?: string;
  started_at: string;
  ended_at?: string;
  duration_minutes?: number;
  is_running: boolean;
  created_at: string;
  updated_at: string;
}

export function useTimeTracking(taskId?: string) {
  const { user } = useAuth();
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [runningEntry, setRunningEntry] = useState<TimeEntry | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch time entries for a specific task
  const fetchTimeEntries = async (specificTaskId?: string) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      let query = supabase
        .from('time_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (specificTaskId) {
        query = query.eq('task_id', specificTaskId);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setTimeEntries(data || []);
      
      // Find any running timer
      const running = data?.find(entry => entry.is_running);
      setRunningEntry(running || null);
    } catch (error: any) {
      console.error('Error fetching time entries:', error);
      toast({
        title: "Error",
        description: "Failed to fetch time entries",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Start timer for a task
  const startTimer = async (targetTaskId: string, description?: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .insert({
          task_id: targetTaskId,
          user_id: user.id,
          description,
          started_at: new Date().toISOString(),
          is_running: true,
        })
        .select()
        .single();

      if (error) throw error;

      setRunningEntry(data);
      await fetchTimeEntries(taskId);

      toast({
        title: "Timer Started",
        description: "Time tracking has begun for this task",
      });
    } catch (error: any) {
      console.error('Error starting timer:', error);
      toast({
        title: "Error",
        description: "Failed to start timer",
        variant: "destructive",
      });
    }
  };

  // Stop running timer
  const stopTimer = async () => {
    if (!runningEntry || !user) return;

    try {
      const { data, error } = await supabase
        .from('time_entries')
        .update({
          ended_at: new Date().toISOString(),
          is_running: false,
        })
        .eq('id', runningEntry.id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setRunningEntry(null);
      await fetchTimeEntries(taskId);

      toast({
        title: "Timer Stopped",
        description: `Logged ${Math.round(data.duration_minutes || 0)} minutes`,
      });
    } catch (error: any) {
      console.error('Error stopping timer:', error);
      toast({
        title: "Error",
        description: "Failed to stop timer",
        variant: "destructive",
      });
    }
  };

  // Delete time entry
  const deleteTimeEntry = async (entryId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchTimeEntries(taskId);

      toast({
        title: "Time Entry Deleted",
        description: "Time entry has been removed",
      });
    } catch (error: any) {
      console.error('Error deleting time entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete time entry",
        variant: "destructive",
      });
    }
  };

  // Update time entry
  const updateTimeEntry = async (entryId: string, updates: Partial<TimeEntry>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('time_entries')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', entryId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchTimeEntries(taskId);

      toast({
        title: "Time Entry Updated",
        description: "Changes have been saved",
      });
    } catch (error: any) {
      console.error('Error updating time entry:', error);
      toast({
        title: "Error",
        description: "Failed to update time entry",
        variant: "destructive",
      });
    }
  };

  // Get total time for a task
  const getTotalTimeForTask = (targetTaskId: string) => {
    return timeEntries
      .filter(entry => entry.task_id === targetTaskId && entry.duration_minutes)
      .reduce((total, entry) => total + (entry.duration_minutes || 0), 0);
  };

  // Format duration for display
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = Math.round(minutes % 60);
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  // Get running timer duration (real-time)
  const getRunningDuration = () => {
    if (!runningEntry) return 0;
    const start = new Date(runningEntry.started_at);
    const now = new Date();
    return (now.getTime() - start.getTime()) / (1000 * 60); // minutes
  };

  useEffect(() => {
    if (user) {
      fetchTimeEntries(taskId);
    }
  }, [user, taskId]);

  // Update running timer every minute
  useEffect(() => {
    if (!runningEntry) return;

    const interval = setInterval(() => {
      // Trigger re-render to update running duration
      setRunningEntry(prev => prev ? { ...prev } : null);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [runningEntry]);

  return {
    timeEntries,
    runningEntry,
    isLoading,
    startTimer,
    stopTimer,
    deleteTimeEntry,
    updateTimeEntry,
    getTotalTimeForTask,
    formatDuration,
    getRunningDuration,
    fetchTimeEntries,
  };
}