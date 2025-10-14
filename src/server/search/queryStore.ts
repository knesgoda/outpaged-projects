export type QueryDialect = "opql" | "jql";

export interface QueryParameterMetadata {
  token: string;
  label: string;
  type?: string;
  description?: string;
  required?: boolean;
  defaultValue?: string | number | boolean | null;
}

export interface SavedSearchScope {
  visibility: "private" | "workspace" | "organization";
  ownerId: string;
  sharedWith: string[];
}

export interface SavedSearchValidationSnapshot {
  status: "valid" | "invalid";
  checkedAt: string;
  normalizedOpql: string;
  errors?: string[];
  warnings?: string[];
  caret?: string;
  position?: number;
}

export interface SavedSearchAuditMetadata {
  createdBy: string;
  updatedBy?: string;
  lastAccessedAt?: string;
  exports: Array<{
    at: string;
    format: "csv" | "json" | "xlsx" | "board" | "report" | "dataset";
    actorId?: string;
  }>;
}

export interface SavedSearchRecord {
  id: string;
  workspaceId: string;
  name: string;
  opql: string;
  originalQuery: string;
  dialect: QueryDialect;
  parameters: QueryParameterMetadata[];
  scope: SavedSearchScope;
  validation: SavedSearchValidationSnapshot;
  filters: Record<string, unknown>;
  visibility: SavedSearchScope["visibility"];
  ownerId: string;
  description?: string | null;
  maskedFields: string[];
  createdAt: string;
  updatedAt: string;
  audit: SavedSearchAuditMetadata;
}

export interface ReportVisualizationConfig {
  type: "table" | "bar" | "line" | "area" | "pie" | "donut" | "heatmap" | "pivot" | "kpi" | "breakdown";
  groupBy?: string[];
  metrics?: string[];
  options?: Record<string, unknown>;
  drilldown?: { enabled: boolean; opql?: string };
  refreshIntervalMinutes?: number;
  comparisonWindow?: string;
  thresholds?: Array<{ label: string; operator: "gt" | "gte" | "lt" | "lte"; value: number; color?: string }>;
}

export interface ReportDatasetDefinition {
  opql: string;
  entityTypes: string[];
  parameters: QueryParameterMetadata[];
  defaultLimit: number;
}

export interface ReportLineageMetadata {
  filters: string[];
  fields: string[];
  sourceQueries: string[];
  dashboards: string[];
  lastRunAt?: string;
}

export interface ReportRecord {
  id: string;
  workspaceId: string;
  ownerId: string;
  visibility: "private" | "workspace" | "organization";
  projectId?: string | null;
  name: string;
  description?: string | null;
  dataset: ReportDatasetDefinition;
  visualization: ReportVisualizationConfig;
  lineage: ReportLineageMetadata;
  createdAt: string;
  updatedAt: string;
  config: Record<string, unknown>;
}

export interface DashboardTileDefinition {
  id: string;
  title: string;
  type:
    | "kpi"
    | "timeseries"
    | "breakdown"
    | "table"
    | "pivot"
    | "heatmap"
    | "workload"
    | "list";
  queryRef: { kind: "report" | "saved-search"; id: string; opql?: string };
  visualization: ReportVisualizationConfig;
  refreshCadenceMinutes: number;
  comparisonWindow?: string;
  colorRules?: Array<{ label: string; operator: "gt" | "lt" | "eq"; value: number; color: string }>;
  crossFilters?: { enabled: boolean; fragments: string[]; mode: "leader" | "follower" };
}

export interface DashboardRecord {
  id: string;
  workspaceId: string;
  title: string;
  description?: string | null;
  filters: Array<{ token: string; label: string; fragment: string }>;
  tiles: DashboardTileDefinition[];
  layout: { columns: number; rowGap: number; columnGap: number };
  refreshCadenceMinutes: number;
  lastPublishedAt?: string;
}

export interface SaveFilterInput {
  id?: string;
  workspaceId: string;
  name: string;
  opql: string;
  originalQuery: string;
  dialect: QueryDialect;
  parameters: QueryParameterMetadata[];
  scope: SavedSearchScope;
  validation: SavedSearchValidationSnapshot;
  filters: Record<string, unknown>;
  visibility: SavedSearchScope["visibility"];
  ownerId: string;
  description?: string | null;
  maskedFields: string[];
  audit?: Partial<SavedSearchAuditMetadata>;
}

