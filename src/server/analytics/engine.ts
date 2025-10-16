// @ts-nocheck
import {
  opqlQueryStore,
  type DashboardTileDefinition,
  type QueryParameterMetadata,
  type ReportRecord,
} from "@/server/search/queryStore";
import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import { searchEngine, toSearchResult } from "@/server/search/engineRegistry";
import type { PrincipalContext } from "@/server/search/engineRegistry";
import type { SearchResult } from "@/types";
import type {
  AutomationDefinition,
  DashboardDefinition,
  ReportExecutionResult,
  ReportQuery,
  ScheduledReport,
} from "./types";

const DASHBOARD_PRINCIPAL: PrincipalContext = {
  principalId: "analytics-service",
  workspaceId: "workspace-demo",
  roles: ["analyst"],
  permissions: [
    "search.execute",
    "search.comments.read",
    "search.mask.snippet",
    "docs.view.sensitive",
  ],
};

const isString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const renderParameterValue = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
};

const applyParameters = (
  opql: string,
  parameters: QueryParameterMetadata[] | undefined,
  params: Record<string, unknown>,
) => {
  if (!parameters?.length) {
    return opql;
  }
  let rendered = opql;
  for (const parameter of parameters) {
    const pattern = new RegExp(`{{\s*${escapeRegExp(parameter.token)}\s*}}`, "gi");
    const value = params[parameter.token] ?? parameter.defaultValue ?? "";
    rendered = rendered.replace(pattern, renderParameterValue(value));
  }
  return rendered;
};

const appendFragments = (opql: string, fragments: string[]): string => {
  if (!fragments.length) {
    return opql;
  }
  const cleaned = fragments
    .map((fragment) => fragment.trim())
    .filter((fragment) => fragment.length > 0);
  if (!cleaned.length) {
    return opql;
  }
  const upper = opql.toUpperCase();
  const whereIndex = upper.indexOf(" WHERE ");
  if (whereIndex >= 0) {
    const before = opql.slice(0, whereIndex + 7);
    const after = opql.slice(whereIndex + 7);
    return `${before}${after} ${cleaned.join(" ")}`.trim();
  }
  const orderIndex = upper.indexOf(" ORDER BY ");
  if (orderIndex >= 0) {
    const before = opql.slice(0, orderIndex);
    const after = opql.slice(orderIndex);
    return `${before} WHERE ${cleaned.join(" ")} ${after}`.trim();
  }
  return `${opql} WHERE ${cleaned.join(" ")}`.trim();
};

const buildAggregateOpql = (query: ReportQuery): string => {
  const sourceToken = query.source.split(".").pop() ?? "items";
  const source = sourceToken.toUpperCase().includes("DOC") ? "DOCS" : "ITEMS";
  const filters = query.filters ?? [];
  const filterClauses = filters
    .map((filter) => {
      const value = renderParameterValue(filter.value);
        switch (filter.operator) {
        case "eq":
          return `${filter.column} = ${JSON.stringify(value)}`;
        case "neq":
          return `${filter.column} != ${JSON.stringify(value)}`;
        case "gt":
          return `${filter.column} > ${JSON.stringify(value)}`;
        case "gte":
          return `${filter.column} >= ${JSON.stringify(value)}`;
        case "lt":
          return `${filter.column} < ${JSON.stringify(value)}`;
        case "lte":
          return `${filter.column} <= ${JSON.stringify(value)}`;
        case "contains":
          return `${filter.column} ~ "${value}"`;
        case "in":
        case "not_in":
          if (Array.isArray(filter.value)) {
            const list = filter.value.filter(isString).map((entry) => JSON.stringify(entry));
            if (!list.length) return null;
            return `${filter.column} ${filter.operator === "not_in" ? "NOT " : ""}IN (${list.join(", ")})`;
          }
          return null;
        default:
          return null;
      }
    })
    .filter((clause): clause is string => Boolean(clause));

  const whereClause = filterClauses.length ? `WHERE ${filterClauses.join(" AND ")}` : "";
  const groupBy = query.dimensions.length ? `GROUP BY ${query.dimensions.join(", ")}` : "";

  const metricClauses = query.metrics.length
    ? query.metrics.map((metric) => {
        const label = metric.id || metric.column;
        switch (metric.aggregation) {
          case "count":
            return `COUNT(${metric.column || "*"}) AS ${label}`;
          case "count_distinct":
            return `COUNT(DISTINCT ${metric.column}) AS ${label}`;
          case "sum":
            return `SUM(${metric.column}) AS ${label}`;
          case "avg":
            return `AVG(${metric.column}) AS ${label}`;
          case "min":
            return `MIN(${metric.column}) AS ${label}`;
          case "max":
            return `MAX(${metric.column}) AS ${label}`;
          default:
            return `${metric.column} AS ${label}`;
        }
      })
    : ["COUNT() AS total"];

  const orderBy = query.orderBy?.length
    ? `ORDER BY ${query.orderBy
        .map((order) => `${order.column} ${order.direction === "desc" ? "DESC" : "ASC"}`)
        .join(", ")}`
    : "";

  const limit = query.limit ? `LIMIT ${query.limit}` : "";

  return [
    `AGGREGATE ${metricClauses.join(", ")}`,
    `FROM ${source}`,
    whereClause,
    groupBy,
    orderBy,
    limit,
  ]
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join(" ");
};

