import { supabase } from "@/integrations/supabase/client";
import type { DomainClient } from "@/domain/client";
import { domainEventBus } from "@/domain/events/domainEventBus";
import type { TenantContext } from "@/domain/tenant";

export type ProjectStatus =
  | "planning"
  | "active"
  | "on_hold"
  | "completed"
  | "cancelled"
  | "archived";
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

export interface ProjectServiceOptions {
  client?: DomainClient;
  tenant?: TenantContext;
}

const resolveTenant = (options?: ProjectServiceOptions) =>
  options?.tenant ?? options?.client?.tenant ?? null;

const resolveClient = (options?: ProjectServiceOptions) =>
  options?.client?.raw ?? supabase;

const applyWorkspaceConstraint = (builder: any, options?: ProjectServiceOptions) => {
  const tenant = resolveTenant(options);
  if (!tenant?.workspaceId || typeof builder?.eq !== "function") {
    return builder;
  }
  return builder.eq("workspace_id", tenant.workspaceId);
};

export async function listProjects(
  params: ProjectListParams = {},
  options?: ProjectServiceOptions,
): Promise<ProjectListResponse> {
  const {
    q,
    status,
    page = 1,
    pageSize = 20,
    sort = "updated_at",
    dir = "desc",
  } = params;

  const { start, end } = normalizePagination(page, pageSize);

  let query = resolveClient(options)
    .from("projects")
    .select("id, name, description, status, updated_at, created_at", { count: "exact" })
    .order(sort, { ascending: dir === "asc" });

  query = applyWorkspaceConstraint(query, options);

  if (status) {
    query = query.eq("status", status);
  }

  if (q) {
    const sanitized = escapeIlikeValue(q);
    const like = `%${sanitized}%`;
    query = query.or(`name.ilike.${like},description.ilike.${like}`);
  }

  const { data, error, count } = await query.range(start, end);

  if (error) {
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

export async function getProject(id: string, options?: ProjectServiceOptions): Promise<ProjectRecord | null> {
  let query = resolveClient(options).from("projects").select("*").eq("id", id);
  query = applyWorkspaceConstraint(query, options);

  const { data, error } = await query.single();

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
  status?: Exclude<ProjectStatus, "archived">;
  start_date?: string;
  end_date?: string;
}

export async function createProject(
  input: CreateProjectInput,
  options?: ProjectServiceOptions,
): Promise<ProjectRecord> {
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

  const tenant = resolveTenant(options);
  const payload = {
    name: trimmedName,
    description: input.description?.trim() || null,
    code: input.code?.trim() || null,
    status: input.status || "planning",
    start_date: input.start_date || null,
    end_date: input.end_date || null,
    owner_id: ownerId,
    workspace_id: tenant?.workspaceId ?? null,
    space_id: (tenant as any)?.spaceId ?? null,
  };

  const { data, error } = await (resolveClient(options)
    .from("projects")
    .insert(payload as any)
    .select()
    .single() as any);

  if (error) {
    throw error;
  }

  const project = data as any as ProjectRecord;
  if (options?.client) {
    options.client.publish("project.created", { projectId: project.id });
  } else {
    domainEventBus.publish({
      type: "project.created",
      payload: { projectId: project.id },
      tenant: tenant ?? undefined,
    });
  }
  return project;
}

export type UpdateProjectInput = Partial<Pick<ProjectRecord, "name" | "description" | "status" >>;

export async function updateProject(
  id: string,
  patch: UpdateProjectInput,
  options?: ProjectServiceOptions,
): Promise<ProjectRecord> {
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

  let query = resolveClient(options)
    .from("projects")
    .update(payload as any)
    .eq("id", id);

  query = applyWorkspaceConstraint(query, options);

  const { data, error } = await (query.select().single() as any);

  if (error) {
    throw error;
  }

  const project = data as any as ProjectRecord;
  if (options?.client) {
    options.client.publish("project.updated", { projectId: project.id });
  } else {
    domainEventBus.publish({
      type: "project.updated",
      payload: { projectId: project.id },
      tenant: resolveTenant(options) ?? undefined,
    });
  }
  return project;
}

export async function archiveProject(id: string, options?: ProjectServiceOptions): Promise<ProjectRecord> {
  const project = await updateProject(id, { status: "archived" }, options);
  if (options?.client) {
    options.client.publish("project.archived", { projectId: project.id });
  } else {
    domainEventBus.publish({
      type: "project.archived",
      payload: { projectId: project.id },
      tenant: resolveTenant(options) ?? undefined,
    });
  }
  return project;
}

export async function deleteProject(id: string, options?: ProjectServiceOptions): Promise<void> {
  let query = resolveClient(options)
    .from("projects")
    .delete()
    .eq("id", id);

  query = applyWorkspaceConstraint(query, options);

  const { error } = await query;

  if (error) {
    throw error;
  }

  if (options?.client) {
    options.client.publish("project.deleted", { projectId: id });
  } else {
    domainEventBus.publish({
      type: "project.deleted",
      payload: { projectId: id },
      tenant: resolveTenant(options) ?? undefined,
    });
  }
}
