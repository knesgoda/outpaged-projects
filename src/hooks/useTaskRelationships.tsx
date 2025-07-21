import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface TaskRelationship {
  id: string;
  source_task_id: string;
  target_task_id: string;
  relationship_type: 'blocks' | 'depends_on' | 'duplicates' | 'relates_to';
  created_at: string;
  created_by: string;
  notes?: string;
  source_task_title: string;
  target_task_title: string;
  source_task_status: string;
  target_task_status: string;
}

export interface CreateTaskRelationshipData {
  source_task_id: string;
  target_task_id: string;
  relationship_type: 'blocks' | 'depends_on' | 'duplicates' | 'relates_to';
  notes?: string;
}

export function useTaskRelationships(taskId?: string) {
  const [relationships, setRelationships] = useState<TaskRelationship[]>([]);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<{ id: string; title: string; status: string }[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchRelationships = async (id: string) => {
    if (!id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_task_relationships', {
        task_id_param: id
      });

      if (error) throw error;
      setRelationships(data || []);
    } catch (error) {
      console.error('Error fetching task relationships:', error);
      toast({
        title: "Error",
        description: "Failed to load task relationships",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTasks = async (projectId: string, excludeTaskId?: string) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, status')
        .eq('project_id', projectId)
        .neq('id', excludeTaskId || '');

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const createRelationship = async (relationshipData: CreateTaskRelationshipData) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create relationships",
        variant: "destructive",
      });
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('task_relationships')
        .insert({
          ...relationshipData,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) {
        if (error.message.includes('circular dependency')) {
          toast({
            title: "Cannot create relationship",
            description: "This would create a circular dependency between tasks",
            variant: "destructive",
          });
        } else if (error.message.includes('unique_relationship')) {
          toast({
            title: "Relationship already exists",
            description: "This relationship already exists between these tasks",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return null;
      }

      toast({
        title: "Success",
        description: "Task relationship created successfully",
      });

      // Refresh relationships
      if (taskId) {
        await fetchRelationships(taskId);
      }

      return data;
    } catch (error) {
      console.error('Error creating task relationship:', error);
      toast({
        title: "Error",
        description: "Failed to create task relationship",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteRelationship = async (relationshipId: string) => {
    try {
      const { error } = await supabase
        .from('task_relationships')
        .delete()
        .eq('id', relationshipId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task relationship deleted successfully",
      });

      // Refresh relationships
      if (taskId) {
        await fetchRelationships(taskId);
      }
    } catch (error) {
      console.error('Error deleting task relationship:', error);
      toast({
        title: "Error",
        description: "Failed to delete task relationship",
        variant: "destructive",
      });
    }
  };

  const updateRelationship = async (relationshipId: string, updates: { notes?: string }) => {
    try {
      const { error } = await supabase
        .from('task_relationships')
        .update(updates)
        .eq('id', relationshipId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task relationship updated successfully",
      });

      // Refresh relationships
      if (taskId) {
        await fetchRelationships(taskId);
      }
    } catch (error) {
      console.error('Error updating task relationship:', error);
      toast({
        title: "Error",
        description: "Failed to update task relationship",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchRelationships(taskId);
    }
  }, [taskId]);

  return {
    relationships,
    loading,
    tasks,
    fetchRelationships,
    fetchAvailableTasks,
    createRelationship,
    deleteRelationship,
    updateRelationship,
  };
}