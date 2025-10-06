import { supabase } from "@/integrations/supabase/client";
import type { Report } from "@/types";
import { handleSupabaseError, requireUserId } from "./utils";

const REPORT_FIELDS = "id, owner, name, description, config, created_at, updated_at";

export async function listReports(): Promise<Report[]> {
  const ownerId = await requireUserId();
  const { data, error } = await supabase
    .from("reports")
    .select(REPORT_FIELDS)
    .eq("owner", ownerId)
    .order("updated_at", { ascending: false });

  if (error) {
    handleSupabaseError(error, "Unable to load reports.");
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
    handleSupabaseError(error, "Unable to load the report.");
  }

  return (data as Report | null) ?? null;
}

export async function createReport(input: {
  name: string;
  description?: string;
  config?: any;
}): Promise<Report> {
  const ownerId = await requireUserId();
  const payload = {
    owner: ownerId,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    config: input.config ?? {},
  };

  if (!payload.name) {
    throw new Error("Report name is required.");
  }

  const { data, error } = await supabase
    .from("reports")
    .insert(payload)
    .select(REPORT_FIELDS)
    .single();

  if (error) {
    handleSupabaseError(error, "Unable to create the report.");
  }

  return data as Report;
}

export async function updateReport(
  id: string,
  patch: Partial<Pick<Report, "name" | "description" | "config">>
): Promise<Report> {
  if (!id) {
    throw new Error("Report id is required.");
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
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

  const { data, error } = await supabase
    .from("reports")
    .update(updates)
    .eq("id", id)
    .select(REPORT_FIELDS)
    .single();

  if (error) {
    handleSupabaseError(error, "Unable to update the report.");
  }

  return data as Report;
}

export async function deleteReport(id: string): Promise<void> {
  if (!id) {
    throw new Error("Report id is required.");
  }

  const { error } = await supabase.from("reports").delete().eq("id", id);

  if (error) {
    handleSupabaseError(error, "Unable to delete the report.");
  }
}
