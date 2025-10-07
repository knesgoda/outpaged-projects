import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, useMarkRead, useMarkAllRead } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";
import {
  Bell,
  AtSign,
  UserPlus,
  Reply,
  RefreshCcw,
  CalendarClock,
  Workflow,
  Paperclip,
  FileText,
  ArrowRight,
  Dot,
} from "lucide-react";
import type { NotificationItem } from "@/types";

const ICONS: Partial<Record<string, ReactNode>> = {
  mention: <AtSign className="h-4 w-4" aria-hidden="true" />,
  assigned: <UserPlus className="h-4 w-4" aria-hidden="true" />,
  comment_reply: <Reply className="h-4 w-4" aria-hidden="true" />,
  status_change: <RefreshCcw className="h-4 w-4" aria-hidden="true" />,
  due_soon: <CalendarClock className="h-4 w-4" aria-hidden="true" />,
  automation: <Workflow className="h-4 w-4" aria-hidden="true" />,
  file_shared: <Paperclip className="h-4 w-4" aria-hidden="true" />,
  doc_comment: <FileText className="h-4 w-4" aria-hidden="true" />,
};

export function NotificationBell() {
  const navigate = useNavigate();
  const { notifications, unreadCount, isLoading } = useNotifications("all");
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const latestNotifications = useMemo(
    () => notifications.slice(0, 10),
    [notifications]
  );

  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.read_at) {
      markRead.mutate(notification.id);
    }

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0 || markAllRead.isPending) return;
    markAllRead.mutate();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10"
          aria-label="Open notifications"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          <span
            className="sr-only"
            aria-live="polite"
            aria-atomic="true"
          >
            {unreadCount} unread notifications
          </span>
          {unreadCount > 0 && (
            <span
              className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-xs font-medium text-primary-foreground shadow-sm"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <DropdownMenuLabel className="p-0 text-base font-semibold">
            Notifications
          </DropdownMenuLabel>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 text-xs"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || markAllRead.isPending}
          >
            Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-80">
          {isLoading ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              Loading notifications…
            </div>
          ) : latestNotifications.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              You're all caught up.
            </div>
          ) : (
            latestNotifications.map((notification) => {
              const icon = ICONS[notification.type];
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex cursor-pointer items-start gap-3 px-4 py-3 text-sm focus:bg-accent"
                  onSelect={(event) => {
                    event.preventDefault();
                    handleNotificationClick(notification);
                  }}
                >
                  <span className="mt-1 text-muted-foreground">{icon}</span>
                  <div className="flex flex-1 flex-col gap-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {notification.title ?? "Notification"}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    {notification.body && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {notification.body}
                      </p>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {!notification.read_at && (
                        <span className="flex items-center gap-1 text-primary">
                          <Dot className="h-3 w-3" aria-hidden="true" />
                          Unread
                        </span>
                      )}
                      {notification.link && (
                        <span className="flex items-center gap-1">
                          <ArrowRight className="h-3 w-3" aria-hidden="true" />
                          Open
                        </span>
                      )}
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })
          )}
        </ScrollArea>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-4 py-3">
          <div className="text-xs text-muted-foreground">
            View all activity in the inbox.
          </div>
          <Button
            variant="outline"
            size="sm"
            className="h-8"
            onClick={() => navigate("/inbox")}
          >
            View all
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
