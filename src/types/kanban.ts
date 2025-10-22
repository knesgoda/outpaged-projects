// Kanban-specific type definitions

export type ColumnCategory = 'Todo' | 'InProgress' | 'Done';

export type SwimlaneMode = 
  | 'none' 
  | 'assignee' 
  | 'epic' 
  | 'project' 
  | 'priority' 
  | 'query' 
  | 'custom_field' 
  | 'group';

export type WIPStatus = 'ok' | 'soft' | 'hard';

export interface WIPLimit {
  soft?: number;
  hard?: number;
  policy?: 'warn' | 'block' | 'allow_override';
}

export interface ColumnMetadata {
  wip?: WIPLimit;
  entryPolicy?: string[]; // e.g., ['requireAssignee', 'requireEstimate']
  exitChecklistTemplateId?: string;
  autoAssign?: boolean;
  autoLabel?: string[];
  slaHours?: number;
}

export interface KanbanColumn {
  id: string;
  project_id: string;
  name: string;
  position: number;
  color?: string;
  wip_limit?: number;
  status_keys: string[];
  category: ColumnCategory;
  metadata: ColumnMetadata;
  collapsed: boolean;
  sort_override?: any;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Swimlane {
  id: string;
  project_id: string;
  name: string;
  position: number;
  color?: string;
  field?: string;
  value?: any;
  opql?: string;
  wip_limit?: number;
  is_expedite: boolean;
  collapsed: boolean;
  metadata: any;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface BoardConfig {
  id: string;
  board_id: string;
  opql?: string;
  swimlane_mode: SwimlaneMode;
  include_unassigned_lane: boolean;
  card_layout: {
    size: 'sm' | 'md' | 'lg';
    fields: string[];
    progress: 'auto' | 'checklist' | 'subtasks' | 'time';
    showAvatars: boolean;
    showAging: boolean;
    showBlockedPill: boolean;
    colorBy: 'priority' | 'status' | 'assignee' | 'dueDate';
  };
  quick_filters: Array<{
    id: string;
    name: string;
    opql: string;
  }>;
  policies: {
    allowCrossProject: boolean;
    allowStatusBypass: boolean;
    autoAssignOnDrop: boolean;
  };
  backlog_config: {
    enabled: boolean;
    statuses: string[];
    showEstimates: boolean;
  };
  sprint_config: {
    id?: string;
    allowCarryover: boolean;
  };
  analytics_config: {
    defaultCharts: string[];
    sla: Record<string, number>;
  };
  created_at: string;
  updated_at: string;
}

export interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal?: string;
  start_date: string;
  end_date: string;
  status: 'planned' | 'active' | 'completed';
  capacity_hours?: number;
  capacity_points?: number;
  completed_at?: string;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export interface SprintItem {
  id: string;
  sprint_id: string;
  task_id: string;
  added_at: string;
  removed_at?: string;
  carried_over: boolean;
}

export interface WIPValidationResult {
  allowed: boolean;
  severity: WIPStatus;
  reason?: string;
  currentCount: number;
  limit?: number;
}

export interface ColumnMoveValidation {
  allowed: boolean;
  reason?: string;
  severity?: 'warn' | 'block';
  failures?: string[];
}