const buildColumnsFromQuery = (query: ReportQuery, rows: Array<Record<string, unknown>>) => {
  const seen = new Set<string>();
  const columns: ReportExecutionResult["columns"] = [];

  const addColumn = (key: string, label?: string, type?: string) => {
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    columns.push({ key, label: label ?? key.replace(/_/g, " "), type });
  };

  query.dimensions.forEach((dimension) => addColumn(dimension, dimension.replace(/_/g, " "), "dimension"));
  query.metrics.forEach((metric) => {
    const key = metric.id || metric.column;
    addColumn(key, metric.label ?? key, metric.format ?? undefined);
  });

  if (!columns.length && rows.length) {
    Object.keys(rows[0] ?? {}).forEach((key) => addColumn(key));
  }

  return columns;
};

const materializeReportTile = (
  report: ReportRecord,
  params: Record<string, unknown> = {},
): { opql: string; types: string[] } => {
  const opql = applyParameters(report.dataset.opql, report.dataset.parameters, params);
  return { opql, types: report.dataset.entityTypes };
};

const SCHEDULE_TABLES = ["analytics_report_schedules", "report_schedules"];

const normalizeSupabaseSchedule = (row: Record<string, any>): ScheduledReport => {
  const recipients = Array.isArray(row.recipients)
    ? row.recipients
    : Array.isArray(row.email_recipients)
      ? row.email_recipients
      : [];

  const lastRunAt = row.last_run_at ?? row.lastRunAt ?? null;
  const nextRunAt = row.next_run_at ?? row.nextRunAt ?? null;

  const generatedId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `schedule-${Math.random().toString(36).slice(2)}`;

  return {
    id: row.id ?? row.schedule_id ?? row.slug ?? generatedId,
    reportId: row.report_id ?? row.reportId ?? row.report_slug ?? "",
    cron: row.cron ?? row.schedule_cron ?? row.cadence ?? "* * * * *",
    channel: row.channel ?? row.delivery_channel ?? "email",
    recipients,
    lastRunAt: lastRunAt ?? null,
    nextRunAt: nextRunAt ?? null,
  } satisfies ScheduledReport;
};

const isMissingTableError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false;
  }

  const code = (error as { code?: string }).code;
  const message = String((error as { message?: string }).message ?? "");
  return (
    code === "42P01" ||
    code === "42P07" ||
    code === "PGRST201" ||
    code === "PGRST301" ||
    message.toLowerCase().includes("does not exist")
  );
};

