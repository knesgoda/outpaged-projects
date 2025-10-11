import type {
  CalendarAvailabilityBlock,
  CalendarNotification,
  CalendarPerson,
  CalendarResource,
} from "@/types/calendar";

export const MOCK_CALENDAR_PEOPLE: CalendarPerson[] = [
  {
    id: "user-avery",
    name: "Avery",
    role: "Engineering Manager",
    teamId: "team-engineering",
    timezone: "America/New_York",
    workloadTargetHours: 32,
  },
  {
    id: "user-jordan",
    name: "Jordan",
    role: "Senior Engineer",
    teamId: "team-engineering",
    timezone: "America/Los_Angeles",
    workloadTargetHours: 36,
  },
  {
    id: "user-taylor",
    name: "Taylor",
    role: "UX Researcher",
    teamId: "team-research",
    timezone: "America/New_York",
    workloadTargetHours: 30,
  },
  {
    id: "user-morgan",
    name: "Morgan",
    role: "Product Lead",
    teamId: "team-product",
    timezone: "Europe/London",
    workloadTargetHours: 28,
  },
];

export const MOCK_CALENDAR_RESOURCES: CalendarResource[] = [
  {
    id: "room-orion",
    name: "Orion War Room",
    type: "room",
    capacity: 12,
    location: "3F West",
    color: "#f59e0b",
  },
  {
    id: "room-zenith",
    name: "Zenith Boardroom",
    type: "room",
    capacity: 20,
    location: "HQ Level 10",
    color: "#6366f1",
  },
  {
    id: "equip-studio",
    name: "Recording Studio Kit",
    type: "equipment",
    color: "#0ea5e9",
  },
];

export const MOCK_AVAILABILITY: CalendarAvailabilityBlock[] = [
  {
    id: "avail-avery-1",
    ownerId: "user-avery",
    start: "2024-07-17T13:00:00.000Z",
    end: "2024-07-17T15:00:00.000Z",
    type: "busy",
    source: "Focus block",
  },
  {
    id: "avail-avery-2",
    ownerId: "user-avery",
    start: "2024-07-18T09:00:00.000Z",
    end: "2024-07-18T11:00:00.000Z",
    type: "free",
  },
  {
    id: "avail-jordan-1",
    ownerId: "user-jordan",
    start: "2024-07-17T18:00:00.000Z",
    end: "2024-07-17T19:00:00.000Z",
    type: "busy",
    source: "Engineering sync",
  },
  {
    id: "avail-taylor-1",
    ownerId: "user-taylor",
    start: "2024-07-18T09:00:00.000Z",
    end: "2024-07-18T12:00:00.000Z",
    type: "busy",
    source: "Prototype test window",
  },
  {
    id: "avail-morgan-ooo",
    ownerId: "user-morgan",
    start: "2024-07-21T00:00:00.000Z",
    end: "2024-07-23T23:59:59.000Z",
    type: "ooo",
    source: "Summer holiday",
  },
];

export const MOCK_NOTIFICATIONS: CalendarNotification[] = [
  {
    id: "notif-1",
    eventId: "event-1",
    title: "Sprint review starts in 10 minutes",
    start: "2024-07-17T13:50:00.000Z",
    channel: "popup",
    status: "pending",
    actionLabel: "Join sprint review",
  },
  {
    id: "notif-2",
    eventId: "event-5",
    title: "Engineering sync reminder",
    start: "2024-07-16T17:45:00.000Z",
    channel: "slack",
    status: "sent",
  },
  {
    id: "notif-3",
    eventId: "event-6",
    title: "Workshop prep due tomorrow",
    start: "2024-07-19T12:00:00.000Z",
    channel: "email",
    status: "pending",
  },
];
