import { addDays, formatISO } from "date-fns";
import { updateIntegrationConfig } from "@/services/integrations";

type SaveCalendarDefaultInput = {
  calendarId: string;
};

type ListEventsMockInput = {
  from: Date;
  to: Date;
  projectId?: string;
};

type CalendarEventMock = {
  id: string;
  summary: string;
  description: string;
  start: string;
  end: string;
  link: string;
  projectId?: string;
};

export async function saveCalendarDefault({
  calendarId,
}: SaveCalendarDefaultInput): Promise<void> {
  const trimmed = calendarId.trim();
  if (!trimmed) {
    throw new Error("Calendar ID is required");
  }

  await updateIntegrationConfig("google_calendar", {
    calendar_id_default: trimmed,
  });
}

export async function listEventsMock({
  from,
  to,
  projectId,
}: ListEventsMockInput): Promise<CalendarEventMock[]> {
  const start = from instanceof Date ? from : new Date(from);
  const end = to instanceof Date ? to : new Date(to);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid date range");
  }

  const windowDays = Math.max(1, Math.min(14, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))));

  const events: CalendarEventMock[] = [];
  for (let index = 0; index < Math.min(windowDays, 5); index += 1) {
    const eventStart = addDays(start, index);
    const eventEnd = new Date(eventStart.getTime() + 60 * 60 * 1000);
    const eventId = `mock-event-${eventStart.getTime()}-${index}`;

    events.push({
      id: eventId,
      summary: `Sync checkpoint ${index + 1}`,
      description: `Mock calendar event for project planning (${formatISO(eventStart, { representation: "date" })})`,
      start: formatISO(eventStart),
      end: formatISO(eventEnd),
      link: `https://calendar.google.com/event?eid=${encodeURIComponent(eventId)}`,
      projectId,
    });
  }

  return events;
}
