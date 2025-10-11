import { Fragment, useMemo } from "react";
import { format, formatDistanceToNowStrict, isSameDay, parseISO } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CalendarEvent, CalendarInvitation, CalendarNotification, CalendarRSVPStatus } from "@/types/calendar";

interface AgendaPaneProps {
  events: CalendarEvent[];
  notifications: CalendarNotification[];
  onJoin: (eventId: string) => void;
  onSnooze: (notificationId: string, minutes: number) => void;
  onDismiss: (notificationId: string) => void;
  onRsvp: (invitationId: string, status: CalendarRSVPStatus) => void;
  onMarkDone: (eventId: string) => void;
}

function getNextEvent(events: CalendarEvent[]): CalendarEvent | null {
  const upcoming = [...events]
    .filter((event) => new Date(event.start) >= new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  return upcoming[0] ?? null;
}

function firstPendingInvitation(event: CalendarEvent): CalendarInvitation | null {
  if (!event.invitations) return null;
  return event.invitations.find((invitation) => invitation.status === "needs-action") ?? null;
}

export function AgendaPane({ events, notifications, onJoin, onSnooze, onDismiss, onRsvp, onMarkDone }: AgendaPaneProps) {
  const nextEvent = useMemo(() => getNextEvent(events), [events]);
  const grouped = useMemo(() => {
    const upcoming = events
      .filter((event) => new Date(event.end) >= new Date())
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    const groups: { date: string; label: string; items: CalendarEvent[] }[] = [];
    upcoming.forEach((event) => {
      const start = parseISO(event.start);
      const existing = groups.find((group) => isSameDay(parseISO(group.date), start));
      if (existing) {
        existing.items.push(event);
      } else {
        groups.push({
          date: start.toISOString(),
          label: format(start, "EEEE, MMM d"),
          items: [event],
        });
      }
    });
    return groups;
  }, [events]);

  const nextCountdown = useMemo(() => {
    if (!nextEvent) return "No upcoming events";
    return `Next event in ${formatDistanceToNowStrict(parseISO(nextEvent.start))}`;
  }, [nextEvent]);

  return (
    <Card className="flex h-full flex-col" aria-label="Agenda and notifications">
      <CardHeader className="border-b bg-muted/50 py-3">
        <CardTitle className="text-sm">Agenda</CardTitle>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {nextCountdown}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4 p-0">
        <ScrollArea className="flex-1">
          <div className="space-y-4 p-4">
            {grouped.length === 0 ? (
              <p className="text-xs text-muted-foreground">No upcoming events within the selected range.</p>
            ) : (
              grouped.map((group) => (
                <Fragment key={group.date}>
                  <h3 className="text-xs font-semibold uppercase text-muted-foreground">{group.label}</h3>
                  <ul className="space-y-3" aria-label={`Agenda for ${group.label}`}>
                    {group.items.map((event) => {
                      const invitation = firstPendingInvitation(event);
                      const notification = notifications.find((entry) => entry.eventId === event.id);
                      const countdown = formatDistanceToNowStrict(parseISO(event.start), { addSuffix: true });
                      return (
                        <li key={event.id} className="rounded-md border bg-background p-3 text-xs shadow-sm">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{event.title}</p>
                              <p className="text-muted-foreground">{format(parseISO(event.start), "HH:mm")}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{countdown}</Badge>
                              {event.status && <Badge variant="secondary">{event.status}</Badge>}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {event.videoLink && (
                              <Button size="sm" variant="secondary" onClick={() => onJoin(event.id)}>
                                Join
                              </Button>
                            )}
                            {invitation && (
                              <>
                                <Button size="sm" onClick={() => onRsvp(invitation.id, "accepted")}>
                                  Accept
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => onRsvp(invitation.id, "declined")}>
                                  Decline
                                </Button>
                              </>
                            )}
                            {notification && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => onSnooze(notification.id, 10)}>
                                  Snooze 10m
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => onDismiss(notification.id)}>
                                  Dismiss
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => onMarkDone(event.id)}>
                              Mark done
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </Fragment>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
