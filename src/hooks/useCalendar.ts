import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import type {
  CalendarColorEncoding,
  CalendarEvent,
  CalendarEventPriority,
  CalendarEventStatus,
  CalendarEventType,
  CalendarEventResource,
} from "@/types/calendar";

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

const ROOMS: CalendarEventResource[] = [
  {
    id: "room-orion",
    name: "Orion War Room",
    type: "room",
    capacity: 12,
    location: "3F West",
  },
  {
    id: "room-zenith",
    name: "Zenith Boardroom",
    type: "room",
    capacity: 20,
    location: "HQ Level 10",
  },
  {
    id: "equip-studio",
    name: "Recording Studio Kit",
    type: "equipment",
  },
];

const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: "event-1",
    calendarId: "calendar.project.apollo",
    projectId: "apollo",
    title: "Sprint review",
    status: "confirmed",
    type: "sprint",
    priority: "high",
    organizer: "Avery",
    attendees: [
      { id: "user-avery", name: "Avery" },
      { id: "user-jordan", name: "Jordan" },
    ],
    start: "2024-07-17T14:00:00.000Z",
    end: "2024-07-17T15:00:00.000Z",
    videoLink: "https://meet.example.com/review",
    reminders: [
      { id: "rem-1", offsetMinutes: 10, method: "popup" },
      { id: "rem-2", offsetMinutes: 30, method: "email" },
    ],
    linkedItems: [
      { id: "task-99", type: "task", label: "Finalize demo" },
      { id: "sprint-12", type: "sprint", label: "Sprint 24" },
    ],
    description: "Review sprint goals and demo progress.",
    createdAt: "2024-07-01T12:00:00.000Z",
    updatedAt: "2024-07-09T12:00:00.000Z",
    ownerId: "user-avery",
    ownerName: "Avery",
    teamId: "team-engineering",
    teamName: "Engineering",
    labels: ["meeting", "sprint"],
    hasAttachments: true,
    hasReminders: true,
  },
  {
    id: "event-2",
    calendarId: "calendar.project.apollo",
    projectId: "apollo",
    title: "Milestone: API freeze",
    status: "milestone",
    type: "milestone",
    priority: "critical",
    start: "2024-07-19T00:00:00.000Z",
    end: "2024-07-19T23:59:59.000Z",
    allDay: true,
    linkedItems: [{ id: "release-7", type: "release", label: "Apollo 2.0" }],
    reminders: [{ id: "rem-3", offsetMinutes: 60 * 24, method: "email" }],
    description: "Freeze API surface to prepare for release hardening.",
    createdAt: "2024-07-01T10:00:00.000Z",
    updatedAt: "2024-07-03T18:00:00.000Z",
    ownerId: "user-morgan",
    ownerName: "Morgan",
    teamId: "team-product",
    teamName: "Product",
    labels: ["milestone", "release"],
    hasReminders: true,
  },
  {
    id: "event-3",
    calendarId: "calendar.workspace",
    projectId: "workspace",
    title: "Company All-Hands",
    status: "confirmed",
    type: "meeting",
    priority: "normal",
    start: "2024-07-18T16:00:00.000Z",
    end: "2024-07-18T17:00:00.000Z",
    location: "Auditorium",
    attendees: [
      { id: "user-all", name: "Everyone" },
    ],
    reminders: [{ id: "rem-4", offsetMinutes: 15, method: "slack" }],
    description: "Monthly workspace update meeting.",
    createdAt: "2024-06-28T09:00:00.000Z",
    ownerId: "user-avery",
    ownerName: "Avery",
    teamId: "team-executive",
    teamName: "Executive",
    labels: ["allhands"],
    resources: [ROOMS[1]],
    resourceIds: [ROOMS[1].id],
    hasReminders: true,
  },
  {
    id: "event-4",
    calendarId: "calendar.personal",
    projectId: "personal",
    title: "Focus block",
    status: "busy",
    type: "focus",
    priority: "normal",
    start: "2024-07-17T13:00:00.000Z",
    end: "2024-07-17T15:00:00.000Z",
    reminders: [{ id: "rem-5", offsetMinutes: 5, method: "popup" }],
    description: "Heads-down time for planning.",
    ownerId: "user-avery",
    ownerName: "Avery",
    teamId: "team-engineering",
    teamName: "Engineering",
    labels: ["focus"],
    hasReminders: true,
  },
  {
    id: "event-5",
    calendarId: "calendar.team.engineering",
    projectId: "team",
    title: "Engineering Sync",
    status: "confirmed",
    type: "meeting",
    priority: "normal",
    organizer: "Jordan",
    attendees: [
      { id: "user-avery", name: "Avery" },
      { id: "user-jordan", name: "Jordan" },
      { id: "user-taylor", name: "Taylor" },
    ],
    start: "2024-07-16T18:00:00.000Z",
    end: "2024-07-16T19:00:00.000Z",
    videoLink: "https://zoom.example.com/engineering",
    reminders: [{ id: "rem-6", offsetMinutes: 15, method: "email" }],
    description: "Weekly engineering touchpoint.",
    ownerId: "user-jordan",
    ownerName: "Jordan",
    teamId: "team-engineering",
    teamName: "Engineering",
    labels: ["sync", "meeting"],
    resources: [ROOMS[0]],
    resourceIds: [ROOMS[0].id],
    hasReminders: true,
  },
  {
    id: "event-6",
    calendarId: "calendar.external.google",
    projectId: "external",
    title: "External workshop",
    status: "tentative",
    type: "meeting",
    priority: "high",
    start: "2024-07-20T14:00:00.000Z",
    end: "2024-07-20T16:00:00.000Z",
    location: "Client HQ",
    reminders: [{ id: "rem-7", offsetMinutes: 60, method: "email" }],
    description: "Workshop with strategic partner.",
    visibility: "project",
    ownerId: "user-taylor",
    ownerName: "Taylor",
    teamId: "team-research",
    teamName: "Research",
    labels: ["workshop", "external"],
    resources: [ROOMS[2]],
    resourceIds: [ROOMS[2].id],
    hasReminders: true,
  },
  {
    id: "event-7",
    calendarId: "calendar.team.engineering",
    projectId: "team",
    title: "Daily stand-up",
    status: "confirmed",
    type: "meeting",
    priority: "normal",
    recurrenceRule: "FREQ=DAILY;COUNT=10",
    start: "2024-07-15T15:00:00.000Z",
    end: "2024-07-15T15:15:00.000Z",
    isRecurringInstance: true,
    description: "Quick alignment across the team.",
    ownerId: "user-jordan",
    ownerName: "Jordan",
    teamId: "team-engineering",
    teamName: "Engineering",
    labels: ["daily"],
    hasReminders: true,
  },
  {
    id: "event-8",
    calendarId: "calendar.personal",
    projectId: "personal",
    title: "Out of office",
    status: "busy",
    type: "availability",
    priority: "low",
    start: "2024-07-21T00:00:00.000Z",
    end: "2024-07-23T23:59:59.000Z",
    allDay: true,
    description: "Weekend trip. Auto-decline invites.",
    ownerId: "user-avery",
    ownerName: "Avery",
    teamId: "team-engineering",
    teamName: "Engineering",
    labels: ["ooo"],
  },
  {
    id: "event-9",
    calendarId: "calendar.team.engineering",
    projectId: "team",
    title: "Prototype test window",
    status: "busy",
    type: "task",
    priority: "high",
    start: "2024-07-18T09:00:00.000Z",
    end: "2024-07-18T12:00:00.000Z",
    linkedItems: [{ id: "task-112", type: "task", label: "QA scenario matrix" }],
    attachments: [{ id: "attach-1", name: "Test-plan.pdf", url: "https://example.com/test-plan.pdf" }],
    description: "Reserve usability lab for prototype validation.",
    resources: [ROOMS[0], ROOMS[2]],
    resourceIds: [ROOMS[0].id, ROOMS[2].id],
    ownerId: "user-taylor",
    ownerName: "Taylor",
    teamId: "team-research",
    teamName: "Research",
    labels: ["prototype", "lab"],
    hasAttachments: true,
    hasReminders: true,
  },
];

