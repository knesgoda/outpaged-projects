import type { Database } from "@/integrations/supabase/types";

export type BoardType = Database["public"]["Enums"]["board_type"];

export type BoardRow = Database["public"]["Tables"]["boards"]["Row"];
export type BoardScopeRow = Database["public"]["Tables"]["board_scopes"]["Row"];
export type BoardViewRow = Database["public"]["Tables"]["board_views"]["Row"];
export type BoardFilterExpressionRow =
  Database["public"]["Tables"]["board_filter_expressions"]["Row"];

export interface Board {
  id: BoardRow["id"];
  workspaceId: BoardRow["workspace_id"];
  name: BoardRow["name"];
  description?: BoardRow["description"];
  type: BoardType;
  createdBy?: BoardRow["created_by"];
  createdAt: BoardRow["created_at"];
  updatedAt: BoardRow["updated_at"];
}

export interface ContainerBoardScope {
  id: BoardScopeRow["id"];
  boardId: BoardScopeRow["board_id"];
  type: Extract<BoardType, "container" | "hybrid">;
  containerId: NonNullable<BoardScopeRow["container_id"]>;
  containerFilters: Record<string, unknown>;
  metadata: Record<string, unknown>;
  defaults: BoardDefaultSettings;
  createdAt: BoardScopeRow["created_at"];
  updatedAt: BoardScopeRow["updated_at"];
}

export interface QueryBoardScope {
  id: BoardScopeRow["id"];
  boardId: BoardScopeRow["board_id"];
  type: Extract<BoardType, "query" | "hybrid">;
  query: NonNullable<BoardScopeRow["query_definition"]>;
  queryFilters: Record<string, unknown>;
  metadata: Record<string, unknown>;
  defaults: BoardDefaultSettings;
  createdAt: BoardScopeRow["created_at"];
  updatedAt: BoardScopeRow["updated_at"];
}

export type BoardScope =
  | (ContainerBoardScope & { type: "container" })
  | (QueryBoardScope & { type: "query" })
  | (ContainerBoardScope & QueryBoardScope & { type: "hybrid" });

export interface ContainerFilterExpression {
  id: BoardFilterExpressionRow["id"];
  boardId: BoardFilterExpressionRow["board_id"];
  type: Extract<BoardType, "container" | "hybrid">;
  containerId: string;
  containerFilters: Record<string, unknown>;
  refreshIntervalSeconds?: BoardFilterExpressionRow["refresh_interval_seconds"];
  lastEvaluatedAt?: BoardFilterExpressionRow["last_evaluated_at"];
  metadata: Record<string, unknown>;
  createdAt: BoardFilterExpressionRow["created_at"];
  updatedAt: BoardFilterExpressionRow["updated_at"];
}

export interface QueryFilterExpression {
  id: BoardFilterExpressionRow["id"];
  boardId: BoardFilterExpressionRow["board_id"];
  type: Extract<BoardType, "query" | "hybrid">;
  query: string;
  queryFilters: Record<string, unknown>;
  refreshIntervalSeconds?: BoardFilterExpressionRow["refresh_interval_seconds"];
  lastEvaluatedAt?: BoardFilterExpressionRow["last_evaluated_at"];
  metadata: Record<string, unknown>;
  createdAt: BoardFilterExpressionRow["created_at"];
  updatedAt: BoardFilterExpressionRow["updated_at"];
}

export type BoardFilterExpression =
  | (ContainerFilterExpression & { type: "container" })
  | (QueryFilterExpression & { type: "query" })
  | (ContainerFilterExpression & QueryFilterExpression & { type: "hybrid" });

export interface ViewColumnPreferences {
  order: string[];
  hidden: string[];
}

export type BoardViewMode = "table" | "kanban" | "timeline" | "calendar" | "master";

export interface BoardTimelineWorkingHours {
  timezone: string;
  startHour: number;
  endHour: number;
}

export interface BoardWorkingTimeDefaults extends BoardTimelineWorkingHours {}

export interface BoardCardFieldPreset {
  field: string;
  visible: boolean;
}

export type BoardBacklogRankingMode = "manual" | "automatic";

export interface BoardDefaultSettings {
  defaultViewMode: BoardViewMode;
  availableViewModes: BoardViewMode[];
  colorField: string;
  colorMode: "status" | "priority" | "custom";
  wipEnabled: boolean;
  backlogRanking: BoardBacklogRankingMode;
  showWeekendShading: boolean;
  workingTime: BoardWorkingTimeDefaults;
  cardFieldPresets: BoardCardFieldPreset[];
}

export type PartialBoardDefaultSettings = Partial<
  Omit<BoardDefaultSettings, "availableViewModes" | "cardFieldPresets" | "workingTime">
> & {
  availableViewModes?: BoardViewMode[];
  cardFieldPresets?: BoardCardFieldPreset[];
  workingTime?: Partial<BoardWorkingTimeDefaults>;
};

export interface BoardViewSortRule {
  id: string;
  field: string;
  direction: "asc" | "desc";
  priority: number;
  manual?: boolean;
  label?: string;
}

export interface BoardSwimlaneDefinition {
  id: string;
  label: string;
  value: unknown;
  order?: number;
  color?: string;
  description?: string;
  isDefault?: boolean;
  field?: string;
  valueKey?: string;
}

export interface BoardViewGroupingConfiguration {
  primary: string | null;
  swimlaneField?: string | null;
  swimlanes: BoardSwimlaneDefinition[];
}

export type BoardColorRuleType = "status" | "priority" | "formula";

