import type { CalendarLayer } from "@/types/calendar";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MOCK_CALENDARS: CalendarLayer[] = [
  {
    id: "calendar.personal",
    name: "Personal Calendar",
    type: "personal",
    color: "#2563eb",
    description: "Focus blocks, reminders, and personal appointments",
    subscribed: true,
    visible: true,
    timezone: "America/New_York",
  },
  {
    id: "calendar.team.engineering",
    name: "Engineering Team",
    type: "team",
    color: "#9333ea",
    description: "Shared sprint rituals and team ceremonies",
    subscribed: true,
    visible: true,
    timezone: "America/Los_Angeles",
  },
  {
    id: "calendar.project.apollo",
    name: "Project Apollo",
    type: "project",
    color: "#0ea5e9",
    description: "Milestones and deadlines for Project Apollo",
    subscribed: true,
    visible: true,
    timezone: "UTC",
  },
  {
    id: "calendar.workspace",
    name: "Workspace Wide",
    type: "workspace",
    color: "#16a34a",
    description: "Company holidays, all-hands, and workspace-wide events",
    subscribed: true,
    visible: false,
    timezone: "UTC",
  },
  {
    id: "calendar.external.google",
    name: "Google Calendar",
    type: "external",
    color: "#f97316",
    description: "Two-way sync with connected Google Calendar account",
    subscribed: false,
    visible: false,
    timezone: "America/New_York",
    isReadOnly: true,
  },
];

export async function fetchCalendarLayers(): Promise<CalendarLayer[]> {
  await delay(120);
  return MOCK_CALENDARS.map((calendar) => ({ ...calendar }));
}

export async function persistCalendarPreferences(calendars: CalendarLayer[]): Promise<void> {
  console.info("Persisting calendar preferences", calendars);
  await delay(80);
}
