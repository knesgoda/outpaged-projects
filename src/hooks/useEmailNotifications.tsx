import { useEnhancedNotifications } from './useEnhancedNotifications';

export function useEmailNotifications() {
  const { 
    sendTaskAssignmentEmail, 
    sendInvitationEmail, 
    sendTaskUpdateEmail 
  } = useEnhancedNotifications();

  // Wrapper function for task assignment with error handling
  const notifyTaskAssignment = async (taskId: string, assigneeId: string, projectId: string) => {
    try {
      await sendTaskAssignmentEmail(taskId, assigneeId, projectId);
    } catch (error) {
      console.error('Failed to send task assignment notification:', error);
    }
  };

  // Wrapper function for project invitation with error handling
  const notifyProjectInvitation = async (email: string, projectId: string, role?: string) => {
    try {
      await sendInvitationEmail(email, projectId, role);
    } catch (error) {
      console.error('Failed to send invitation notification:', error);
    }
  };

  // Wrapper function for task updates with error handling
  const notifyTaskUpdate = async (
    taskId: string,
    updateType: 'status_change' | 'comment_added' | 'due_date_changed' | 'priority_changed',
    details: { oldValue?: string; newValue?: string; comment?: string }
  ) => {
    try {
      await sendTaskUpdateEmail(taskId, updateType, details);
    } catch (error) {
      console.error('Failed to send task update notification:', error);
    }
  };

  // Wrapper function for status changes
  const notifyStatusChange = async (taskId: string, oldStatus: string, newStatus: string) => {
    await notifyTaskUpdate(taskId, 'status_change', {
      oldValue: oldStatus,
      newValue: newStatus,
    });
  };

  // Wrapper function for comment additions
  const notifyNewComment = async (taskId: string, comment: string) => {
    await notifyTaskUpdate(taskId, 'comment_added', {
      comment,
    });
  };

  // Wrapper function for due date changes
  const notifyDueDateChange = async (taskId: string, oldDate?: string, newDate?: string) => {
    await notifyTaskUpdate(taskId, 'due_date_changed', {
      oldValue: oldDate,
      newValue: newDate,
    });
  };

  // Wrapper function for priority changes
  const notifyPriorityChange = async (taskId: string, oldPriority: string, newPriority: string) => {
    await notifyTaskUpdate(taskId, 'priority_changed', {
      oldValue: oldPriority,
      newValue: newPriority,
    });
  };

  return {
    notifyTaskAssignment,
    notifyProjectInvitation,
    notifyTaskUpdate,
    notifyStatusChange,
    notifyNewComment,
    notifyDueDateChange,
    notifyPriorityChange,
  };
}