export interface BoardColorRule {
  id: string;
  label: string;
  type: BoardColorRuleType;
  color: string;
  field?: string;
  value?: unknown;
  description?: string;
  expression?: string;
}

export interface BoardViewTimelineSettings {
  startField: string;
  endField: string;
  dependencyField?: string;
  showWeekends?: boolean;
  workingHours?: BoardTimelineWorkingHours;
}

export interface MasterBoardViewFilters {
  projectIds: string[];
  componentIds: string[];
  versionIds: string[];
}

export interface MasterBoardViewSettings {
  showColorStrips?: boolean;
  filters?: MasterBoardViewFilters;
}

export interface BoardViewConfiguration {
  mode: BoardViewMode;
  filters: Record<string, unknown>;
  grouping: BoardViewGroupingConfiguration;
  sort: BoardViewSortRule[];
  columnPreferences: ViewColumnPreferences;
  timeline?: BoardViewTimelineSettings | null;
  colorRules?: BoardColorRule[];
  master?: MasterBoardViewSettings | null;
}

export interface BoardViewDefinition {
  id: BoardViewRow["id"];
  boardId: BoardViewRow["board_id"];
  name: BoardViewRow["name"];
  slug: BoardViewRow["slug"];
  description?: BoardViewRow["description"];
  isDefault: BoardViewRow["is_default"];
  order: BoardViewRow["position"];
  configuration: BoardViewConfiguration;
  columnPreferences: ViewColumnPreferences;
  filterExpression?: BoardFilterExpression | null;
  createdAt: BoardViewRow["created_at"];
  updatedAt: BoardViewRow["updated_at"];
}

export type HydratedBoard = Board & {
  scope: BoardScope | null;
  views: BoardViewDefinition[];
};

export interface ExecuteBoardViewOptions {
  cursor?: string | null;
  since?: string | null;
  limit?: number;
}

export interface BoardViewResult<T = Record<string, unknown>> {
  items: T[];
  cursor: string | null;
  hasMore: boolean;
  refreshedAt: string;
  durationMs?: number | null;
}

export interface CreateContainerScopeInput {
  type: "container";
  containerId: string;
  containerFilters?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  defaults?: PartialBoardDefaultSettings;
}

export interface CreateQueryScopeInput {
  type: "query";
  query: string;
  queryFilters?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  defaults?: PartialBoardDefaultSettings;
}

export interface CreateHybridScopeInput {
  type: "hybrid";
  containerId: string;
  query: string;
  containerFilters?: Record<string, unknown>;
  queryFilters?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  defaults?: PartialBoardDefaultSettings;
}

export type CreateBoardScopeInput =
  | CreateContainerScopeInput
  | CreateQueryScopeInput
  | CreateHybridScopeInput;

export interface CreateFilterExpressionInput {
  type: BoardType;
  containerId?: string;
  query?: string;
  containerFilters?: Record<string, unknown>;
  queryFilters?: Record<string, unknown>;
  refreshIntervalSeconds?: number | null;
  metadata?: Record<string, unknown>;
}

export interface CreateBoardViewInput {
  name: string;
  slug?: string;
  description?: string;
  isDefault?: boolean;
  order?: number;
  configuration?: Record<string, unknown>;
  filter?: CreateFilterExpressionInput | null;
}

export interface CreateBoardInput {
  workspaceId: BoardRow["workspace_id"];
  name: BoardRow["name"];
  description?: BoardRow["description"];
  scope: CreateBoardScopeInput;
  views?: CreateBoardViewInput[];
}

export type BoardTemplateVisibility =
  Database["public"]["Enums"]["board_template_visibility"];

export interface BoardTemplateField {
  id: string;
  templateId: string;
  key: string;
  label: string;
  type: string;
  configuration: Record<string, unknown>;
  isRequired: boolean;
  isPrimary: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoardTemplateAutomation {
  id: string;
  templateId: string;
  recipeSlug: string;
  name: string;
  description?: string | null;
  triggerConfig: Record<string, unknown>;
  actionConfig: Record<string, unknown>;
  isEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BoardTemplateItem {
  id: string;
  templateId: string;
  name: string;
  data: Record<string, unknown>;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface BoardTemplateView {
  id: string;
  templateId: string;
  name: string;
  slug: string;
  description?: string;
  isDefault: boolean;
  order: number;
  configuration: BoardViewConfiguration;
  filter: CreateFilterExpressionInput | null;
  colorRules: BoardColorRule[];
  createdAt: string;
  updatedAt: string;
}

export interface BoardTemplate {
  id: string;
  workspaceId?: string | null;
  slug: string;
  name: string;
  description?: string | null;
  type: BoardType;
  visibility: BoardTemplateVisibility;
  previewUrl?: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  scope: CreateBoardScopeInput;
  supportsItems: boolean;
  supportsAutomations: boolean;
  fields: BoardTemplateField[];
  views: BoardTemplateView[];
  automations: BoardTemplateAutomation[];
  items: BoardTemplateItem[];
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BoardTemplateSummary {
  id: string;
  name: string;
  description?: string | null;
  type: BoardType;
  visibility: BoardTemplateVisibility;
  previewUrl?: string | null;
  tags: string[];
  viewCount: number;
  fieldCount: number;
  automationCount: number;
  itemCount: number;
  supportsItems: boolean;
  supportsAutomations: boolean;
}

export type BoardRealtimeEvent = {
  table: "boards" | "board_views" | "board_scopes" | "board_filter_expressions";
  eventType: "INSERT" | "UPDATE" | "DELETE";
  newRecord: Record<string, unknown> | null;
  oldRecord: Record<string, unknown> | null;
};

export interface BoardSubscription {
  unsubscribe: () => void;
}