const resolveTileQuery = (
  tile: DashboardTileDefinition,
  params: Record<string, unknown> = {},
): { opql: string; types: string[] } => {
  if (tile.queryRef.kind === "report") {
    const report = opqlQueryStore.getReport(DASHBOARD_PRINCIPAL.workspaceId, tile.queryRef.id);
    if (!report) {
      throw new Error(`Unknown report ${tile.queryRef.id}`);
    }
    return materializeReportTile(report, params);
  }
  if (tile.queryRef.kind === "saved-search") {
    const filter = opqlQueryStore.getFilter(DASHBOARD_PRINCIPAL.workspaceId, tile.queryRef.id);
    if (!filter) {
      throw new Error(`Unknown saved search ${tile.queryRef.id}`);
    }
    return { opql: filter.opql, types: ["task", "project", "doc"] };
  }
  if (tile.queryRef.opql) {
    return { opql: tile.queryRef.opql, types: ["task", "project", "doc"] };
  }
  throw new Error(`Unsupported tile query reference ${tile.queryRef.kind}`);
};

const tileColumns = (tile: DashboardTileDefinition, rows: Array<Record<string, unknown>>) => {
  const keys = new Set<string>();
  const columns: ReportExecutionResult["columns"] = [];

  const add = (key: string, label?: string, type?: string) => {
    if (!key || keys.has(key)) return;
    keys.add(key);
    columns.push({ key, label: label ?? key.replace(/_/g, " "), type });
  };

  tile.visualization.groupBy?.forEach((field) => add(field, field.replace(/_/g, " "), "dimension"));
  tile.visualization.metrics?.forEach((metric) => add(metric, metric.replace(/_/g, " "), "metric"));

  if (!columns.length && rows.length) {
    Object.keys(rows[0] ?? {}).forEach((key) => add(key));
  }

  return columns;
};

export class AnalyticsEngine {
  private readonly schedules = new Map<string, ScheduledReport>();
  private readonly automations = new Map<string, AutomationDefinition>();

  async run(query: ReportQuery): Promise<ReportExecutionResult> {
    const opql = buildAggregateOpql(query);
    const execution = await searchEngine.execute({
      workspaceId: DASHBOARD_PRINCIPAL.workspaceId,
      principal: DASHBOARD_PRINCIPAL,
      opql,
      limit: query.limit,
    });
    const rows = execution.rows.map((row) => ({ ...row.values }));
    const columns = buildColumnsFromQuery(query, rows);
    return {
      columns,
      rows,
      meta: {
        opql,
        source: query.source,
        timezone: query.timezone ?? "UTC",
        stages: execution.metrics.stages,
      },
    } satisfies ReportExecutionResult;
  }

  async schedule(report: ScheduledReport): Promise<ScheduledReport> {
    const next: ScheduledReport = {
      ...report,
      lastRunAt: report.lastRunAt ?? null,
      nextRunAt: report.nextRunAt ?? null,
      recipients: [...(report.recipients ?? [])],
    };

    if (supabaseConfigured) {
      let saved = false;
      let lastError: Error | null = null;

      for (const table of SCHEDULE_TABLES) {
        const response = await supabase
          .from(table as any)
          .upsert(
            {
              id: next.id,
              workspace_id: DASHBOARD_PRINCIPAL.workspaceId,
              report_id: next.reportId,
              cron: next.cron,
              channel: next.channel,
              recipients: next.recipients,
              last_run_at: next.lastRunAt,
              next_run_at: next.nextRunAt,
            },
            { onConflict: "id" },
          )
          .select();

        if (response.error) {
          if (isMissingTableError(response.error)) {
            continue;
          }
          lastError = new Error(response.error.message ?? "Failed to save schedule");
          break;
        }

        const row = Array.isArray(response.data) ? response.data[0] : response.data;
        if (row) {
          const normalized = normalizeSupabaseSchedule(row);
          next.lastRunAt = normalized.lastRunAt ?? next.lastRunAt;
          next.nextRunAt = normalized.nextRunAt ?? next.nextRunAt;
          next.recipients = normalized.recipients ?? next.recipients;
        }
        saved = true;
        break;
      }

      if (lastError) {
        throw lastError;
      }

      if (!saved) {
        console.warn("Supabase schedule persistence unavailable; falling back to in-memory store");
      }
    }

    this.schedules.set(next.id, next);
    return next;
  }

