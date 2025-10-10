import { supabase } from "@/integrations/supabase/client";
import type { Report, ReportColumn, ReportResult } from "@/types";
import { handleSupabaseError, requireUserId } from "./utils";

const REPORT_SELECT =
  "id, owner, project_id, name, description, config, created_at, updated_at";

type RpcResult =
  | {
      columns?: Array<Partial<ReportColumn>> | null;
      rows?: Array<Record<string, unknown>> | null;
      meta?: Record<string, unknown> | null;
    }
  | null;

const normalizeColumns = (
  columns?: Array<Partial<ReportColumn>> | null
): ReportColumn[] => {
  if (!Array.isArray(columns)) {
    return [];
  }

  return columns
    .map((column) => {
      if (!column || typeof column !== "object") {
        return null;
      }

      const key = String(column.key ?? "").trim();
      if (!key) {
        return null;
      }

      return {
        key,
        label: String(column.label ?? key),
        type: column.type ?? null,
        format: column.format ?? null,
      } satisfies ReportColumn;
    })
    .filter((column): column is ReportColumn => Boolean(column));
};

const normalizeRows = (
  rows?: Array<Record<string, unknown>> | null
): Record<string, unknown>[] => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.filter(
    (row): row is Record<string, unknown> =>
      Boolean(row) && typeof row === "object" && !Array.isArray(row)
  );
};

const normalizeMeta = (
  meta?: Record<string, unknown> | null,
  rowCount?: number
): ReportResult["meta"] => {
  const safeMeta = meta && typeof meta === "object" ? { ...meta } : {};

  if (typeof safeMeta.total !== "number") {
    safeMeta.total = rowCount ?? 0;
  }

  return safeMeta as ReportResult["meta"];
};

const normalizeResult = (result: RpcResult): ReportResult => {
  const columns = normalizeColumns(result?.columns ?? []);
  const rows = normalizeRows(result?.rows ?? []);
  const meta = normalizeMeta(result?.meta ?? {}, rows.length);

  return { columns, rows, meta };
};

async function fetchCachedRun(reportId: string): Promise<ReportResult | null> {
  const { data, error } = await supabase
    .from("report_runs")
    .select("columns, rows, meta")
    .eq("report_id", reportId)
    .order("run_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw handleSupabaseError(error, "Unable to load cached report results.");
  }

  if (!data) {
    return null;
  }

  return normalizeResult(data as unknown as RpcResult);
}

export const listReports = async (projectId?: string): Promise<Report[]> => {
  let query = supabase.from("reports").select(REPORT_SELECT);

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query.order("updated_at", { ascending: false });

  if (error) {
    throw handleSupabaseError(error, "Unable to load reports.");
  }

  return (data ?? []) as Report[];
};

export const getReport = async (id: string): Promise<Report | null> => {
  const { data, error } = await supabase
    .from("reports")
    .select(REPORT_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw handleSupabaseError(error, "Unable to load the report.");
  }

  return (data ?? null) as Report | null;
};

export interface CreateReportInput {
  name: string;
  description?: string;
  projectId?: string | null;
  config?: Record<string, unknown>;
}

export const createReport = async (
  input: CreateReportInput
): Promise<Report> => {
  const ownerId = await requireUserId();

  const trimmedName = input.name?.trim();
  if (!trimmedName) {
    throw new Error("Report name is required.");
  }

  const payload = {
    owner: ownerId,
    name: trimmedName,
    description: input.description?.trim() || null,
    project_id: input.projectId ?? null,
    config: input.config ?? {},
  };

  const { data, error } = await supabase
    .from("reports")
    .insert(payload)
    .select(REPORT_SELECT)
    .single();

  if (error) {
    throw handleSupabaseError(error, "Unable to create the report.");
  }

  return data as Report;
};

export type UpdateReportInput = Partial<
  Pick<Report, "name" | "description" | "config" | "project_id">
>;

export const updateReport = async (
  id: string,
  patch: UpdateReportInput
): Promise<Report> => {
  const nextPatch: UpdateReportInput = { ...patch };

  if (typeof nextPatch.name === "string") {
    const trimmed = nextPatch.name.trim();
    if (!trimmed) {
      throw new Error("Report name cannot be empty.");
    }
    nextPatch.name = trimmed;
  }

  if (typeof nextPatch.description === "string") {
    const trimmed = nextPatch.description.trim();
    nextPatch.description = trimmed ? trimmed : null;
  }

  const payload = {
    ...nextPatch,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("reports")
    .update(payload)
    .eq("id", id)
    .select(REPORT_SELECT)
    .single();

  if (error) {
    throw handleSupabaseError(error, "Unable to update the report.");
  }

  return data as Report;
};

export const deleteReport = async (id: string): Promise<void> => {
  const { error } = await supabase.from("reports").delete().eq("id", id);

  if (error) {
    throw handleSupabaseError(error, "Unable to delete the report.");
  }
};

export const executeReport = async (
  id: string,
  params: Record<string, unknown> = {}
): Promise<ReportResult> => {
  const { data, error } = await supabase.rpc("execute_report", {
    report_id: id,
    run_params: params,
  });

  if (error) {
    throw handleSupabaseError(error, "Unable to execute the report.");
  }

  const normalized = normalizeResult(data as RpcResult);

  if (
    normalized.rows.length === 0 &&
    (normalized.meta.total ?? 0) === 0
  ) {
    const cached = await fetchCachedRun(id);
    if (cached) {
      return cached;
    }
  }

  return normalized;
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
  legacyFilters?: Record<string, unknown>
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
