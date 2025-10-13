// @ts-nocheck
import { searchEngine, toSearchResult } from "@/server/search/engineRegistry";
import type { PrincipalContext } from "@/server/search/engineRegistry";
import {
  opqlQueryStore,
  type QueryParameterMetadata,
  type ReportDatasetDefinition,
  type ReportLineageMetadata,
  type ReportRecord,
  type ReportVisualizationConfig,
} from "@/server/search/queryStore";
import type { Report, ReportColumn, ReportResult, SearchResult } from "@/types";
import { handleSupabaseError, requireUserId } from "./utils";

const WORKSPACE_ID = "workspace-demo";

const QUERY_PRINCIPAL: PrincipalContext = {
  principalId: "reports-service",
  workspaceId: WORKSPACE_ID,
  roles: ["analyst"],
  permissions: [
    "search.execute",
    "search.comments.read",
    "search.mask.snippet",
    "docs.view.sensitive",
  ],
};

const isString = (value: unknown): value is string => typeof value === "string" && value.length > 0;

const cloneReportRecord = (record: ReportRecord): Report => ({
  id: record.id,
  owner: record.ownerId,
  project_id: record.projectId ?? null,
  name: record.name,
  description: record.description ?? null,
  config: {
    ...record.config,
    dataset: record.dataset,
    visualization: record.visualization,
    lineage: record.lineage,
  },
  created_at: record.createdAt,
  updated_at: record.updatedAt,
});

const cloneReportRecords = (records: ReportRecord[]): Report[] => records.map(cloneReportRecord);

const renderParameterValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
};

const applyParameters = (
  opql: string,
  parameters: QueryParameterMetadata[],
  params: Record<string, unknown>,
): string => {
  let rendered = opql;
  for (const parameter of parameters) {
    const token = parameter.token;
    const value = params[token] ?? parameter.defaultValue ?? "";
    const pattern = new RegExp(`{{\s*${token}\s*}}`, "gi");
    rendered = rendered.replace(pattern, renderParameterValue(value));
  }
  return rendered;
};

const buildColumns = (
  report: ReportRecord,
  rows: Record<string, unknown>[],
): ReportColumn[] => {
  const seen = new Set<string>();
  const columns: ReportColumn[] = [];

  const addColumn = (key: string, label?: string) => {
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    columns.push({
      key,
      label: label ?? key.replace(/_/g, " "),
      type: null,
      format: null,
    });
  };

  report.visualization.groupBy?.forEach((field) => addColumn(field));
  report.visualization.metrics?.forEach((field) => addColumn(field));

  if (!columns.length && rows.length) {
    Object.keys(rows[0] ?? {}).forEach((field) => addColumn(field));
  }

  return columns;
};

const normalizeParameters = (parameters: unknown): QueryParameterMetadata[] => {
  if (!Array.isArray(parameters)) {
    return [];
  }

  return parameters
    .map((entry) => {
      if (!entry || typeof entry !== "object") {
        return null;
      }
      const record = entry as Record<string, unknown>;
      const token = typeof record.token === "string" ? record.token.trim() : "";
      if (!token) {
        return null;
      }
      const label =
        typeof record.label === "string" && record.label.trim()
          ? record.label.trim()
          : token;
      const type = typeof record.type === "string" ? record.type : undefined;
      const description =
        typeof record.description === "string" ? record.description : undefined;
      const required =
        typeof record.required === "boolean" ? (record.required as boolean) : undefined;
      const defaultCandidate = (record as { defaultValue?: unknown }).defaultValue;
      const defaultValue =
        typeof defaultCandidate === "string" ||
        typeof defaultCandidate === "number" ||
        typeof defaultCandidate === "boolean" ||
        defaultCandidate === null
          ? (defaultCandidate as string | number | boolean | null)
          : undefined;
      return {
        token,
        label,
        type,
        description,
        required,
        defaultValue,
      } satisfies QueryParameterMetadata;
    })
    .filter((entry): entry is QueryParameterMetadata => Boolean(entry));
};

interface NormalizedReportConfig {
  dataset: ReportDatasetDefinition;
  visualization: ReportVisualizationConfig;
  lineage: Partial<ReportLineageMetadata>;
  metadata: Record<string, unknown>;
}

