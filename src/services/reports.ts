import { supabase } from "@/integrations/supabase/client";
import type { Report } from "@/types";

type ReportCreateInput = {
  name: string;
  description?: string;
  projectId?: string | null;
  config?: any;
};

type ReportUpdatePatch = Partial<
  Pick<Report, "name" | "description" | "config" | "project_id">
>;

const TABLE = "reports";

export async function listReports(projectId?: string): Promise<Report[]> {
  const query = supabase
    .from(TABLE)
    .select("*")
    .order("updated_at", { ascending: false });

  if (projectId) {
    query.eq("project_id", projectId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load reports", error);
    throw error;
  }

  return data ?? [];
}

export async function getReport(id: string): Promise<Report | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Failed to fetch report", error);
    throw error;
  }

  return data ?? null;
}

export async function createReport(input: ReportCreateInput): Promise<Report> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to create reports.");
  }

  const payload = {
    owner: user.id,
    name: input.name,
    description: input.description ?? null,
    project_id: input.projectId ?? null,
    config: input.config ?? {},
  };

  const { data, error } = await supabase
    .from(TABLE)
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("Failed to create report", error);
    throw error;
  }

  return data as Report;
}

export async function updateReport(
  id: string,
  patch: ReportUpdatePatch
): Promise<Report> {
  const updatePayload = {
    ...patch,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from(TABLE)
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update report", error);
    throw error;
  }

  return data as Report;
}

export async function deleteReport(id: string): Promise<void> {
  const { error } = await supabase.from(TABLE).delete().eq("id", id);

  if (error) {
    console.error("Failed to delete report", error);
    throw error;
  }
}

type ReportRunResult = {
  rows: any[];
  meta: any;
};

export async function runReport(config: any): Promise<ReportRunResult> {
  const source = config?.source ?? "tasks";
  const limit = typeof config?.limit === "number" ? config.limit : 100;

  if (source === "projects") {
    const query = supabase
      .from("projects")
      .select("id, name, status, owner, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error("Failed to run project report", error);
      throw error;
    }

    return {
      rows: data ?? [],
      meta: {
        source: "projects",
        count: data?.length ?? 0,
      },
    };
  }

  const taskQuery = supabase
    .from("tasks")
    .select("id, name, status, priority, project_id, assignee_id, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (config?.projectId) {
    taskQuery.eq("project_id", config.projectId);
  }

  if (config?.status) {
    taskQuery.eq("status", config.status);
  }

  const { data, error } = await taskQuery;

  if (error) {
    console.error("Failed to run task report", error);
    throw error;
  }

  return {
    rows: data ?? [],
    meta: {
      source: "tasks",
      count: data?.length ?? 0,
      filters: {
        projectId: config?.projectId ?? null,
        status: config?.status ?? null,
      },
    },
  };
}
