import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  useNotifications,
  useMarkRead,
  useMarkUnread,
  useMarkAllRead,
  useArchive,
} from "@/hooks/useNotifications";
import type { NotificationTab } from "@/services/notifications";
import type { NotificationItem } from "@/types";
import { formatDistanceToNow } from "date-fns";
import {
  ArrowRight,
  Archive,
  AtSign,
  CalendarClock,
  Check,
  CheckCheck,
  Dot,
  FileText,
  MessageSquare,
  Paperclip,
  RefreshCcw,
  Search,
  UserPlus,
  Workflow,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export type InboxTab =
  | "all"
  | "mentions"
  | "assigned"
  | "following"
  | "due-soon"
  | "unread";

const TAB_CONFIG: Record<InboxTab, { label: string; route: string; title: string; description: string }> = {
  all: {
    label: "All",
    route: "/inbox",
    title: "Inbox",
    description: "Everything assigned to you across projects.",
  },
  mentions: {
    label: "Mentions",
    route: "/inbox/mentions",
    title: "Inbox / Mentions",
    description: "When teammates @mention you in comments or docs.",
  },
  assigned: {
    label: "Assigned",
    route: "/inbox/assigned",
    title: "Inbox / Assigned",
    description: "Tasks or work newly assigned to you.",
  },
  following: {
    label: "Following",
    route: "/inbox/following",
    title: "Inbox / Following",
    description: "Updates to work you're following.",
  },
  "due-soon": {
    label: "Due soon",
    route: "/inbox/due-soon",
    title: "Inbox / Due soon",
    description: "Reminders for work due shortly.",
  },
  unread: {
    label: "Unread",
    route: "/inbox/unread",
    title: "Inbox / Unread",
    description: "Items you haven't reviewed yet.",
  },
};

const TAB_ORDER: InboxTab[] = ["all", "mentions", "assigned", "following", "due-soon", "unread"];

const TYPE_ICONS: Record<NotificationItem["type"], ReactNode> = {
  mention: <AtSign className="h-4 w-4 text-primary" aria-hidden="true" />,
  assigned: <UserPlus className="h-4 w-4 text-primary" aria-hidden="true" />,
  comment_reply: <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />,
  status_change: <RefreshCcw className="h-4 w-4 text-primary" aria-hidden="true" />,
  due_soon: <CalendarClock className="h-4 w-4 text-primary" aria-hidden="true" />,
  automation: <Workflow className="h-4 w-4 text-primary" aria-hidden="true" />,
  file_shared: <Paperclip className="h-4 w-4 text-primary" aria-hidden="true" />,
  doc_comment: <FileText className="h-4 w-4 text-primary" aria-hidden="true" />,
};

const TYPE_LABELS: Record<NotificationItem["type"], string> = {
  mention: "Mention",
  assigned: "Assignment",
  comment_reply: "Comment reply",
  status_change: "Status change",
  due_soon: "Due soon",
  automation: "Automation",
  file_shared: "File shared",
  doc_comment: "Doc comment",
};

const PAGE_SIZE = 25;

export function InboxPage({ tab = "all" }: { tab?: InboxTab }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const { notifications, unreadCount, isLoading, isError, error, isFetching, refetch } =
    useNotifications(tab, { limit });
  const markRead = useMarkRead();
  const markUnread = useMarkUnread();
  const markAllRead = useMarkAllRead();
  const archive = useArchive();

  useEffect(() => {
    document.title = TAB_CONFIG[tab].title;
  }, [tab]);

  useEffect(() => {
    setLimit(PAGE_SIZE);
    setSearchTerm("");
    setSelectedIds(new Set());
    setActiveIndex(0);
  }, [tab]);

  useEffect(() => {
    const knownIds = new Set(notifications.map((notification) => notification.id));
    setSelectedIds((previous) => {
      const next = new Set([...previous].filter((id) => knownIds.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    if (!searchTerm.trim()) return notifications;
    const query = searchTerm.trim().toLowerCase();
    return notifications.filter((notification) => {
      const haystacks = [notification.title, notification.body, TYPE_LABELS[notification.type]];
      return haystacks.some((value) => value?.toLowerCase().includes(query));
    });
  }, [notifications, searchTerm]);

  useEffect(() => {
    if (filteredNotifications.length === 0) {
      setActiveIndex(0);
      return;
    }

    setActiveIndex((prev) => Math.min(prev, filteredNotifications.length - 1));
  }, [filteredNotifications]);

  useEffect(() => {
    const node = itemRefs.current[activeIndex];
    if (node) {
      node.focus();
    }
  }, [activeIndex, notifications]);

  const tabDescription = TAB_CONFIG[tab].description;

  const handleNavigateTab = (value: string) => {
    const nextTab = value as InboxTab;
    const route = TAB_CONFIG[nextTab].route;
    navigate(route);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleMarkAllRead = () => {
    if (unreadCount === 0 || markAllRead.isPending) return;
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        toast({ title: "All caught up", description: "Everything in your inbox is marked read." });
      },
      onError: (mutationError) => {
        toast({
          title: "Unable to mark all read",
          description: (mutationError as Error).message ?? "Please try again.",
          variant: "destructive",
        });
      },
    });
  };

  const handleArchiveSelected = async () => {
    if (selectedIds.size === 0 || archive.isPending) return;
    try {
      for (const id of selectedIds) {
        // eslint-disable-next-line no-await-in-loop
        await archive.mutateAsync({ id, archived: true });
      }
      toast({
        title: "Archived",
        description: `${selectedIds.size} notification${selectedIds.size === 1 ? "" : "s"} archived`,
      });
      setSelectedIds(new Set());
    } catch (archiveError) {
      toast({
        title: "Archive failed",
        description: (archiveError as Error).message ?? "We couldn't archive those notifications.",
        variant: "destructive",
      });
    }
  };

  const handleOpen = useCallback(
    (notification: NotificationItem) => {
      if (!notification.read_at) {
        markRead.mutate(notification.id);
      }
      if (notification.link) {
        navigate(notification.link);
      }
    },
    [markRead, navigate]
  );

  const handleToggleRead = useCallback(
    (notification: NotificationItem) => {
      if (notification.read_at) {
        markUnread.mutate(notification.id);
      } else {
        markRead.mutate(notification.id);
      }
    },
    [markRead, markUnread]
  );

  const handleArchiveSingle = useCallback(
    async (notification: NotificationItem) => {
      try {
        await archive.mutateAsync({ id: notification.id, archived: true });
      } catch (archiveError) {
        toast({
          title: "Archive failed",
          description: (archiveError as Error).message ?? "We couldn't archive that notification.",
          variant: "destructive",
        });
      }
    },
    [archive, toast]
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (filteredNotifications.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredNotifications.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredNotifications.length) % filteredNotifications.length);
      return;
    }

    const current = filteredNotifications[activeIndex];
    if (!current) return;

    if (event.key === "Enter") {
      event.preventDefault();
      handleOpen(current);
      return;
    }

    if (event.key.toLowerCase() === "a") {
      event.preventDefault();
      handleArchiveSingle(current);
      return;
    }

    if (event.key.toLowerCase() === "r") {
      event.preventDefault();
      handleToggleRead(current);
    }
  };

  const showLoadMore = notifications.length >= limit;
  const selectedCount = selectedIds.size;

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-foreground">Inbox</h1>
            <p className="text-sm text-muted-foreground">{tabDescription}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0 || markAllRead.isPending}
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Mark all read
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleArchiveSelected}
              disabled={selectedCount === 0 || archive.isPending}
            >
              <Archive className="h-4 w-4" aria-hidden="true" />
              Archive selected
            </Button>
          </div>
        </div>
        <Tabs value={tab} onValueChange={handleNavigateTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            {TAB_ORDER.map((value) => (
              <TabsTrigger key={value} value={value} className="px-4">
                {TAB_CONFIG[value].label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      <Card onKeyDown={handleKeyDown}>
        <CardContent className="space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex w-full max-w-md items-center">
              <Search className="absolute left-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search notifications"
                className="pl-9"
                aria-label="Search notifications"
              />
            </div>
            {selectedCount > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedCount} selected
              </div>
            )}
          </div>

          {isError ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm font-medium text-foreground">We couldn't load your inbox.</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "Check your permissions or try again later."}
              </p>
              <Button onClick={() => refetch()} size="sm">
                Try again
              </Button>
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={`loading-${index}`}
                  className="animate-pulse rounded-lg border border-dashed bg-muted/40 p-4"
                >
                  <div className="h-4 w-32 rounded bg-muted" />
                  <div className="mt-2 h-3 w-full rounded bg-muted/70" />
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-12 text-center">
              <Check className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <p className="text-base font-medium text-foreground">You're all caught up</p>
              <p className="text-sm text-muted-foreground">
                New notifications will show up here. Follow work to stay in the loop.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification, index) => {
                const isSelected = selectedIds.has(notification.id);
                const isActive = index === activeIndex;
                const unread = !notification.read_at;
                return (
                  <div
                    key={notification.id}
                    ref={(element) => {
                      itemRefs.current[index] = element;
                    }}
                    role="button"
                    tabIndex={isActive ? 0 : -1}
                    className={cn(
                      "group flex items-start gap-3 rounded-lg border p-4 outline-none transition",
                      unread ? "border-primary/40 bg-primary/5" : "border-border bg-background",
                      isSelected && "border-primary bg-primary/10",
                      isActive && "ring-2 ring-primary"
                    )}
                    onClick={() => handleOpen(notification)}
                    onFocus={() => setActiveIndex(index)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleSelect(notification.id)}
                      onClick={(event) => event.stopPropagation()}
                      className="mt-1"
                      aria-label={isSelected ? "Deselect notification" : "Select notification"}
                    />
                    <div className="flex flex-1 flex-col gap-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span>{TYPE_ICONS[notification.type]}</span>
                          <h2 className="text-sm font-semibold text-foreground">
                            {notification.title ?? "Notification"}
                          </h2>
                          <Badge variant="secondary">{TYPE_LABELS[notification.type]}</Badge>
                        </div>
                        <time className="text-xs text-muted-foreground" dateTime={notification.created_at}>
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </time>
                      </div>
                      {notification.body && (
                        <p className="text-sm text-muted-foreground">{notification.body}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-2 text-xs"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleToggleRead(notification);
                          }}
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          {notification.read_at ? "Mark unread" : "Mark read"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-2 text-xs"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleArchiveSingle(notification);
                          }}
                        >
                          <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                          Archive
                        </Button>
                        {notification.link && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-2 text-xs"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOpen(notification);
                            }}
                          >
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                            Open
                          </Button>
                        )}
                        {!notification.read_at && (
                          <span className="flex items-center gap-1 text-xs font-medium text-primary">
                            <Dot className="h-3 w-3" aria-hidden="true" />
                            Unread
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showLoadMore && !isLoading && (
            <div className="flex justify-center pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLimit((previous) => previous + PAGE_SIZE)}
                disabled={isFetching}
              >
                Load more
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

export const INBOX_TABS = TAB_CONFIG;
