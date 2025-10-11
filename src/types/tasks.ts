/**
 * Enumerations describing core task characteristics.
 */
export type TaskHierarchyLevel = "initiative" | "epic" | "story" | "task" | "subtask";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type TaskType =
  | "bug"
  | "feature_request"
  | "design"
  | "story"
  | "epic"
  | "initiative"
  | "task"
  | "subtask"
  | "idea"
  | "request"
  | "incident"
  | "change"
  | "test"
  | "risk";

export type TaskDependencyType =
  | "blocks"
  | "blocked_by"
  | "relates_to"
  | "duplicates"
  | "fixes"
  | "caused_by"
  | "follows";

export interface TaskAssignee {
  id: string;
  name: string;
  avatar?: string | null;
  initials: string;
}

export interface TaskTag {
  id: string;
  label: string;
  color?: string | null;
  createdAt?: string;
}

export interface TaskFileReference {
  id: string;
  url: string;
  name?: string | null;
  size?: number | null;
  mimeType?: string | null;
  uploadedAt: string;
  uploadedBy?: string | null;
}

export interface TaskLinkReference {
  id: string;
  title?: string | null;
  url: string;
  linkType?: string | null;
  createdAt: string;
  createdBy?: string | null;
}

export interface TaskRelationSummary {
  id: string;
  type: TaskDependencyType | "depends_on";
  direction: "incoming" | "outgoing";
  relatedTaskId: string;
  relatedTaskTitle?: string | null;
  relatedTaskStatus?: TaskStatus | null;
}

export interface TaskSubitemSummary {
  id: string;
  title: string;
  status: TaskStatus;
  completed: boolean;
  rollupWeight?: number | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  storyPoints?: number | null;
}

export interface TaskRollup {
  total: number;
  completed: number;
  progress: number;
  weightedTotal: number;
  weightedCompleted: number;
}

export interface TaskCoreFields {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  hierarchy_level: TaskHierarchyLevel;
  task_type: TaskType;
  project_id: string;
  parent_id?: string | null;
  swimlane_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  story_points?: number | null;
  blocked?: boolean | null;
  blocking_reason?: string | null;
  ticket_number?: number | null;
  created_at?: string;
  updated_at?: string;
  project?: {
    id?: string;
    name?: string | null;
    code?: string | null;
  } | null;
}

export interface TaskWithDetails extends TaskCoreFields {
  assignees: TaskAssignee[];
  tags: TaskTag[];
  tagNames: string[];
  files: TaskFileReference[];
  links: TaskLinkReference[];
  relations: TaskRelationSummary[];
  subitems: TaskSubitemSummary[];
  rollup?: TaskRollup;
  commentCount: number;
  attachmentCount: number;
  externalLinks?: string[];
}