export interface SaveReportInput {
  id?: string;
  workspaceId: string;
  ownerId: string;
  visibility: "private" | "workspace" | "organization";
  projectId?: string | null;
  name: string;
  description?: string | null;
  dataset: ReportDatasetDefinition;
  visualization: ReportVisualizationConfig;
  lineage?: Partial<ReportLineageMetadata>;
  config?: Record<string, unknown>;
}

export interface SaveDashboardInput {
  id?: string;
  workspaceId: string;
  title: string;
  description?: string | null;
  filters?: Array<{ token: string; label: string; fragment: string }>;
  tiles: DashboardTileDefinition[];
  layout?: { columns?: number; rowGap?: number; columnGap?: number };
  refreshCadenceMinutes?: number;
  lastPublishedAt?: string;
}

function generateId(prefix: string): string {
  try {
    // Use Web Crypto API (browser-compatible)
    return `${prefix}-${crypto.randomUUID()}`;
  } catch (_error) {
    const random = Math.random().toString(16).slice(2);
    return `${prefix}-${random}-${Date.now()}`;
  }
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function ensureWorkspaceMap<T>(store: Map<string, Map<string, T>>, workspaceId: string) {
  if (!store.has(workspaceId)) {
    store.set(workspaceId, new Map());
  }
  return store.get(workspaceId)!;
}

export class OpqlQueryStore {
  private readonly filters = new Map<string, Map<string, SavedSearchRecord>>();
  private readonly reports = new Map<string, Map<string, ReportRecord>>();
  private readonly dashboards = new Map<string, Map<string, DashboardRecord>>();

  constructor() {
    this.seedDefaults();
  }

  listFilters(workspaceId: string): SavedSearchRecord[] {
    return Array.from(this.filters.get(workspaceId)?.values() ?? []).map(clone);
  }

  saveFilter(input: SaveFilterInput): SavedSearchRecord {
    const workspaceStore = ensureWorkspaceMap(this.filters, input.workspaceId);
    const now = new Date().toISOString();
    const id = input.id ?? generateId("saved-filter");
    const existing = workspaceStore.get(id);

    const audit: SavedSearchAuditMetadata = existing
      ? {
          createdBy: existing.audit.createdBy,
          updatedBy: input.scope.ownerId,
          lastAccessedAt: existing.audit.lastAccessedAt ?? now,
          exports: [...existing.audit.exports],
        }
      : {
          createdBy: input.scope.ownerId,
          updatedBy: input.scope.ownerId,
          lastAccessedAt: now,
          exports: [],
        };

    if (input.audit) {
      if (input.audit.createdBy) {
        audit.createdBy = input.audit.createdBy;
      }
      if (input.audit.updatedBy) {
        audit.updatedBy = input.audit.updatedBy;
      }
      if (input.audit.lastAccessedAt) {
        audit.lastAccessedAt = input.audit.lastAccessedAt;
      }
      if (input.audit.exports) {
        audit.exports = [...input.audit.exports];
      }
    }

    const record: SavedSearchRecord = {
      id,
      workspaceId: input.workspaceId,
      name: input.name,
      opql: input.opql,
      originalQuery: input.originalQuery,
      dialect: input.dialect,
      parameters: [...input.parameters],
      scope: {
        visibility: input.scope.visibility,
        ownerId: input.scope.ownerId,
        sharedWith: [...input.scope.sharedWith],
      },
      validation: { ...input.validation },
      filters: clone(input.filters),
      visibility: input.visibility,
      ownerId: input.ownerId,
      description: input.description ?? null,
      maskedFields: [...input.maskedFields],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      audit,
    };

    workspaceStore.set(id, record);
    return clone(record);
  }

  deleteFilter(workspaceId: string, id: string): void {
    this.filters.get(workspaceId)?.delete(id);
  }

  getFilter(workspaceId: string, id: string): SavedSearchRecord | undefined {
    const record = this.filters.get(workspaceId)?.get(id);
    return record ? clone(record) : undefined;
  }

  getMaskedFields(workspaceId: string): string[] {
    const records = this.filters.get(workspaceId);
    if (!records) return [];
    const fields = new Set<string>();
    for (const record of records.values()) {
      record.maskedFields.forEach((field) => fields.add(field));
    }
    return Array.from(fields.values());
  }

  listReports(workspaceId: string): ReportRecord[] {
    return Array.from(this.reports.get(workspaceId)?.values() ?? []).map(clone);
  }

  saveReport(input: SaveReportInput): ReportRecord {
    const workspaceStore = ensureWorkspaceMap(this.reports, input.workspaceId);
    const now = new Date().toISOString();
    const id = input.id ?? generateId("report");
    const existing = workspaceStore.get(id);

    const lineage: ReportLineageMetadata = {
      filters: [...(input.lineage?.filters ?? existing?.lineage.filters ?? [])],
      fields: [...(input.lineage?.fields ?? existing?.lineage.fields ?? [])],
      sourceQueries: [
        ...(input.lineage?.sourceQueries ?? existing?.lineage.sourceQueries ?? []),
      ],
      dashboards: [...(input.lineage?.dashboards ?? existing?.lineage.dashboards ?? [])],
      lastRunAt: input.lineage?.lastRunAt ?? existing?.lineage.lastRunAt,
    };

    const record: ReportRecord = {
      id,
      workspaceId: input.workspaceId,
      ownerId: input.ownerId,
      visibility: input.visibility,
      projectId: input.projectId ?? null,
      name: input.name,
      description: input.description ?? null,
      dataset: {
        opql: input.dataset.opql,
        entityTypes: [...input.dataset.entityTypes],
        parameters: [...input.dataset.parameters],
        defaultLimit: input.dataset.defaultLimit,
      },
      visualization: clone(input.visualization),
      lineage,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      config: clone(input.config ?? existing?.config ?? {}),
    };

    workspaceStore.set(id, record);
    return clone(record);
  }

  deleteReport(workspaceId: string, id: string): void {
    this.reports.get(workspaceId)?.delete(id);
  }

  getReport(workspaceId: string, id: string): ReportRecord | undefined {
    const record = this.reports.get(workspaceId)?.get(id);
    return record ? clone(record) : undefined;
  }

  listDashboards(workspaceId: string): DashboardRecord[] {
    return Array.from(this.dashboards.get(workspaceId)?.values() ?? []).map(clone);
  }

  saveDashboard(input: SaveDashboardInput): DashboardRecord {
    const workspaceStore = ensureWorkspaceMap(this.dashboards, input.workspaceId);
    const now = new Date().toISOString();
    const id = input.id ?? generateId("dashboard");
    const existing = workspaceStore.get(id);

    const record: DashboardRecord = {
      id,
      workspaceId: input.workspaceId,
      title: input.title,
      description: input.description ?? null,
      filters: clone(input.filters ?? existing?.filters ?? []),
      tiles: clone(input.tiles ?? existing?.tiles ?? []),
      layout: {
        columns: input.layout?.columns ?? existing?.layout.columns ?? 12,
        rowGap: input.layout?.rowGap ?? existing?.layout.rowGap ?? 24,
        columnGap: input.layout?.columnGap ?? existing?.layout.columnGap ?? 24,
      },
      refreshCadenceMinutes:
        input.refreshCadenceMinutes ?? existing?.refreshCadenceMinutes ?? 15,
      lastPublishedAt: input.lastPublishedAt ?? existing?.lastPublishedAt ?? now,
    };

    workspaceStore.set(id, record);
    return clone(record);
  }

  deleteDashboard(workspaceId: string, id: string): void {
    this.dashboards.get(workspaceId)?.delete(id);
  }

  getDashboard(workspaceId: string, id: string): DashboardRecord | undefined {
    const record = this.dashboards.get(workspaceId)?.get(id);
    return record ? clone(record) : undefined;
  }

  recordReportRun(workspaceId: string, reportId: string, timestamp: string) {
    const workspaceStore = this.reports.get(workspaceId);
    if (!workspaceStore) return;
    const report = workspaceStore.get(reportId);
    if (!report) return;
    const next: ReportRecord = {
      ...report,
      lineage: {
        ...report.lineage,
        lastRunAt: timestamp,
      },
      updatedAt: timestamp,
    };
    workspaceStore.set(reportId, next);
  }

  private seedDefaults() {
    const workspaceId = "workspace-demo";
    const now = new Date().toISOString();

    const defaultFilter: SaveFilterInput = {
      workspaceId,
      name: "Search reliability backlog",
      opql:
        "FIND ITEMS WHERE project = 'Search reliability initiative' AND status != 'Done' ORDER BY updated DESC",
      originalQuery:
        "project = SEARCH AND status != Done order by updated desc",
      dialect: "jql",
      parameters: [
        {
          token: "Team",
          label: "Team",
          type: "entity:team",
          description: "Team responsible for the work",
          defaultValue: "search-platform",
        },
      ],
      scope: { visibility: "workspace", ownerId: "owner-1", sharedWith: ["team-search"] },
      validation: {
        status: "valid",
        checkedAt: now,
        normalizedOpql:
          "FIND ITEMS WHERE project = 'Search reliability initiative' AND status != 'Done' ORDER BY updated DESC",
      },
      filters: { type: ["task"], project: "project-1" },
      visibility: "workspace",
      ownerId: "owner-1",
      description: "Tasks driving index stability and abuse safeguards",
      maskedFields: ["snippet"],
      audit: {
        createdBy: "owner-1",
        updatedBy: "owner-1",
        lastAccessedAt: now,
        exports: [
          {
            at: now,
            format: "csv",
            actorId: "owner-1",
          },
        ],
      },
    };
    const saved = this.saveFilter(defaultFilter);

    const defaultReport: SaveReportInput = {
      workspaceId,
      ownerId: "owner-1",
      visibility: "workspace",
      name: "At-risk work by assignee",
      description: "Open items due within 14 days",
      dataset: {
        opql:
          "AGGREGATE COUNT() AS total FROM ITEMS WHERE updated_at >= TODAY()-14d GROUP BY project_id ORDER BY total DESC",
        entityTypes: ["task"],
        parameters: [
          {
            token: "DateRange",
            label: "Date range",
            type: "daterange",
            defaultValue: "14d",
          },
        ],
        defaultLimit: 50,
      },
      visualization: {
        type: "bar",
        groupBy: ["project_id"],
        metrics: ["total"],
        options: { stacked: true },
        drilldown: { enabled: true, opql: "FIND * FROM ITEMS WHERE project_id = {{project_id}}" },
      },
      lineage: {
        filters: [saved.id],
        fields: ["project_id", "updated_at"],
        sourceQueries: [
          "FIND * FROM ITEMS WHERE updated_at >= TODAY()-14d",
        ],
        dashboards: [],
        lastRunAt: now,
      },
      config: {
        presentation: {
          chart: "stacked-bar",
          palette: "status",
        },
        portfolios: ["portfolio-risk"],
      },
    };
    const report = this.saveReport(defaultReport);

    const defaultDashboard: SaveDashboardInput = {
      workspaceId,
      title: "Risk dashboard",
      description: "Upcoming due work and ownership",
      filters: [
        {
          token: "Team",
          label: "Team",
          fragment: "AND team = {{Team}}",
        },
      ],
      tiles: [
        {
          id: generateId("tile"),
          title: "At-risk items",
          type: "breakdown",
          queryRef: { kind: "report", id: report.id },
          visualization: {
            type: "bar",
            groupBy: ["assignee"],
            metrics: ["open", "pts"],
            options: { stacked: true },
            drilldown: {
              enabled: true,
              opql:
                "FIND ITEMS WHERE assignee = {{assignee}} AND due < TODAY()+14d AND status != 'Done'",
            },
          },
          refreshCadenceMinutes: 5,
          comparisonWindow: "1w",
          colorRules: [
            { label: "Critical", operator: "gt", value: 10, color: "#ef4444" },
          ],
          crossFilters: {
            enabled: true,
            fragments: ["AND assignee = '{{assignee}}'"],
            mode: "leader",
          },
        },
        {
          id: generateId("tile"),
          title: "My items",
          type: "list",
          queryRef: { kind: "saved-search", id: saved.id },
          visualization: {
            type: "table",
            groupBy: ["status"],
            metrics: ["due"],
            options: { showFields: ["title", "status", "due"] },
          },
          refreshCadenceMinutes: 10,
          comparisonWindow: "1w",
          crossFilters: {
            enabled: true,
            fragments: ["AND assignee = ME()"],
            mode: "follower",
          },
        },
      ],
      layout: { columns: 12, rowGap: 24, columnGap: 24 },
      refreshCadenceMinutes: 5,
      lastPublishedAt: now,
    };

    const dashboard = this.saveDashboard(defaultDashboard);

    this.saveReport({
      ...defaultReport,
      id: report.id,
      lineage: {
        ...defaultReport.lineage!,
        dashboards: [dashboard.id],
      },
    });
  }
}

export const opqlQueryStore = new OpqlQueryStore();
