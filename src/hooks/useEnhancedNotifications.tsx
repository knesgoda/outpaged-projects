
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { useNotifications } from "./useNotifications";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { NotificationItem } from "@/types";

export type EnhancedNotification = NotificationItem & {
  read: boolean;
  message: string | null;
  related_task_id?: string | null;
  related_project_id?: string | null;
  action_url?: string | null;
  sender_name?: string | null;
  sender_avatar?: string | null;
};

export function useEnhancedNotifications() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    notifications: baseNotifications,
    unreadCount,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
    invalidateAllTabs,
  } = useNotifications("all");
  const [realtimeNotifications, setRealtimeNotifications] = useState<EnhancedNotification[]>([]);

  const notifications = useMemo(() => {
    return baseNotifications.map<EnhancedNotification>((notification) => ({
      ...notification,
      read: Boolean(notification.read_at),
      message: notification.body ?? notification.title ?? null,
      related_task_id:
        notification.related_task_id ??
        (notification.entity_type === "task" ? notification.entity_id ?? null : null),
      related_project_id: notification.related_project_id ?? notification.project_id ?? null,
      action_url: notification.link ?? null,
      sender_name: "sender_name" in notification ? (notification as any).sender_name ?? null : null,
      sender_avatar: "sender_avatar" in notification ? (notification as any).sender_avatar ?? null : null,
    }));
  }, [baseNotifications]);

  useEffect(() => {
    if (!user) return;

    // Set up real-time subscription for notifications
    const channel = supabase
      .channel("notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as NotificationItem;

          const enhanced: EnhancedNotification = {
            ...newNotification,
            read: Boolean(newNotification.read_at),
            message: newNotification.body ?? newNotification.title ?? null,
            related_task_id:
              newNotification.related_task_id ??
              (newNotification.entity_type === "task" ? newNotification.entity_id ?? null : null),
            related_project_id: newNotification.related_project_id ?? newNotification.project_id ?? null,
            action_url: newNotification.link ?? null,
            sender_name: (newNotification as any).sender_name ?? null,
            sender_avatar: (newNotification as any).sender_avatar ?? null,
          };

          // Show toast for new notifications
          toast({
            title: enhanced.title,
            description: enhanced.message ?? undefined,
          });

          // Add to real-time notifications
          setRealtimeNotifications((prev) => [enhanced, ...prev.slice(0, 9)]);
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
    type: NotificationItem["type"];
    related_task_id?: string;
    related_project_id?: string;
    user_ids?: string[];
  }) => {
    if (!user) return;

    try {
      const targetUserIds = notification.user_ids || [user.id];
      
      const notifications = targetUserIds.map((userId) => ({
        user_id: userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        related_task_id: notification.related_task_id,
        related_project_id: notification.related_project_id,
      }));

      const { error } = await supabase.from("notifications").insert(notifications);

      if (error) throw error;
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  };

  // Send task assignment email notification
  const sendTaskAssignmentEmail = async (taskId: string, assigneeId: string, projectId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.functions.invoke("send-task-assignment-notification", {
        body: {
          taskId,
          assigneeId,
          assignedBy: user.id,
          projectId,
        },
      });

      if (error) {
        console.error("Error sending task assignment email:", error);
      }
    } catch (error) {
      console.error("Error invoking task assignment email function:", error);
    }
  };

  // Send invitation email notification
  const sendInvitationEmail = async (email: string, projectId: string, role?: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.functions.invoke("send-invitation-notification", {
        body: {
          email,
          projectId,
          invitedBy: user.id,
          role,
        },
      });

      if (error) {
        console.error("Error sending invitation email:", error);
      }
    } catch (error) {
      console.error("Error invoking invitation email function:", error);
    }
  };

  // Send task update email notification
  const sendTaskUpdateEmail = async (
    taskId: string,
    updateType: 'status_change' | 'comment_added' | 'due_date_changed' | 'priority_changed',
    details: { oldValue?: string; newValue?: string; comment?: string }
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase.functions.invoke("send-task-update-notification", {
        body: {
          taskId,
          updatedBy: user.id,
          updateType,
          details,
        },
      });

      if (error) {
        console.error("Error sending task update email:", error);
      }
    } catch (error) {
      console.error("Error invoking task update email function:", error);
    }
  };

  const markAsRead = async (id: string) => {
    const now = new Date().toISOString();
    await supabase.from("notifications").update({ read_at: now }).eq("id", id);
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const markAllAsRead = async () => {
    const now = new Date().toISOString();
    if (!user) return;
    await supabase.from("notifications").update({ read_at: now }).eq("user_id", user.id).is("read_at", null);
    await queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  return {
    notifications: [...realtimeNotifications, ...notifications],
    unreadCount,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
    invalidateAllTabs,
    markAsRead,
    markAllAsRead,
    triggerNotification,
    sendTaskAssignmentEmail,
    sendInvitationEmail,
    sendTaskUpdateEmail,
  };
}
