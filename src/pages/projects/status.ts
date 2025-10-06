import type { ProjectStatus } from "@/hooks/useProjects";

export function getProjectStatusLabel(status: ProjectStatus) {
  switch (status) {
    case "active":
      return "Active";
    case "archived":
      return "Archived";
    case "completed":
      return "Completed";
    case "on_hold":
      return "On hold";
    case "planning":
      return "Planning";
    default:
      return status;
  }
}

export function getProjectStatusVariant(status: ProjectStatus): "default" | "secondary" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "archived":
      return "outline";
    case "completed":
      return "secondary";
    default:
      return "secondary";
  }
}
