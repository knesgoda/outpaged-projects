import type { BadgeProps } from "@/components/ui/badge";
import type { ProjectStatus } from "@/services/projects";

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planning: "Planning",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  cancelled: "Cancelled",
  archived: "Archived",
};

const PROJECT_STATUS_BADGE_VARIANTS: Record<ProjectStatus, BadgeProps["variant"]> = {
  planning: "outline",
  active: "default",
  on_hold: "outline",
  completed: "secondary",
  cancelled: "destructive",
  archived: "secondary",
};

export const PROJECT_STATUS_FILTER_ORDER: ProjectStatus[] = [
  "planning",
  "active",
  "on_hold",
  "completed",
  "cancelled",
  "archived",
];

export const PROJECT_STATUS_FILTER_OPTIONS = PROJECT_STATUS_FILTER_ORDER.map(status => ({
  value: status,
  label: PROJECT_STATUS_LABELS[status],
}));

export function isProjectStatus(value: string | null | undefined): value is ProjectStatus {
  return Boolean(value && value in PROJECT_STATUS_LABELS);
}

export function formatProjectStatus(status?: string | null): string {
  if (!status) {
    return "Unknown";
  }

  if (isProjectStatus(status)) {
    return PROJECT_STATUS_LABELS[status];
  }

  return status
    .split(/[_\s]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getProjectStatusBadgeVariant(status: ProjectStatus | string): BadgeProps["variant"] {
  if (isProjectStatus(status)) {
    return PROJECT_STATUS_BADGE_VARIANTS[status];
  }

  return "secondary";
}
