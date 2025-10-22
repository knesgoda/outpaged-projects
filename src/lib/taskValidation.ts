import type { TaskWithDetails, TaskPriority } from "@/types/tasks";

export interface ValidationRule {
  field: string;
  validate: (value: any, task: Partial<TaskWithDetails>) => boolean;
  message: string;
}

const ALLOWED_STORY_POINTS = [0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100];

export const TASK_VALIDATION_RULES: ValidationRule[] = [
  {
    field: 'title',
    validate: (v) => typeof v === 'string' && v.length > 0 && v.length <= 280,
    message: 'Title must be 1-280 characters'
  },
  {
    field: 'tagNames',
    validate: (v) => !v || (Array.isArray(v) && v.length <= 50 && v.every((l: string) => l.length <= 30)),
    message: 'Max 50 labels, 30 chars each'
  },
  {
    field: 'components',
    validate: (v) => !v || (Array.isArray(v) && v.length <= 50),
    message: 'Max 50 components'
  },
  {
    field: 'estimated_hours',
    validate: (v) => !v || (typeof v === 'number' && v >= 0 && v <= 10000),
    message: 'Estimated hours must be 0-10000'
  },
  {
    field: 'assignees',
    validate: (v) => !v || (Array.isArray(v) && new Set(v.map((a: any) => a.id)).size === v.length),
    message: 'Assignees must be unique'
  },
  {
    field: 'due_date',
    validate: (v, task) => {
      if (!v || !task.start_date) return true;
      return new Date(v) >= new Date(task.start_date);
    },
    message: 'Due date cannot be before start date'
  },
  {
    field: 'story_points',
    validate: (v) => {
      if (!v) return true;
      return ALLOWED_STORY_POINTS.includes(v);
    },
    message: 'Story points must be in Fibonacci sequence: 0, 0.5, 1, 2, 3, 5, 8, 13, 20, 40, 100'
  },
  {
    field: 'parent_id',
    validate: (v, task) => {
      if (task.task_type !== 'subtask') return true;
      return !!v;
    },
    message: 'Subtasks must have a parent'
  },
  {
    field: 'priority',
    validate: (v) => {
      if (!v) return true;
      const validPriorities: TaskPriority[] = ['P0', 'P1', 'P2', 'P3', 'P4'];
      return validPriorities.includes(v as TaskPriority);
    },
    message: 'Priority must be P0, P1, P2, P3, or P4'
  },
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateTask(task: Partial<TaskWithDetails>): ValidationResult {
  const errors: string[] = [];
  
  for (const rule of TASK_VALIDATION_RULES) {
    const value = (task as any)[rule.field];
    if (!rule.validate(value, task)) {
      errors.push(rule.message);
    }
  }
  
  // Required field checks
  if (!task.title || task.title.trim().length === 0) {
    errors.push('Title is required');
  }
  
  if (!task.project_id) {
    errors.push('Project is required');
  }
  
  return { valid: errors.length === 0, errors };
}

export function validateField(
  field: string,
  value: any,
  task: Partial<TaskWithDetails>
): { valid: boolean; error?: string } {
  const rule = TASK_VALIDATION_RULES.find(r => r.field === field);
  if (!rule) return { valid: true };
  
  const valid = rule.validate(value, task);
  return {
    valid,
    error: valid ? undefined : rule.message
  };
}
