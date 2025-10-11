export type Automation = {
  id: string;
  owner: string;
  project_id?: string | null;
  name: string;
  enabled: boolean;
  trigger_type:
    | "on_task_created"
    | "on_task_moved"
    | "on_due_soon"
    | "schedule_cron";
  trigger_config: any;
  action_type: "create_subtask" | "change_status" | "send_webhook";
  action_config: any;
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
