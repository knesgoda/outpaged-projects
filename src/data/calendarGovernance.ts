import type {
  CalendarDefaultSettings,
  CalendarDocumentationEntry,
  CalendarGovernanceSettings,
} from "@/types/calendar";

export const CALENDAR_DEFAULT_SETTINGS: CalendarDefaultSettings = {
  defaultView: "week",
  workingHoursStart: 9,
  workingHoursEnd: 17,
  snapMinutes: 15,
  defaultReminderMinutes: 10,
  defaultVisibility: "team",
  defaultTimezone: "UTC",
  maxEventDurationHours: 8,
  colorEncoding: "calendar",
};

export const CALENDAR_GOVERNANCE_SETTINGS: CalendarGovernanceSettings = {
  activeHolidaySet: "us-national",
  holidaySets: [
    { id: "us-national", name: "US National", active: true },
    { id: "emea", name: "EMEA Regional", active: false },
  ],
  integrationLimits: [
    { provider: "google", maxConnections: 5 },
    { provider: "outlook", maxConnections: 3 },
    { provider: "apple", maxConnections: 2 },
  ],
  retentionPolicy: {
    retainEventsMonths: 24,
    purgeAttachments: false,
  },
  dataResidency: "us-east",
  delegationPolicies: [
    { id: "delegation-default", name: "Default delegation", enabled: true },
    { id: "delegation-exec", name: "Executive assistant", enabled: true },
  ],
  complianceExportsEnabled: true,
  encryptionAtRest: true,
};

export const CALENDAR_DOCUMENTATION: CalendarDocumentationEntry[] = [
  {
    id: "docs-visual-encoding",
    title: "Understand calendar visual encoding",
    description: "Learn how stripes, dots, and badges communicate status and urgency.",
    href: "https://example.com/docs/calendar-visuals",
  },
  {
    id: "docs-automation",
    title: "Calendar automations",
    description: "Configure rules to sync tasks, releases, and vacations automatically.",
    href: "https://example.com/docs/calendar-automation",
  },
  {
    id: "docs-governance",
    title: "Governance & compliance",
    description: "Manage retention, residency, and audit exports for calendar data.",
    href: "https://example.com/docs/calendar-governance",
  },
];
