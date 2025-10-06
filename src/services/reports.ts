import { supabase, supabaseConfigured } from "@/integrations/supabase/client";
import { Report } from "@/types";

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error(error.message);
  }
  const userId = data?.user?.id;
  if (!userId) {
    throw new Error("You must be signed in to manage reports.");
  }
  return userId;
}

export async function listReports(projectId?: string): Promise<Report[]> {
  if (!supabaseConfigured) {
    return [];
  }

  let query = supabase
    .from("reports")
    .select("*")
    .order("updated_at", { ascending: false, nullsFirst: false });

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Report[];
}

export async function getReport(id: string): Promise<Report | null> {
  if (!supabaseConfigured) {
    return null;
  }

  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Report) ?? null;
}

export async function createReport(input: {
  name: string;
  description?: string;
  projectId?: string | null;
  config?: any;
}): Promise<Report> {
  const owner = await requireUserId();

  const payload = {
    owner,
    name: input.name,
    description: input.description ?? null,
    project_id: input.projectId ?? null,
    config: input.config ?? {},
  };

  const { data, error } = await supabase
    .from("reports")
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Report;
}

export async function updateReport(
  id: string,
  patch: Partial<Pick<Report, "name" | "description" | "config" | "project_id">>
): Promise<Report> {
  const { data, error } = await supabase
    .from("reports")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as Report;
}

export async function deleteReport(id: string): Promise<void> {
  const { error } = await supabase.from("reports").delete().eq("id", id);
  if (error) {
    throw new Error(error.message);
  }
}

export type RunReportResult = { rows: any[]; meta: any };

type ReportConfig = {
  resource?: "tasks" | "projects";
  projectId?: string;
  status?: string;
  owner?: string;
  limit?: number;
  select?: string[];
  orderBy?: string;
  ascending?: boolean;
};

export async function runReport(config: any): Promise<RunReportResult> {
  if (!supabaseConfigured) {
    throw new Error("Reports are unavailable. Configure Supabase first.");
  }

  const safeConfig: ReportConfig =
    config && typeof config === "object" ? { ...config } : {};

  const resource: "tasks" | "projects" =
    safeConfig.resource === "projects" ? "projects" : "tasks";

  const limit = Math.min(Math.max(Number(safeConfig.limit) || 100, 1), 500);

  const select =
    Array.isArray(safeConfig.select) && safeConfig.select.length > 0
      ? safeConfig.select.join(",")
      : "*";

  let query = supabase.from(resource).select(select).limit(limit);

  if (resource === "tasks") {
    if (safeConfig.projectId) {
      query = query.eq("project_id", safeConfig.projectId);
    }
    if (safeConfig.status) {
      query = query.eq("status", safeConfig.status);
    }
  } else if (resource === "projects" && safeConfig.owner) {
    query = query.eq("owner", safeConfig.owner);
  }

  if (safeConfig.orderBy) {
    query = query.order(safeConfig.orderBy, {
      ascending: Boolean(safeConfig.ascending),
      nullsFirst: false,
    });
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];

  return {
    rows,
    meta: {
      resource,
      limit,
      count: rows.length,
      orderBy: safeConfig.orderBy ?? null,
    },
  };
}
