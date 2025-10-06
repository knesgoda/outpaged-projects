import { supabase } from "@/integrations/supabase/client";
import type { Dashboard, DashboardWidget } from "@/types";

export async function listDashboards(projectId?: string): Promise<Dashboard[]> {
  let query = supabase
    .from("dashboards")
    .select("*")
    .order("created_at", { ascending: false });

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[dashboards] listDashboards error", error);
    return [];
  }

  return (data as Dashboard[]) ?? [];
}

export async function getDashboard(id: string): Promise<Dashboard | null> {
  const { data, error } = await supabase
    .from("dashboards")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[dashboards] getDashboard error", error);
    return null;
  }

  return (data as Dashboard) ?? null;
}

type CreateDashboardInput = {
  name: string;
  projectId?: string | null;
  layout?: any;
};

export async function createDashboard(input: CreateDashboardInput): Promise<Dashboard> {
  const payload = {
    name: input.name,
    project_id: input.projectId ?? null,
    layout: input.layout ?? {},
  };

  const { data, error } = await supabase
    .from("dashboards")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to create dashboard");
  }

  return data as Dashboard;
}

type DashboardPatch = Partial<Pick<Dashboard, "name" | "layout" | "project_id">>;

export async function updateDashboard(id: string, patch: DashboardPatch): Promise<Dashboard> {
  const payload = {
    ...patch,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("dashboards")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to update dashboard");
  }

  return data as Dashboard;
}

export async function deleteDashboard(id: string): Promise<void> {
  const { error } = await supabase.from("dashboards").delete().eq("id", id);

  if (error) {
    throw error;
  }
}

export async function listWidgets(dashboardId: string): Promise<DashboardWidget[]> {
  const { data, error } = await supabase
    .from("dashboard_widgets")
    .select("*")
    .eq("dashboard_id", dashboardId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[dashboards] listWidgets error", error);
    return [];
  }

  return (data as DashboardWidget[]) ?? [];
}

type CreateWidgetInput = Omit<DashboardWidget, "id" | "dashboard_id" | "created_at" | "updated_at">;

export async function createWidget(
  dashboardId: string,
  input: CreateWidgetInput
): Promise<DashboardWidget> {
  const payload = {
    ...input,
    dashboard_id: dashboardId,
    config: input.config ?? {},
    position: input.position ?? {},
  };

  const { data, error } = await supabase
    .from("dashboard_widgets")
    .insert(payload)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to create widget");
  }

  return data as DashboardWidget;
}

type WidgetPatch = Partial<Pick<DashboardWidget, "title" | "config" | "position">>;

export async function updateWidget(id: string, patch: WidgetPatch): Promise<DashboardWidget> {
  const payload = {
    ...patch,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("dashboard_widgets")
    .update(payload)
    .eq("id", id)
    .select("*")
    .single();

  if (error || !data) {
    throw error ?? new Error("Failed to update widget");
  }

  return data as DashboardWidget;
}

export async function deleteWidget(id: string): Promise<void> {
  const { error } = await supabase.from("dashboard_widgets").delete().eq("id", id);

  if (error) {
    throw error;
  }
}
