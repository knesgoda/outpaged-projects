import { formatDistanceToNowStrict, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CalendarNotification } from "@/types/calendar";

interface NotificationCenterProps {
  notifications: CalendarNotification[];
  onSnooze: (id: string, minutes: number) => void;
  onDismiss: (id: string) => void;
  onJoin: (id: string) => void;
}

export function NotificationCenter({ notifications, onSnooze, onDismiss, onJoin }: NotificationCenterProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Upcoming reminders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {notifications.length === 0 ? (
          <p className="text-xs text-muted-foreground">No reminders scheduled.</p>
        ) : (
          notifications.map((notification) => (
            <div key={notification.id} className="rounded-md border bg-muted/30 p-3 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{notification.title}</p>
                  <p className="text-muted-foreground">
                    {formatDistanceToNowStrict(parseISO(notification.start), { addSuffix: true })}
                  </p>
                </div>
                <Badge variant={notification.status === "pending" ? "secondary" : "outline"}>{notification.channel}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => onSnooze(notification.id, 5)}>
                  Snooze 5m
                </Button>
                <Button variant="outline" size="sm" onClick={() => onSnooze(notification.id, 15)}>
                  Snooze 15m
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onDismiss(notification.id)}>
                  Dismiss
                </Button>
                {notification.actionLabel && (
                  <Button size="sm" onClick={() => onJoin(notification.eventId)}>
                    {notification.actionLabel}
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
