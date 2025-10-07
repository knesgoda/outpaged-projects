import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { createNotification } from '@/services/notifications';

interface TaskAssignee {
  id: string;
  name: string;
  avatar?: string;
  initials: string;
}

export function useTaskAssignees(taskId?: string) {
  const [assignees, setAssignees] = useState<TaskAssignee[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchAssignees = async () => {
    if (!taskId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('task_assignees_with_profiles')
        .select('*')
        .eq('task_id', taskId);

      if (error) throw error;

      const formattedAssignees = data?.map(assignee => ({
        id: assignee.user_id,
        name: assignee.full_name || 'Unknown User',
        avatar: assignee.avatar_url,
        initials: (assignee.full_name || 'U')
          .split(' ')
          .map(n => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      })) || [];

      setAssignees(formattedAssignees);
    } catch (error) {
      console.error('Error fetching task assignees:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAssignee = async (userId: string) => {
    if (!taskId || !user) return;

    try {
      const { error } = await supabase
        .from('task_assignees')
        .insert({
          task_id: taskId,
          user_id: userId,
          assigned_by: user.id
        });

      if (error) throw error;

      try {
        const { data: taskData, error: taskErr } = await supabase
          .from('tasks')
          .select('project_id, title')
          .eq('id', taskId)
          .maybeSingle();

        if (taskErr) {
          console.warn('Could not fetch task metadata for notification:', taskErr);
        }

        if (userId !== user.id) {
          const { data: preferenceRow, error: preferenceError } = await supabase
            .from('user_notification_preferences')
            .select('in_app_task_updates, email_task_updates')
            .eq('user_id', userId)
            .maybeSingle();

          if (preferenceError) {
            console.warn('Could not load assignment preferences:', preferenceError);
          }

          const inAppPref = preferenceRow?.in_app_task_updates;
          const emailPref = preferenceRow?.email_task_updates;

          const taskTitle = taskData?.title || 'task';
          const actorName = user?.user_metadata?.full_name || user?.email || 'Someone';

          if (inAppPref !== false) {
            await createNotification({
              user_id: userId,
              type: 'assigned',
              title: 'New assignment',
              body: `${actorName} assigned you "${taskTitle}"`,
              entity_type: 'task',
              entity_id: taskId,
              project_id: taskData?.project_id || null,
              link: `/tasks/${taskId}`,
            });
          }

          if (emailPref === true) {
            try {
              await supabase.functions.invoke('send-task-assignment-notification', {
                body: {
                  taskId,
                  assigneeId: userId,
                  projectId: taskData?.project_id,
                  assignerId: user.id,
                },
              });
            } catch (notifyError) {
              console.warn('Assignment notification email error:', notifyError);
            }
          }
        }
      } catch (notifyError) {
        console.warn('Assignment notification error:', notifyError);
      }

      await fetchAssignees();
      
      toast({
        title: "Success",
        description: "Assignee added successfully",
      });
    } catch (error: any) {
      console.error('Error adding assignee:', error);
      toast({
        title: "Error",
        description: "Failed to add assignee",
        variant: "destructive",
      });
    }
  };

  const removeAssignee = async (userId: string) => {
    if (!taskId) return;

    // Optimistic update
    const previous = assignees;
    setAssignees(prev => prev.filter(a => a.id !== userId));

    try {
      const { error } = await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId)
        .eq('user_id', userId);

      if (error) throw error;

      await fetchAssignees();
      
      toast({
        title: "Success",
        description: "Assignee removed successfully",
      });
    } catch (error: any) {
      console.error('Error removing assignee:', error);
      // Revert optimistic update
      setAssignees(previous);
      toast({
        title: "Error",
        description: `Failed to remove assignee${error?.message ? `: ${error.message}` : ''}`,
        variant: "destructive",
      });
    }
  };

  const updateAssignees = async (assigneeIds: string[]) => {
    if (!taskId || !user) return;

    try {
      // Remove all current assignees
      await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId);

      // Add new assignees
      if (assigneeIds.length > 0) {
        const { error } = await supabase
          .from('task_assignees')
          .insert(
            assigneeIds.map(userId => ({
              task_id: taskId,
              user_id: userId,
              assigned_by: user.id
            }))
          );

        if (error) throw error;
      }

      await fetchAssignees();
    } catch (error: any) {
      console.error('Error updating assignees:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchAssignees();
  }, [taskId]);

  return {
    assignees,
    loading,
    addAssignee,
    removeAssignee,
    updateAssignees,
    fetchAssignees
  };
}