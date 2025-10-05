import { supabase } from "@/integrations/supabase/client";
import { Report } from "@/types";
import { requireUserId, supabaseErrorMessage } from "./utils";

export async function listReports(): Promise<Report[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(supabaseErrorMessage(error, "Could not load reports"));
  }

  return data ?? [];
}

export async function getReport(id: string): Promise<Report | null> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    if ((error as { code?: string }).code === "PGRST116") {
      return null;
    }
    throw new Error(supabaseErrorMessage(error, "Could not load the report"));
  }

  return data ?? null;
}

export async function createReport(input: {
  name: string;
  description?: string;
  config?: any;
}): Promise<Report> {
  const owner = await requireUserId();
  const payload = {
    owner,
    name: input.name,
    description: input.description ?? null,
    config: input.config ?? {},
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("reports")
    .insert(payload)
    .select("*")
    .single();

  if (error) {
    throw new Error(supabaseErrorMessage(error, "Could not create the report"));
  }

  return data as Report;
}

export async function updateReport(
  id: string,
  patch: Partial<Pick<Report, "name" | "description" | "config">>
): Promise<Report> {
  const changes: Partial<Report> = {
    ...patch,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("reports")
    .update(changes)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(supabaseErrorMessage(error, "Could not update the report"));
  }

  return data as Report;
}

export async function deleteReport(id: string): Promise<void> {
  const { error } = await supabase.from("reports").delete().eq("id", id);

  if (error) {
    throw new Error(supabaseErrorMessage(error, "Could not delete the report"));
  }
}
