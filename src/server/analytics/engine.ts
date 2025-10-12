// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type {
  AutomationDefinition,
  DashboardDefinition,
  MetricDefinition,
  ReportExecutionResult,
  ReportQuery,
  ScheduledReport,
  SegmentDefinition,
} from "./types";

const OPERATORS: Record<SegmentDefinition["filters"][number]["operator"], string> = {
  eq: "eq",
  neq: "neq",
  gt: "gt",
  gte: "gte",
  lt: "lt",
  lte: "lte",
  in: "in",
  not_in: "not.in",
  contains: "ilike",
};

const applyFilters = (query: ReturnType<typeof supabase.from>, filters?: ReportQuery["filters"]) => {
  if (!filters?.length) return query;

  return filters.reduce((acc, filter) => {
    const op = OPERATORS[filter.operator];
    if (!op) return acc;

    if (filter.operator === "in" && Array.isArray(filter.value)) {
      return acc.in(filter.column, filter.value as string[]);
    }

    if (filter.operator === "not_in" && Array.isArray(filter.value)) {
      return acc.not(filter.column, "in", filter.value as string[]);
    }

    if (filter.operator === "contains") {
      return acc.ilike(filter.column, `%${filter.value}%`);
    }

    return acc.filter(filter.column, op as never, filter.value as never);
  }, query);
};

const buildSelectColumns = (dimensions: string[], metrics: MetricDefinition[]) => {
  const metricColumns = metrics.map((metric) => {
    switch (metric.aggregation) {
      case "count":
        return `count(${metric.column}) as ${metric.id}`;
      case "sum":
        return `sum(${metric.column}) as ${metric.id}`;
      case "avg":
        return `avg(${metric.column}) as ${metric.id}`;
      case "min":
        return `min(${metric.column}) as ${metric.id}`;
      case "max":
        return `max(${metric.column}) as ${metric.id}`;
      case "count_distinct":
        return `count(distinct ${metric.column}) as ${metric.id}`;
      default:
        return `${metric.column} as ${metric.id}`;
    }
  });

  return [...dimensions, ...metricColumns].join(", ");
};

const mapColumns = (dimensions: string[], metrics: MetricDefinition[]): ReportExecutionResult["columns"] => {
  const dimensionColumns = dimensions.map((dimension) => ({
    key: dimension,
    label: dimension.replace(/_/g, " "),
  }));

  const metricColumns = metrics.map((metric) => ({
    key: metric.id,
    label: metric.label,
    type: metric.format,
  }));

  return [...dimensionColumns, ...metricColumns];
};

export class AnalyticsEngine {
  async run(query: ReportQuery): Promise<ReportExecutionResult> {
    const selectList = [
      buildSelectColumns(query.dimensions, query.metrics),
      ...(query.joins?.map((join) => `${join.table}!${join.type ?? "inner"}(${join.on})`) ?? []),
    ]
      .filter(Boolean)
      .join(", ");

    let builder = supabase.from(query.source).select(selectList, { head: false });

    builder = applyFilters(builder, query.filters);

    if (query.orderBy?.length) {
      query.orderBy.forEach((order) => {
        builder = builder.order(order.column, {
          ascending: order.direction !== "desc",
        });
      });
    }

    if (query.limit) {
      builder = builder.limit(query.limit);
    }

    const { data, error } = await builder;

    if (error) {
      throw error;
    }

    return {
      columns: mapColumns(query.dimensions, query.metrics),
      rows: data ?? [],
      meta: {
        timezone: query.timezone ?? "UTC",
        generatedAt: new Date().toISOString(),
        dimensions: query.dimensions,
        metrics: query.metrics.map((metric) => metric.id),
      },
    };
  }

  async schedule(report: ScheduledReport): Promise<ScheduledReport> {
    const { data, error } = await supabase
      .from("report_schedules")
      .upsert({
        id: report.id,
        report_id: report.reportId,
        cron: report.cron,
        recipients: report.recipients,
        channel: report.channel,
        last_run_at: report.lastRunAt ?? null,
        next_run_at: report.nextRunAt ?? null,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return {
      id: data.id,
      reportId: data.report_id,
      cron: data.cron,
      lastRunAt: data.last_run_at ?? undefined,
      nextRunAt: data.next_run_at ?? undefined,
      recipients: data.recipients ?? [],
      channel: data.channel,
    };
  }

  async listDashboards(): Promise<DashboardDefinition[]> {
    const { data, error } = await supabase
      .from("report_dashboards")
      .select("id, title, description, layout, filters, presentation");

    if (error) {
      throw error;
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      tiles: (row.layout?.tiles ?? []) as DashboardDefinition["tiles"],
      filters: row.filters ?? [],
      presentation: row.presentation ?? undefined,
    }));
  }

  async upsertAutomation(automation: AutomationDefinition): Promise<void> {
    const { error } = await supabase.from("report_automations").upsert({
      id: automation.id,
      report_id: automation.reportId,
      schedule: automation.schedule,
      enabled: automation.enabled,
      actions: automation.actions,
      threshold: automation.threshold ?? null,
    });

    if (error) {
      throw error;
    }
  }
}

export const analyticsEngine = new AnalyticsEngine();