const normalizeReportConfig = (config: Record<string, unknown> | undefined): NormalizedReportConfig => {
  const datasetConfig = (config?.dataset ?? {}) as Record<string, unknown>;
  const visualizationConfig = (config?.visualization ?? {}) as Record<string, unknown>;
  const lineageConfig = (config?.lineage ?? {}) as Record<string, unknown>;

  const dataset: ReportDatasetDefinition = {
    opql:
      typeof datasetConfig.opql === "string" && datasetConfig.opql.trim()
        ? datasetConfig.opql.trim()
        : "FIND ITEMS ORDER BY updated DESC LIMIT 25",
    entityTypes: Array.isArray(datasetConfig.entityTypes)
      ? datasetConfig.entityTypes.filter(isString)
      : ["task"],
    parameters: normalizeParameters(datasetConfig.parameters),
    defaultLimit:
      typeof datasetConfig.defaultLimit === "number" && datasetConfig.defaultLimit > 0
        ? datasetConfig.defaultLimit
        : 100,
  } satisfies ReportDatasetDefinition;

  const visualization: ReportVisualizationConfig = {
    type: isString(visualizationConfig.type)
      ? (visualizationConfig.type as ReportVisualizationConfig["type"])
      : "table",
    groupBy: Array.isArray(visualizationConfig.groupBy)
      ? visualizationConfig.groupBy.filter(isString)
      : undefined,
    metrics: Array.isArray(visualizationConfig.metrics)
      ? visualizationConfig.metrics.filter(isString)
      : undefined,
    options:
      visualizationConfig.options && typeof visualizationConfig.options === "object"
        ? { ...(visualizationConfig.options as Record<string, unknown>) }
        : undefined,
    drilldown:
      visualizationConfig.drilldown && typeof visualizationConfig.drilldown === "object"
        ? {
            enabled: Boolean((visualizationConfig.drilldown as Record<string, unknown>).enabled),
            opql:
              typeof (visualizationConfig.drilldown as Record<string, unknown>).opql === "string"
                ? ((visualizationConfig.drilldown as Record<string, unknown>).opql as string)
                : undefined,
          }
        : undefined,
    refreshIntervalMinutes:
      typeof visualizationConfig.refreshIntervalMinutes === "number"
        ? (visualizationConfig.refreshIntervalMinutes as number)
        : undefined,
    comparisonWindow: isString(visualizationConfig.comparisonWindow)
      ? (visualizationConfig.comparisonWindow as string)
      : undefined,
    thresholds: Array.isArray(visualizationConfig.thresholds)
      ? (visualizationConfig.thresholds as Array<Record<string, unknown>>)
          .map((threshold) => {
            if (!threshold || typeof threshold !== "object") {
              return null;
            }
            const label = isString(threshold.label) ? threshold.label : "Threshold";
            const operator =
              threshold.operator === "gt" ||
              threshold.operator === "gte" ||
              threshold.operator === "lt" ||
              threshold.operator === "lte"
                ? (threshold.operator as "gt" | "gte" | "lt" | "lte")
                : "gt";
            const value = typeof threshold.value === "number" ? threshold.value : 0;
            const color = isString(threshold.color) ? threshold.color : undefined;
            return { label, operator, value, color };
          })
          .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      : undefined,
  } satisfies ReportVisualizationConfig;

  const lineage: Partial<ReportLineageMetadata> = {
    filters: Array.isArray(lineageConfig.filters)
      ? lineageConfig.filters.filter(isString)
      : undefined,
    fields: Array.isArray(lineageConfig.fields)
      ? lineageConfig.fields.filter(isString)
      : undefined,
    sourceQueries: Array.isArray(lineageConfig.sourceQueries)
      ? lineageConfig.sourceQueries.filter(isString)
      : undefined,
    dashboards: Array.isArray(lineageConfig.dashboards)
      ? lineageConfig.dashboards.filter(isString)
      : undefined,
    lastRunAt: isString(lineageConfig.lastRunAt) ? lineageConfig.lastRunAt : undefined,
  };

  const metadata = { ...(config ?? {}) };
  if (Array.isArray(config?.portfolios)) {
    metadata.portfolios = (config.portfolios as unknown[]).filter(isString);
  }

  return { dataset, visualization, lineage, metadata };
};

const materializeDataset = (
  report: ReportRecord,
  params: Record<string, unknown>,
): { opql: string; types: string[] } => {
  const opql = applyParameters(report.dataset.opql, report.dataset.parameters, params);
  return { opql, types: report.dataset.entityTypes };
};

const toReportResult = (
  report: ReportRecord,
  rows: Record<string, unknown>[],
  renderedOpql: string,
): ReportResult => {
  const columns = buildColumns(report, rows);

  return {
    columns,
    rows,
    meta: {
      total: rows.length,
      dataset: report.dataset,
      visualization: report.visualization,
      lineage: report.lineage,
      renderedOpql,
    },
  } satisfies ReportResult;
};

export interface ListReportsOptions {
  portfolioId?: string;
}

export const listReports = async (
  projectId?: string,
  options: ListReportsOptions = {},
): Promise<Report[]> => {
  const records = opqlQueryStore.listReports(WORKSPACE_ID);
  const filtered = records.filter((record) => {
    if (projectId && record.projectId && record.projectId !== projectId) {
      return false;
    }
    if (projectId && !record.projectId && projectId !== "all") {
      return false;
    }
    if (options.portfolioId) {
      const portfolios = Array.isArray(record.config.portfolios)
        ? (record.config.portfolios as string[])
        : [];
      if (!portfolios.includes(options.portfolioId)) {
        return false;
      }
    }
    return true;
  });
  return cloneReportRecords(filtered);
};

