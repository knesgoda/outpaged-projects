export type Automation = {
  id: string;
  owner: string;
  project_id?: string | null;
  name: string;
  enabled: boolean;
  description?: string | null;
  trigger_type:
    | "on_task_created"
    | "on_task_moved"
    | "on_due_soon"
    | "schedule_cron"
    | AutomationEventType;
  trigger_config: Record<string, unknown>;
  action_type:
    | "create_subtask"
    | "change_status"
    | "send_webhook"
    | "assign"
    | "slack"
    | "webhook"
    | "timer";
  action_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AutomationRun = {
  id: string;
  automation_id: string;
  status: "success" | "error";
  message?: string | null;
  payload?: any;
  created_at: string;
};

export type AutomationGraphNodeType =
  | "trigger"
  | "condition"
  | "action"
  | "if"
  | "switch"
  | "parallel";

export type AutomationGraphNode = {
  id: string;
  type: AutomationGraphNodeType;
  label: string;
  description?: string | null;
  config: Record<string, unknown>;
  position: { x: number; y: number };
  metadata?: {
    branchKeys?: string[];
    icon?: string;
    color?: string;
  };
};

export type AutomationGraphEdge = {
  id: string;
  source: string;
  target: string;
  label?: string | null;
  branchKey?: string | null;
};

export type AutomationGovernance = {
  ownerId?: string | null;
  reviewers?: string[];
  requiresReview?: boolean;
};

export type AutomationVersionSummary = {
  id: string;
  version_number: number;
  created_at: string;
  created_by?: string | null;
  notes?: string | null;
  is_enabled: boolean;
  name?: string | null;
};

export type AutomationRunLog = {
  id: string;
  execution_id: string;
  node_id?: string | null;
  step_id?: string | null;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  duration_ms?: number | null;
  created_at: string;
};

export type AutomationRunDetails = {
  id: string;
  rule_id: string;
  version_id?: string | null;
  executed_at: string;
  success: boolean;
  duration_ms?: number | null;
  trigger_data?: Record<string, unknown> | null;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  logs?: AutomationRunLog[];
};

export type AutomationConflict = {
  automationId: string;
  conflictingAutomationId: string;
  reason: string;
  severity: "warning" | "error";
};

export type AutomationDryRunResult = {
  executionId: string;
  durationMs?: number | null;
  logs: Array<{
    nodeId: string;
    status: "success" | "skipped" | "failed";
    input?: Record<string, unknown> | null;
    output?: Record<string, unknown> | null;
    durationMs?: number | null;
  }>;
};

export type AutomationEventType =
  | "task.created"
  | "task.updated"
  | "task.moved"
  | "task.status_changed"
  | "task.due_soon"
  | "task.timer_started";

export type AutomationFieldType =
  | "text"
  | "textarea"
  | "select"
  | "multi-select"
  | "user"
  | "url"
  | "number"
  | "cron";

export type AutomationFieldSchema = {
  name: string;
  label: string;
  type: AutomationFieldType;
  description?: string;
  placeholder?: string;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
};

export type AutomationActionDefinition = {
  type: "assign" | "slack" | "webhook" | "timer";
  label: string;
  description: string;
  configSchema: AutomationFieldSchema[];
};

export type AutomationRecipeDefinition = {
  slug: string;
  name: string;
  description: string;
  trigger: {
    type: AutomationEventType;
    label: string;
    configSchema: AutomationFieldSchema[];
  };
  actions: AutomationActionDefinition[];
  category?: string;
  preview?: string;
};

export type AutomationCanvasState = {
  nodes: AutomationGraphNode[];
  edges: AutomationGraphEdge[];
};

export type AutomationEventPayload = {
  projectId: string;
  type: AutomationEventType;
  taskId?: string;
  actorId?: string;
  context?: Record<string, unknown>;
};

export type ProjectAutomationConfig = {
  id: string;
  project_id: string;
  recipe_slug: string;
  enabled: boolean;
  trigger_config: Record<string, unknown>;
  action_config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_run_at?: string | null;
};

export type AutomationEvaluationResult = {
  recipe: AutomationRecipeDefinition;
  action: AutomationActionDefinition;
  payload: Record<string, unknown>;
};
