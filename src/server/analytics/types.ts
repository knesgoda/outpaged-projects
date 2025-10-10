export type MetricAggregation =
  | "count"
  | "sum"
  | "avg"
  | "min"
  | "max"
  | "count_distinct";

export type WindowFunction =
  | "moving_average"
  | "percent_change"
  | "cumulative_sum"
  | "rank";

export interface MetricDefinition {
  id: string;
  label: string;
  column: string;
  aggregation: MetricAggregation;
  window?: {
    function: WindowFunction;
    partitionBy?: string[];
    orderBy?: string;
    frame?: string;
  };
  format?: "number" | "currency" | "percentage" | "duration";
  expression?: string;
}

export interface SegmentDefinition {
  id: string;
  label: string;
  filters: Array<{
    column: string;
    operator:
      | "eq"
      | "neq"
      | "gt"
      | "gte"
      | "lt"
      | "lte"
      | "in"
      | "not_in"
      | "contains";
    value: unknown;
  }>;
}

export interface ReportQuery {
  source: string;
  joins?: Array<{
    table: string;
    on: string;
    type?: "inner" | "left" | "right";
  }>;
  dimensions: string[];
  metrics: MetricDefinition[];
  segments?: SegmentDefinition[];
  filters?: Array<SegmentDefinition["filters"][number]>;
  orderBy?: Array<{ column: string; direction?: "asc" | "desc" }>;
  limit?: number;
  timezone?: string;
}

export interface ScheduledReport {
  id: string;
  reportId: string;
  cron: string;
  lastRunAt?: string;
  nextRunAt?: string;
  recipients: string[];
  channel: "email" | "slack" | "webhook";
}

export interface ReportExecutionResult {
  columns: Array<{ key: string; label: string; type?: string }>;
  rows: Array<Record<string, unknown>>;
  meta: Record<string, unknown>;
}

export interface DashboardDefinition {
  id: string;
  title: string;
  description?: string;
  tiles: Array<{
    id: string;
    reportId: string;
    layout: { x: number; y: number; w: number; h: number };
    interactions?: {
      crossFilter?: boolean;
      drilldown?: boolean;
    };
  }>;
  filters?: SegmentDefinition[];
  presentation?: {
    theme?: "light" | "dark" | "contrast";
    autoCycle?: boolean;
    refreshIntervalMinutes?: number;
  };
}

export interface AutomationDefinition {
  id: string;
  name: string;
  reportId: string;
  schedule: string;
  enabled: boolean;
  actions: Array<{ type: "email" | "slack" | "webhook"; config: Record<string, unknown> }>;
  threshold?: {
    metric: string;
    operator: ">" | ">=" | "<" | "<=" | "=";
    value: number;
  };
}
