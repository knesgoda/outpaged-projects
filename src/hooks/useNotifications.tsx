codex/implement-notifications-and-inbox-functionality-g8mo3c
import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archive as archiveNotification,
  listNotifications,
  markAllRead as markAllReadService,
  markRead as markReadService,
  markUnread as markUnreadService,
  type NotificationTab,
  unarchive as unarchiveNotification,
} from "@/services/notifications";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const QUERY_KEY = ["notifications"] as const;

export type UseNotificationsOptions = {
  limit?: number;
  since?: string;
  includeArchived?: boolean;
};

export function useNotifications(
  tab: NotificationTab = "all",
  options: UseNotificationsOptions = {}
) {
=======
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRealtime } from './useRealtime';
import { listMyNotifications, markNotificationRead } from '@/services/notifications';
import type { Notification } from '@/types';
import { useAuth } from './useAuth';

export function useNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { user } = useAuth();

codex/implement-notifications-and-inbox-functionality-g8mo3c
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: [...QUERY_KEY, { tab, ...options }],
    queryFn: () => listNotifications({ tab, ...options }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications:user:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: QUERY_KEY });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const notifications = data ?? [];
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read_at).length,
    [notifications]
  );

  const invalidateAllTabs = () =>
    queryClient.invalidateQueries({ queryKey: QUERY_KEY, refetchType: "active" });

  return {
    notifications,
    unreadCount,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
    invalidateAllTabs,
  };
}

export function useMarkRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markReadService(id),
=======
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications', user?.id],
    queryFn: () => listMyNotifications(),
    enabled: !!user,
    staleTime: 30_000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => markNotificationRead(notificationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

codex/implement-notifications-and-inbox-functionality-g8mo3c
export function useMarkAllRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => markAllReadService(),
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');

      const unread = notifications.filter(notification => !notification.read_at);
      if (unread.length === 0) return;

      await Promise.all(unread.map(notification => markNotificationRead(notification.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useMarkUnread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => markUnreadService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

codex/implement-notifications-and-inbox-functionality-g8mo3c
type ArchiveVariables = { id: string; archived: boolean };
  const unreadCount = notifications.filter(n => !n.read_at).length;

export function useArchive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, archived }: ArchiveVariables) =>
      archived ? archiveNotification(id) : unarchiveNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
