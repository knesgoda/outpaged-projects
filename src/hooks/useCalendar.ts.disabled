import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type { CalendarColorEncoding, CalendarEvent } from "@/types/calendar";
import { listCalendarEvents, type CalendarEventWithDetails } from "@/services/calendarEvents";

type CalendarRange = {
  from: Date;
  to: Date;
  projectId?: string;
  calendarIds?: string[];
  colorEncoding?: CalendarColorEncoding;
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function selectColor(
  event: CalendarEventWithDetails,
  colorEncoding: CalendarColorEncoding | undefined
): string | undefined {
  if (!colorEncoding || colorEncoding === "calendar") {
    return event.color;
  }

  if (colorEncoding === "status") {
    return event.statusColor ?? event.color;
  }

  if (colorEncoding === "priority") {
    return event.priorityColor ?? event.color;
  }

  if (colorEncoding === "type") {
    return event.typeColor ?? event.color;
  }

  return event.color;
}

export function useCalendarRange(range: CalendarRange) {
  const { from, to, projectId, calendarIds, colorEncoding } = range;
  const key = useMemo(
    () => [
        "calendar",
        projectId ?? "all",
        toIsoDate(from),
        toIsoDate(to),
        colorEncoding ?? "calendar",
        ...(calendarIds ?? []),
      ],
    [from, to, projectId, calendarIds, colorEncoding]
  );

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const events = await listCalendarEvents({
        from: from.toISOString(),
        to: to.toISOString(),
        projectId,
        calendarIds,
      });

      return events.map<CalendarEvent>((event) => ({
        ...event,
        color: selectColor(event, colorEncoding),
      }));
    },
  });

  return {
    events: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
