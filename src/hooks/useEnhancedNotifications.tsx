
import { useEffect, useState } from 'react';
import { useNotifications } from './useNotifications';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface EnhancedNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  created_at: string;
  related_task_id?: string;
  related_project_id?: string;
  action_url?: string;
  sender_name?: string;
  sender_avatar?: string;
}

export function useEnhancedNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [realtimeNotifications, setRealtimeNotifications] = useState<EnhancedNotification[]>([]);

  useEffect(() => {
    if (!user) return;

    // Set up real-time subscription for notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotification = payload.new as EnhancedNotification;
          
          // Show toast for new notifications
          toast({
            title: newNotification.title,
            description: newNotification.message,
            variant: newNotification.type === 'error' ? 'destructive' : 'default',
          });

          // Add to real-time notifications
          setRealtimeNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  // Trigger notifications for various events
  const triggerNotification = async (notification: {
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    related_task_id?: string;
    related_project_id?: string;
    user_ids?: string[];
  }) => {
    if (!user) return;

    try {
      const targetUserIds = notification.user_ids || [user.id];
      
      const notifications = targetUserIds.map(userId => ({
        user_id: userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        related_task_id: notification.related_task_id,
        related_project_id: notification.related_project_id,
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notifications);

      if (error) throw error;
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  return {
    notifications: [...realtimeNotifications, ...notifications],
    unreadCount,
    markAsRead,
    markAllAsRead,
    triggerNotification,
  };
}
