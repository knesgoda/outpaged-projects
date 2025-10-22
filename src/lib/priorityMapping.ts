import type { TaskPriority } from "@/types/tasks";

// Helper to map old priority values to new P0-P4 system
export function mapLegacyPriority(oldPriority: string): TaskPriority {
  const mapping: Record<string, TaskPriority> = {
    'urgent': 'P0',
    'high': 'P1',
    'medium': 'P2',
    'low': 'P3',
    'P0': 'P0',
    'P1': 'P1',
    'P2': 'P2',
    'P3': 'P3',
    'P4': 'P4',
  };
  return mapping[oldPriority] || 'P2';
}

export function getPriorityLabel(priority: TaskPriority): string {
  const labels: Record<TaskPriority, string> = {
    'P0': 'Critical',
    'P1': 'High',
    'P2': 'Medium',
    'P3': 'Low',
    'P4': 'Lowest',
  };
  return labels[priority] || priority;
}