export const getReport = async (id: string): Promise<Report | null> => {
  const record = opqlQueryStore.getReport(WORKSPACE_ID, id);
  return record ? cloneReportRecord(record) : null;
};

export interface CreateReportInput {
  name: string;
  description?: string;
  projectId?: string | null;
  config?: Record<string, unknown>;
}

export const createReport = async (input: CreateReportInput): Promise<Report> => {
  const ownerId = await requireUserId();

  const trimmedName = input.name?.trim();
  if (!trimmedName) {
    throw new Error("Report name is required.");
  }

  const normalized = normalizeReportConfig(input.config ?? {});

  const record = opqlQueryStore.saveReport({
    workspaceId: WORKSPACE_ID,
    ownerId,
    visibility: "workspace",
    projectId: input.projectId ?? null,
    name: trimmedName,
    description: input.description?.trim() || null,
    dataset: normalized.dataset,
    visualization: normalized.visualization,
    lineage: normalized.lineage,
    config: normalized.metadata,
  });

  return cloneReportRecord(record);
};

export const updateReport = async (
  id: string,
  patch: Partial<Pick<Report, "name" | "description" | "config" | "project_id">>,
): Promise<Report> => {
  const existing = opqlQueryStore.getReport(WORKSPACE_ID, id);
  if (!existing) {
    throw handleSupabaseError({ message: "Report not found" }, "Unable to update the report.");
  }

  let name = existing.name;
  let description = existing.description ?? null;
  let projectId = existing.projectId ?? null;
  let dataset = existing.dataset;
  let visualization = existing.visualization;
  let lineage = existing.lineage;
  let metadata = existing.config;

  if (typeof patch.name === "string") {
    const trimmed = patch.name.trim();
    if (!trimmed) {
      throw new Error("Report name cannot be empty.");
    }
    name = trimmed;
  }

  if (typeof patch.description === "string") {
    const trimmed = patch.description.trim();
    description = trimmed ? trimmed : null;
  }

  if (patch.project_id !== undefined) {
    projectId = patch.project_id ?? null;
  }

  if (patch.config && typeof patch.config === "object") {
    const normalized = normalizeReportConfig(patch.config as Record<string, unknown>);
    dataset = normalized.dataset;
    visualization = normalized.visualization;
    lineage = {
      ...lineage,
      ...normalized.lineage,
    } as ReportLineageMetadata;
    metadata = normalized.metadata;
  }

  const record = opqlQueryStore.saveReport({
    id,
    workspaceId: WORKSPACE_ID,
    ownerId: existing.ownerId,
    visibility: existing.visibility,
    projectId,
    name,
    description,
    dataset,
    visualization,
    lineage,
    config: metadata,
  });

  return cloneReportRecord(record);
};

export const deleteReport = async (id: string): Promise<void> => {
  opqlQueryStore.deleteReport(WORKSPACE_ID, id);
};

export const executeReport = async (
  id: string,
  params: Record<string, unknown> = {},
): Promise<ReportResult> => {
  const record = opqlQueryStore.getReport(WORKSPACE_ID, id);
  if (!record) {
    throw handleSupabaseError({ message: "Report not found" }, "Unable to execute the report.");
  }

  const { opql, types } = materializeDataset(record, params);
  const execution = await searchEngine.execute({
    workspaceId: WORKSPACE_ID,
    principal: QUERY_PRINCIPAL,
    opql,
    limit: record.dataset.defaultLimit,
    types,
  });

  const rows = execution.rows.map((row) => ({ ...row.values }));

  opqlQueryStore.recordReportRun(WORKSPACE_ID, record.id, new Date().toISOString());

  return toReportResult(record, rows, opql);
};

export type RunReportInput =
  | string
  | {
      reportId?: string;
      id?: string;
      params?: Record<string, unknown>;
    };

export const runReport = async (
  input: RunReportInput,
  legacyFilters?: Record<string, unknown>,
): Promise<ReportResult> => {
  if (typeof input === "string") {
    return executeReport(input, legacyFilters ?? {});
  }

  if (!input || typeof input !== "object") {
    throw new Error("Report details are required to run a report.");
  }

  const reportId = input.reportId || input.id;

  if (!reportId) {
    throw new Error("Report id is required to run a report.");
  }

  const params = { ...(legacyFilters ?? {}), ...(input.params ?? {}) };

  return executeReport(reportId, params);
};

export async function previewReportQuery(
  opql: string,
  options: { workspaceId?: string; principal?: PrincipalContext; limit?: number; cursor?: string; types?: SearchResult["type"][] } = {},
): Promise<SearchResult[]> {
  const execution = await searchEngine.execute({
    workspaceId: options.workspaceId ?? QUERY_PRINCIPAL.workspaceId,
    principal: options.principal ?? QUERY_PRINCIPAL,
    opql,
    limit: options.limit,
    cursor: options.cursor,
    types: options.types,
  });
  return execution.rows.map((row) => toSearchResult(row));
}