function parseDate(value?: string | null) {
  if (!value) return null;
  const result = new Date(value);
  return Number.isNaN(result.getTime()) ? null : result;
}

function overlapsRange(event: CalendarEvent, from: Date, to: Date) {
  const start = parseDate(event.start) ?? parseDate(event.end);
  const end = parseDate(event.end) ?? parseDate(event.start);
  if (!start || !end) {
    return false;
  }
  return start <= to && end >= from;
}

export function useCalendarRange(range: CalendarRange) {
  const { from, to, projectId, calendarIds, colorEncoding } = range;
  const key = useMemo(
    () =>
      [
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
      await new Promise((resolve) => setTimeout(resolve, 90));
      const filtered = MOCK_EVENTS.filter((event) => {
        if (projectId && event.projectId !== projectId) {
          return false;
        }
        if (calendarIds && calendarIds.length > 0) {
          return calendarIds.includes(event.calendarId) && overlapsRange(event, from, to);
        }
        return overlapsRange(event, from, to);
      });

      return filtered.map((event) => ({
        ...event,
        color: event.color ?? inferColor(event, colorEncoding),
        hasAttachments: event.hasAttachments ?? (event.attachments?.length ?? 0) > 0,
        hasReminders: event.hasReminders ?? (event.reminders?.length ?? 0) > 0,
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

const STATUS_COLORS: Record<CalendarEventStatus, string> = {
  confirmed: "#2563eb",
  tentative: "#facc15",
  cancelled: "#9ca3af",
  milestone: "#d946ef",
  busy: "#f97316",
};

const PRIORITY_COLORS: Record<CalendarEventPriority, string> = {
  low: "#22c55e",
  normal: "#0ea5e9",
  high: "#f97316",
  critical: "#ef4444",
};

const TYPE_COLORS: Record<CalendarEventType, string> = {
  meeting: "#3b82f6",
  task: "#6366f1",
  milestone: "#d946ef",
  sprint: "#22d3ee",
  release: "#facc15",
  focus: "#16a34a",
  availability: "#94a3b8",
};

function inferColor(event: CalendarEvent, colorEncoding?: CalendarColorEncoding) {
  if (!colorEncoding || colorEncoding === "calendar") {
    return undefined;
  }
  if (colorEncoding === "status" && event.status) {
    return STATUS_COLORS[event.status];
  }
  if (colorEncoding === "priority" && event.priority) {
    return PRIORITY_COLORS[event.priority];
  }
  if (colorEncoding === "type" && event.type) {
    return TYPE_COLORS[event.type];
  }
  return undefined;
}
