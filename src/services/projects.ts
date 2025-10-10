import { supabase } from "@/integrations/supabase/client";

export type ProjectStatus = "active" | "archived";
export type ProjectSort = "updated_at" | "created_at" | "name";
export type SortDirection = "asc" | "desc";

export interface ProjectRecord {
  id: string;
  owner: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export type ProjectSummary = Pick<
  ProjectRecord,
  "id" | "name" | "description" | "status" | "updated_at" | "created_at"
>;

export interface ProjectListParams {
  q?: string;
  status?: ProjectStatus;
  page?: number;
  pageSize?: number;
  sort?: ProjectSort;
  dir?: SortDirection;
}

export interface ProjectListResponse {
  data: ProjectSummary[];
  total: number;
}

const escapeIlikeValue = (value: string) =>
  value.replace(/[%_]/g, match => `\\${match}`).replace(/,/g, "\\,");

const normalizePagination = (page?: number, pageSize?: number) => {
  const resolvedPage = page && page > 0 ? page : 1;
  const resolvedSize = pageSize && pageSize > 0 ? pageSize : 20;
  const start = (resolvedPage - 1) * resolvedSize;
  const end = start + resolvedSize - 1;
  return { start, end };
};

export async function listProjects(params: ProjectListParams = {}): Promise<ProjectListResponse> {
  const {
    q,
    status,
    page = 1,
    pageSize = 20,
    sort = "updated_at",
    dir = "desc",
  } = params;

  console.log('listProjects called with params:', { q, status, page, pageSize, sort, dir });

  const { start, end } = normalizePagination(page, pageSize);

  let query = (supabase
    .from("projects")
    .select("id, name, description, status, updated_at, created_at", { count: "exact" })
    .order(sort, { ascending: dir === "asc" }) as any);

  if (status) {
    query = query.eq("status", status);
  }

  if (q) {
    const sanitized = escapeIlikeValue(q);
    const like = `%${sanitized}%`;
    query = query.or(`name.ilike.${like},description.ilike.${like}`);
  }

  const { data, error, count } = await query.range(start, end);

  console.log('listProjects result:', { 
    dataCount: data?.length, 
    totalCount: count, 
    hasError: !!error,
    errorMessage: error?.message 
  });

  if (error) {
    console.error('listProjects error:', error);
    throw error;
  }

  return {
    data: (data ?? []).map(row => ({
      ...row,
      description: row.description ?? null,
    })) as ProjectSummary[],
    total: count ?? 0,
  };
}

export async function getProject(id: string): Promise<ProjectRecord | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    if ((error as { code?: string }).code === "PGRST116") {
      return null;
    }
    throw error;
  }

  return data as any as ProjectRecord;
}

export interface CreateProjectInput {
  name: string;
  description?: string;
  code?: string;
  status?: "planning" | "active" | "completed" | "on_hold";
  start_date?: string;
  end_date?: string;
}

export async function createProject(input: CreateProjectInput): Promise<ProjectRecord> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError) {
    throw authError;
  }

  const ownerId = auth?.user?.id;
  if (!ownerId) {
    throw new Error("User must be signed in to create projects");
  }

  const trimmedName = input.name.trim();
  if (!trimmedName) {
    throw new Error("Project name is required");
  }

  const { data, error } = await (supabase
    .from("projects")
    .insert({
      name: trimmedName,
      description: input.description?.trim() || null,
      code: input.code?.trim() || null,
      status: input.status || "planning",
      start_date: input.start_date || null,
      end_date: input.end_date || null,
      owner_id: ownerId,
    })
    .select()
    .single() as any);

  if (error) {
    throw error;
  }

  return data as any as ProjectRecord;
}

export type UpdateProjectInput = Partial<Pick<ProjectRecord, "name" | "description" | "status" >>;

export async function updateProject(id: string, patch: UpdateProjectInput): Promise<ProjectRecord> {
  const nextPatch: UpdateProjectInput = { ...patch };

  if (nextPatch.name !== undefined) {
    const trimmedName = nextPatch.name.trim();
    if (!trimmedName) {
      throw new Error("Project name cannot be empty");
    }
    nextPatch.name = trimmedName;
  }

  if (nextPatch.description !== undefined && nextPatch.description !== null) {
    const trimmedDescription = nextPatch.description.trim();
    nextPatch.description = trimmedDescription ? trimmedDescription : null;
  }

  if (nextPatch.description === "") {
    nextPatch.description = null;
  }

  const payload = {
    ...nextPatch,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await (supabase
    .from("projects")
    .update(payload as any)
    .eq("id", id)
    .select()
    .single() as any);

  if (error) {
    throw error;
  }

  return data as any as ProjectRecord;
}

export async function archiveProject(id: string): Promise<ProjectRecord> {
  return updateProject(id, { status: "archived" });
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id);

  if (error) {
    throw error;
  }
}
