import { supabase } from "@/integrations/supabase/client";

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "archived";

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  updated_at: string | null;
}

export interface ProjectRecord extends ProjectSummary {
  owner: string;
  created_at: string;
}

export interface ProjectListQuery {
  q?: string;
  status?: ProjectStatus;
  page: number;
  pageSize: number;
  sort: "updated_at" | "created_at" | "name";
  dir: "asc" | "desc";
}

export interface ProjectListResult {
  data: ProjectSummary[];
  total: number;
}

export interface CreateProjectInput {
  name: string;
  description: string | null;
}

export interface UpdateProjectInput {
  id: string;
  patch: Partial<{
    name: string;
    description: string | null;
    status: ProjectStatus;
  }>;
}

export interface ArchiveProjectInput {
  id: string;
}

export interface DeleteProjectInput {
  id: string;
}

function handleError(error: unknown, message: string): never {
  if (error instanceof Error) {
    throw new Error(`${message}: ${error.message}`);
  }
  throw new Error(message);
}

const PROJECT_COLUMNS =
  "id, owner, owner_id, name, description, status, created_at, updated_at" as const;

function normalizeProject(row: Record<string, any>): ProjectRecord {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    status: row.status as ProjectStatus,
    updated_at: row.updated_at ?? null,
    owner: row.owner ?? row.owner_id,
    created_at: row.created_at,
  };
}

export async function listProjects(params: ProjectListQuery): Promise<ProjectListResult> {
  const { q, status, page, pageSize, sort, dir } = params;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("projects")
    .select("id, name, description, status, updated_at", { count: "exact" });

  if (q) {
    query = query.ilike("name", `%${q}%`);
  }

  if (status) {
    query = query.eq("status", status);
  }

  query = query.order(sort, { ascending: dir === "asc" }).range(from, to);

  const { data, error, count } = await query;

  if (error) {
    handleError(error, "Failed to load projects");
  }

  return {
    data: (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? null,
      status: row.status as ProjectStatus,
      updated_at: row.updated_at ?? null,
    })),
    total: count ?? 0,
  };
}

export async function getProject(id: string): Promise<ProjectRecord | null> {
  const { data, error } = await supabase
    .from("projects")
    .select(PROJECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    handleError(error, "Failed to load project");
  }

  if (!data) {
    return null;
  }

  return normalizeProject(data);
}

export async function createProject(input: CreateProjectInput): Promise<ProjectRecord> {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData?.user) {
    handleError(authError, "You must be signed in to create a project");
  }

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: input.name,
      description: input.description,
      owner: authData.user.id,
      owner_id: authData.user.id,
    })
    .select(PROJECT_COLUMNS)
    .single();

  if (error || !data) {
    handleError(error, "Failed to create project");
  }

  return normalizeProject(data);
}

export async function updateProject(input: UpdateProjectInput): Promise<ProjectRecord> {
  const { id, patch } = input;
  const { data, error } = await supabase
    .from("projects")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(PROJECT_COLUMNS)
    .single();

  if (error || !data) {
    handleError(error, "Failed to update project");
  }

  return normalizeProject(data);
}

export async function archiveProject(input: ArchiveProjectInput): Promise<ProjectRecord> {
  const { id } = input;
  const { data, error } = await supabase
    .from("projects")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(PROJECT_COLUMNS)
    .single();

  if (error || !data) {
    handleError(error, "Failed to archive project");
  }

  return normalizeProject(data);
}

export async function deleteProject(input: DeleteProjectInput): Promise<void> {
  const { id } = input;
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    handleError(error, "Failed to delete project");
  }
}
