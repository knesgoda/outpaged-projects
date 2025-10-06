import { supabase } from "@/integrations/supabase/client";
import type { Report } from "@/types";
import { mapSupabaseError, requireUserId } from "./utils";

const REPORT_FIELDS =
  "id, owner, project_id, name, description, config, created_at, updated_at";

const MAX_ROWS = 500;

type ReportInput = {
  name: string;
  description?: string;
  projectId?: string | null;
  config?: any;
};

type ReportPatch = Partial<
  Pick<Report, "name" | "description" | "config" | "project_id">
>;

type Filter = {
  field: string;
  operator?: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "ilike" | "in";
  value: any;
};

type Sorter = {
  field: string;
  direction?: "asc" | "desc";
};

export async function listReports(projectId?: string): Promise<Report[]> {
  let query = supabase
    .from("reports")
    .select(REPORT_FIELDS)
    .order("updated_at", { ascending: false });

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;

  if (error) {
    throw mapSupabaseError(error, "Unable to load reports.");
  }

  return (data as Report[]) ?? [];
}

export async function getReport(id: string): Promise<Report | null> {
  if (!id) {
    throw new Error("Report id is required.");
  }

  const { data, error } = await supabase
    .from("reports")
    .select(REPORT_FIELDS)
    .eq("id", id)
    .maybeSingle();

  if (error && error.code !== "PGRST116") {
    throw mapSupabaseError(error, "Unable to load the report.");
  }

  return (data as Report | null) ?? null;
}

export async function createReport(input: ReportInput): Promise<Report> {
  const ownerId = await requireUserId();
  const name = input.name.trim();

  if (!name) {
    throw new Error("Report name is required.");
  }

  const payload = {
    owner: ownerId,
    name,
    description: input.description?.trim() || null,
    project_id: input.projectId ?? null,
    config: input.config ?? {},
  };

  const { data, error } = await supabase
    .from("reports")
    .insert(payload)
    .select(REPORT_FIELDS)
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to create the report.");
  }

  return data as Report;
}

export async function updateReport(
  id: string,
  patch: ReportPatch
): Promise<Report> {
  if (!id) {
    throw new Error("Report id is required.");
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) {
      throw new Error("Name cannot be empty.");
    }
    updates.name = trimmed;
  }

  if (patch.description !== undefined) {
    updates.description = patch.description?.trim() || null;
  }

  if (patch.config !== undefined) {
    updates.config = patch.config ?? {};
  }

  if (patch.project_id !== undefined) {
    updates.project_id = patch.project_id || null;
  }

  const { data, error } = await supabase
    .from("reports")
    .update(updates)
    .eq("id", id)
    .select(REPORT_FIELDS)
    .single();

  if (error) {
    throw mapSupabaseError(error, "Unable to update the report.");
  }

  return data as Report;
}

export async function deleteReport(id: string): Promise<void> {
  if (!id) {
    throw new Error("Report id is required.");
  }

  const { error } = await supabase.from("reports").delete().eq("id", id);

  if (error) {
    throw mapSupabaseError(error, "Unable to delete the report.");
  }
}

function applyFilter(query: any, filter: Filter) {
  const { field, operator = "eq", value } = filter;

  if (!field) {
    return query;
  }

  try {
    switch (operator) {
      case "neq":
        return query.neq(field, value);
      case "gt":
        return query.gt(field, value);
      case "gte":
        return query.gte(field, value);
      case "lt":
        return query.lt(field, value);
      case "lte":
        return query.lte(field, value);
      case "ilike":
        return query.ilike(field, value);
      case "in":
        if (Array.isArray(value)) {
          return query.in(field, value as any[]);
        }
        if (typeof value === "string") {
          return query.in(field, value.split(",").map((item) => item.trim()));
        }
        return query;
      case "eq":
      default:
        return query.eq(field, value);
    }
  } catch (_error) {
    return query;
  }
}

function applySort(query: any, sorter: Sorter) {
  const { field, direction = "asc" } = sorter;
  if (!field) {
    return query;
  }
  return query.order(field, { ascending: direction !== "desc" });
}

export async function runReport(config: any): Promise<{ rows: any[]; meta: any }> {
  const source = config?.source === "projects" ? "projects" : "tasks";
  const limit = Math.min(Math.max(Number(config?.limit) || 100, 1), MAX_ROWS);

  let query = supabase.from(source).select("*").limit(limit);

  if (config?.projectId && source === "tasks") {
    query = query.eq("project_id", config.projectId);
  }

  const filters: Filter[] = Array.isArray(config?.filters) ? config.filters : [];
  for (const filter of filters) {
    query = applyFilter(query, filter);
  }

  const sorters = Array.isArray(config?.sort)
    ? (config.sort as Sorter[])
    : config?.sort
    ? [config.sort as Sorter]
    : [];

  for (const sorter of sorters) {
    query = applySort(query, sorter);
  }

  const { data, error } = await query;

  if (error) {
    throw mapSupabaseError(error, "Unable to run the report.");
  }

  const rows = Array.isArray(data) ? data : [];
  const groupBy: string[] = Array.isArray(config?.group_by) ? config.group_by : [];
  const groupCounts: Record<string, Record<string, number>> = {};

  if (rows.length > 0 && groupBy.length > 0) {
    for (const field of groupBy) {
      groupCounts[field] = rows.reduce<Record<string, number>>((acc, row) => {
        const value = row?.[field];
        const key = value === null || value === undefined ? "(blank)" : String(value);
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
      }, {});
    }
  }

  const meta = {
    source,
    total: rows.length,
    limit,
    groupCounts,
  };

  return { rows, meta };
}
