import type {
  CalendarAutomationRule,
  CalendarComment,
  CalendarDelegation,
  CalendarFollower,
  CalendarHoliday,
  CalendarIntegration,
  CalendarInvitation,
  CalendarOutOfOffice,
  CalendarShareSetting,
  CalendarWorkingHours,
  SchedulingAssistantSuggestion,
} from "@/types/calendar";

export const MOCK_CALENDAR_INTEGRATIONS: CalendarIntegration[] = [
  {
    id: "integration-google",
    provider: "google",
    accountEmail: "avery@example.com",
    status: "connected",
    lastSyncAt: "2024-07-16T18:45:00.000Z",
    conflictPreference: "platform",
    calendarsLinked: 3,
    scopes: ["events.read", "events.write"],
  },
  {
    id: "integration-outlook",
    provider: "outlook",
    accountEmail: "team-ops@example.com",
    status: "syncing",
    lastSyncAt: "2024-07-17T09:10:00.000Z",
    conflictPreference: "external",
    calendarsLinked: 2,
    scopes: ["calendars.read"],
  },
  {
    id: "integration-apple",
    provider: "apple",
    accountEmail: "product@example.com",
    status: "disconnected",
    conflictPreference: "platform",
    calendarsLinked: 0,
    scopes: ["calendars.read"],
  },
];

export const MOCK_AUTOMATION_RULES: CalendarAutomationRule[] = [
  {
    id: "automation-create-task",
    name: "Create follow-up task",
    description: "When a meeting is created with #action tag create a follow-up task",
    trigger: "event-created",
    action: "create-task",
    enabled: true,
    config: { projectId: "apollo", label: "Action item" },
  },
  {
    id: "automation-post-channel",
    name: "Post release milestones to #launches",
    trigger: "event-created",
    action: "post-channel",
    enabled: true,
    config: { channel: "#launches" },
  },
  {
    id: "automation-add-sprint",
    name: "Add sprint ceremonies to active sprint",
    trigger: "event-updated",
    action: "add-to-sprint",
    enabled: false,
    config: { sprintId: "sprint-24" },
  },
];

export const MOCK_SHARE_SETTINGS: CalendarShareSetting[] = [
  {
    id: "share-team-engineering",
    calendarId: "calendar.team.engineering",
    target: { id: "team-engineering", type: "team", name: "Engineering" },
    role: "editor",
    canShare: true,
    subscribed: true,
  },
  {
    id: "share-product-leads",
    calendarId: "calendar.project.apollo",
    target: { id: "group-product", type: "group", name: "Product Leads" },
    role: "viewer",
    subscribed: true,
  },
  {
    id: "share-exec",
    calendarId: "calendar.workspace",
    target: { id: "user-ceo", type: "user", name: "Jamie", email: "jamie@example.com" },
    role: "manager",
    canShare: true,
    subscribed: true,
  },
];

export const MOCK_INVITATIONS: CalendarInvitation[] = [
  {
    id: "invite-1",
    eventId: "event-1",
    invitee: { id: "user-taylor", type: "user", name: "Taylor", email: "taylor@example.com" },
    status: "accepted",
    respondedAt: "2024-07-14T12:00:00.000Z",
  },
  {
    id: "invite-2",
    eventId: "event-5",
    invitee: { id: "user-morgan", type: "user", name: "Morgan", email: "morgan@example.com" },
    status: "needs-action",
    icsUrl: "https://calendar.example.com/event-5.ics",
  },
  {
    id: "invite-3",
    eventId: "event-6",
    invitee: { id: "external-client", type: "external", name: "Client Stakeholder", email: "client@example.org" },
    status: "tentative",
  },
];

export const MOCK_CALENDAR_FOLLOWERS: CalendarFollower[] = [
  {
    id: "follower-1",
    target: { id: "user-avery", type: "user", name: "Avery" },
    subscribedAt: "2024-07-01T09:00:00.000Z",
  },
  {
    id: "follower-2",
    target: { id: "user-operations", type: "group", name: "Operations" },
    subscribedAt: "2024-07-05T11:30:00.000Z",
  },
];

