import { differenceInCalendarDays, parseISO } from "date-fns";

import type { CalendarEvent, CalendarVisualCategory } from "@/types/calendar";

export interface VisualCategoryDefinition {
  id: CalendarVisualCategory;
  label: string;
  description: string;
}

export const VISUAL_CATEGORIES: VisualCategoryDefinition[] = [
  {
    id: "priority",
    label: "Priority intensity",
    description: "Critical work glows with stronger color bands to show urgency.",
  },
  {
    id: "tentative",
    label: "Tentative stripes",
    description: "Diagonal stripes indicate tentative commitments that may shift.",
  },
  {
    id: "recurrence-exception",
    label: "Recurring exception dots",
    description: "Dotted overlays call out recurring instances that diverge from the series.",
  },
  {
    id: "multi-day",
    label: "Multi-day crosshatch",
    description: "Crosshatch textures show events spanning multiple days or all-day ranges.",
  },
  {
    id: "milestone",
    label: "Milestone diamonds",
    description: "Diamond badges mark zero-duration milestones and key checkpoints.",
  },
  {
    id: "deadline",
    label: "Deadline markers",
    description: "Thin accent bars mark deadlines generated from tasks and approvals.",
  },
  {
    id: "release",
    label: "Release windows",
    description: "Translucent bands highlight release rollout windows and freeze periods.",
  },
  {
    id: "focus",
    label: "Focus blocks",
    description: "Muted gradients identify focus and availability blocks protected from meetings.",
  },
];

export function eventMatchesVisualCategory(event: CalendarEvent, category: CalendarVisualCategory): boolean {
  switch (category) {
    case "priority":
      return event.priority === "high" || event.priority === "critical";
    case "tentative":
      return event.status === "tentative";
    case "recurrence-exception":
      return Boolean(event.isRecurringException || (event.recurrenceExceptions?.length ?? 0) > 0);
    case "multi-day": {
      const start = parseISO(event.start);
      const end = parseISO(event.end);
      return differenceInCalendarDays(end, start) >= 1 || Boolean(event.allDay);
    }
    case "milestone":
      return event.type === "milestone" || event.status === "milestone";
    case "deadline":
      return Boolean(event.isDeadline);
    case "release":
      return event.type === "release" || Boolean(event.isReleaseWindow);
    case "focus":
      return event.type === "focus" || event.type === "availability";
    default:
      return false;
  }
}

export function describeVisualAffordances(event: CalendarEvent): string {
  const matches = VISUAL_CATEGORIES.filter((category) => eventMatchesVisualCategory(event, category.id));
  if (matches.length === 0) {
    return "Standard event styling";
  }
  return matches.map((match) => match.label).join(", ");
}
