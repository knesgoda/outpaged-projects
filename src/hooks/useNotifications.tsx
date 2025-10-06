import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRealtime } from './useRealtime';
import { listMyNotifications, markNotificationRead } from '@/services/notifications';
import type { Notification } from '@/types';
import { useAuth } from './useAuth';

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications', user?.id],
    queryFn: () => listMyNotifications(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const unread = notifications.filter(notification => !notification.read_at);
      if (unread.length === 0) return;

      await Promise.all(unread.map(notification => markNotificationRead(notification.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  // Real-time updates for notifications
  useRealtime({
    table: 'notifications',
    filter: user ? `user_id=eq.${user.id}` : undefined,
    onInsert: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
    onUpdate: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
    onDelete: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
    },
  });

  const unreadCount = notifications.filter(n => !n.read_at).length;

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead: markAsReadMutation.mutate,
    markAllAsRead: markAllAsReadMutation.mutate,
  };
}