  async listSchedules(): Promise<ScheduledReport[]> {
    if (supabaseConfigured) {
      let lastError: Error | null = null;
      for (const table of SCHEDULE_TABLES) {
        const response = await supabase
          .from(table as any)
          .select("*")
          .eq("workspace_id", DASHBOARD_PRINCIPAL.workspaceId);

        if (response.error) {
          if (isMissingTableError(response.error)) {
            continue;
          }
          lastError = new Error(response.error.message ?? "Failed to list schedules");
          break;
        }

        if (Array.isArray(response.data)) {
          const schedules = response.data.map((row) => normalizeSupabaseSchedule(row));
          schedules.forEach((schedule) => this.schedules.set(schedule.id, schedule));
          return schedules;
        }
      }

      if (lastError) {
        throw lastError;
      }
    }

    return Array.from(this.schedules.values());
  }

  async deleteSchedule(id: string): Promise<void> {
    if (supabaseConfigured) {
      let lastError: Error | null = null;
      for (const table of SCHEDULE_TABLES) {
        const response = await supabase
          .from(table as any)
          .delete()
          .eq("id", id);

        if (response.error) {
          if (isMissingTableError(response.error)) {
            continue;
          }
          lastError = new Error(response.error.message ?? "Failed to delete schedule");
          break;
        }

        lastError = null;
        break;
      }

      if (lastError) {
        throw lastError;
      }
    }

    this.schedules.delete(id);
  }

  async listDashboards(): Promise<DashboardDefinition[]> {
    return opqlQueryStore.listDashboards(DASHBOARD_PRINCIPAL.workspaceId);
  }

  async upsertAutomation(automation: AutomationDefinition): Promise<void> {
    this.automations.set(automation.id, { ...automation });
  }

  async runTile(
    dashboardId: string,
    tileId: string,
    options: { params?: Record<string, unknown>; fragments?: string[] } = {},
  ): Promise<ReportExecutionResult> {
    const dashboard = opqlQueryStore.getDashboard(DASHBOARD_PRINCIPAL.workspaceId, dashboardId);
    if (!dashboard) {
      throw new Error(`Dashboard ${dashboardId} not found`);
    }
    const tile = dashboard.tiles.find((entry) => entry.id === tileId);
    if (!tile) {
      throw new Error(`Tile ${tileId} not found`);
    }
    const { opql, types } = resolveTileQuery(tile, options.params ?? {});
    const fragments = [
      ...(options.fragments ?? []),
      ...(tile.crossFilters?.enabled ? tile.crossFilters.fragments ?? [] : []),
    ];
    const finalOpql = appendFragments(opql, fragments);
    const execution = await searchEngine.execute({
      workspaceId: DASHBOARD_PRINCIPAL.workspaceId,
      principal: DASHBOARD_PRINCIPAL,
      opql: finalOpql,
      types,
      limit: tile.visualization.refreshIntervalMinutes ? undefined : undefined,
    });
    const rows = execution.rows.map((row) => ({ ...row.values }));
    const columns = tileColumns(tile, rows);
    return {
      columns,
      rows,
      meta: {
        opql: finalOpql,
        tileId: tile.id,
        dashboardId,
        visualization: tile.visualization,
        refreshCadenceMinutes: tile.refreshCadenceMinutes,
        stages: execution.metrics.stages,
      },
    } satisfies ReportExecutionResult;
  }
}

export const analyticsEngine = new AnalyticsEngine();

export async function previewDashboardQuery(
  opql: string,
  options: { workspaceId?: string; principal?: PrincipalContext; limit?: number; cursor?: string; types?: SearchResult["type"][] } = {},
): Promise<SearchResult[]> {
  const execution = await searchEngine.execute({
    workspaceId: options.workspaceId ?? DASHBOARD_PRINCIPAL.workspaceId,
    principal: options.principal ?? DASHBOARD_PRINCIPAL,
    opql,
    limit: options.limit,
    cursor: options.cursor,
    types: options.types,
  });
  return execution.rows.map((row) => toSearchResult(row));
}