export const MOCK_EVENT_COMMENTS: CalendarComment[] = [
  {
    id: "comment-1",
    eventId: "event-1",
    authorId: "user-avery",
    authorName: "Avery",
    createdAt: "2024-07-15T10:12:00.000Z",
    body: "Please @Taylor confirm agenda notes by EOD.",
    mentions: [{ id: "user-taylor", name: "Taylor" }],
  },
  {
    id: "comment-2",
    eventId: "event-1",
    authorId: "user-morgan",
    authorName: "Morgan",
    createdAt: "2024-07-16T08:45:00.000Z",
    body: "Added release checklist to attachments.",
  },
];

export const MOCK_WORKING_HOURS: CalendarWorkingHours[] = [
  {
    ownerId: "user-avery",
    timezone: "America/New_York",
    days: {
      monday: { enabled: true, startHour: 9, endHour: 17 },
      tuesday: { enabled: true, startHour: 9, endHour: 17 },
      wednesday: { enabled: true, startHour: 9, endHour: 17 },
      thursday: { enabled: true, startHour: 9, endHour: 17 },
      friday: { enabled: true, startHour: 9, endHour: 16 },
      saturday: { enabled: false, startHour: 0, endHour: 0 },
      sunday: { enabled: false, startHour: 0, endHour: 0 },
    },
  },
  {
    ownerId: "team-engineering",
    timezone: "America/New_York",
    days: {
      monday: { enabled: true, startHour: 10, endHour: 18 },
      tuesday: { enabled: true, startHour: 10, endHour: 18 },
      wednesday: { enabled: true, startHour: 10, endHour: 18 },
      thursday: { enabled: true, startHour: 10, endHour: 18 },
      friday: { enabled: true, startHour: 10, endHour: 16 },
      saturday: { enabled: false, startHour: 0, endHour: 0 },
      sunday: { enabled: false, startHour: 0, endHour: 0 },
    },
  },
];

export const MOCK_HOLIDAYS: CalendarHoliday[] = [
  { id: "holiday-1", name: "Independence Day", date: "2024-07-04", region: "US" },
  { id: "holiday-2", name: "Summer Bank Holiday", date: "2024-08-26", region: "UK" },
];

export const MOCK_OUT_OF_OFFICE: CalendarOutOfOffice[] = [
  {
    id: "ooo-avery",
    ownerId: "user-avery",
    start: "2024-07-24T00:00:00.000Z",
    end: "2024-07-26T23:59:59.000Z",
    message: "Out of office for conference",
    status: "scheduled",
  },
  {
    id: "ooo-taylor",
    ownerId: "user-taylor",
    start: "2024-07-19T00:00:00.000Z",
    end: "2024-07-19T23:59:59.000Z",
    message: "Field research day",
    status: "active",
  },
];

export const MOCK_SCHEDULING_SUGGESTIONS: SchedulingAssistantSuggestion[] = [
  {
    id: "suggestion-1",
    start: "2024-07-18T14:00:00.000Z",
    end: "2024-07-18T15:00:00.000Z",
    attendeeIds: ["user-avery", "user-jordan", "user-taylor"],
    score: 0.92,
    reason: "Within shared working hours and no conflicts",
    type: "primary",
  },
  {
    id: "suggestion-2",
    start: "2024-07-18T16:30:00.000Z",
    end: "2024-07-18T17:00:00.000Z",
    attendeeIds: ["user-avery", "user-jordan"],
    score: 0.78,
    reason: "One attendee near focus block",
    type: "alternative",
    conflicts: ["event-4"],
  },
  {
    id: "suggestion-3",
    start: "2024-07-19T13:00:00.000Z",
    end: "2024-07-19T14:00:00.000Z",
    attendeeIds: ["user-morgan", "user-taylor"],
    score: 0.68,
    reason: "Friday afternoon outside Morgan's preferred hours",
    type: "alternative",
  },
];

export const MOCK_CALENDAR_DELEGATIONS: CalendarDelegation[] = [
  {
    id: "delegation-1",
    ownerId: "user-avery",
    delegateId: "user-jordan",
    delegateName: "Jordan",
    scope: "edit",
    expiresAt: "2024-09-01T00:00:00.000Z",
  },
];
