// @ts-nocheck
import { supabase, resolvedSupabaseUrl } from "@/integrations/supabase/client";
import type { DomainClient } from "@/domain/client";
import { domainEventBus } from "@/domain/events/domainEventBus";
import type { TenantContext } from "@/domain/tenant";

export interface ProjectLifecyclePhase {
  key: string;
  label: string;
  description?: string | null;
  gate_date?: string | null;
  owner?: string | null;
}

export interface ProjectLifecycleMetadata {
  preset?: string | null;
  kickoff_date?: string | null;
  discovery_complete?: string | null;
  launch_target?: string | null;
  review_cadence?: string | null;
  maintenance_window?: string | null;
  phases?: ProjectLifecyclePhase[] | null;
  notes?: string | null;
  mission?: string | null;
  success_metrics?: string[] | null;
  stakeholders?: string[] | null;
  communication_channels?: string[] | null;
}

export interface ProjectArchivalPolicy {
  retention_period_days?: number | null;
  export_destinations?: string[] | null;
  notify_groups?: string[] | null;
  workflow_id?: string | null;
  name?: string | null;
}

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
  code: string | null;
  template_key: string | null;
  modules: string[] | null;
  permission_scheme_id: string | null;
  notification_scheme_id: string | null;
  sla_scheme_id: string | null;
  import_strategy: string | null;
  import_sources: string[] | null;
  calendar_id: string | null;
  timezone: string | null;
  lifecycle: ProjectLifecycleMetadata | null;
  field_configuration: string[] | null;
  workflow_ids: string[] | null;
  screen_ids: string[] | null;
  component_catalog: string[] | null;
  version_streams: string[] | null;
  automation_rules: string[] | null;
  integration_configs: string[] | null;
  default_views: string[] | null;
  dashboard_ids: string[] | null;
  archival_policy: ProjectArchivalPolicy | null;
  published_at: string | null;
  archived_at: string | null;
}

export type ProjectSummary = Pick<
  ProjectRecord,
  | "id"
  | "name"
  | "description"
  | "status"
  | "updated_at"
  | "created_at"
  | "template_key"
  | "modules"
  | "published_at"
>;

export interface ProjectListParams {
  q?: string;
  status?: ProjectStatus;
  page?: number;
  pageSize?: number;
  sort?: ProjectSort;
  dir?: SortDirection;
  portfolioId?: string;
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

const normalizeArray = (value?: string[] | null) => {
  if (!value) {
    return null;
  }
  const cleaned = value
    .map(item => (typeof item === "string" ? item.trim() : ""))
    .filter((item): item is string => Boolean(item));
  if (!cleaned.length) {
    return null;
  }
  return Array.from(new Set(cleaned));
};

const normalizeLifecycle = (lifecycle?: ProjectLifecycleMetadata | null): ProjectLifecycleMetadata | null => {
  if (!lifecycle) {
    return null;
  }
  const phases = lifecycle.phases?.map(phase => ({
    ...phase,
    description: phase.description ?? null,
    gate_date: phase.gate_date ?? null,
    owner: phase.owner ?? null,
  }));

  return {
    ...lifecycle,
    preset: lifecycle.preset ?? null,
    kickoff_date: lifecycle.kickoff_date ?? null,
    discovery_complete: lifecycle.discovery_complete ?? null,
    launch_target: lifecycle.launch_target ?? null,
    review_cadence: lifecycle.review_cadence ?? null,
    maintenance_window: lifecycle.maintenance_window ?? null,
    phases: phases ?? null,
    notes: lifecycle.notes ?? null,
    mission: lifecycle.mission ?? null,
    success_metrics: normalizeArray(lifecycle.success_metrics ?? null),
    stakeholders: normalizeArray(lifecycle.stakeholders ?? null),
    communication_channels: normalizeArray(lifecycle.communication_channels ?? null),
  };
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
    portfolioId,
  } = params;

  const { start, end } = normalizePagination(page, pageSize);

  let query = resolveClient(options)
    .from("projects")
    .select(
      "id, name, description, status, updated_at, created_at",
      { count: "exact" },
    )
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

  if (portfolioId) {
    const { data: links, error: linksError } = await resolveClient(options)
      .from("portfolio_projects" as any)
      .select("project_id")
      .eq("portfolio_id", portfolioId);

    if (linksError) {
      throw linksError;
    }

    const projectIds = (links ?? [])
      .map(link => link.project_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (projectIds.length === 0) {
      return { data: [], total: 0 };
    }

    query = query.in("id", projectIds);
  }

  const { data, error, count } = await query.range(start, end);

  if (error) {
    throw error;
  }

  return {
    data: (data ?? []).map(row => ({
      ...row,
      description: row.description ?? null,
      template_key: row.template_key ?? null,
      modules: row.modules ?? null,
      published_at: row.published_at ?? null,
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
  template_key?: string;
  modules?: string[];
  permission_scheme_id?: string;
  notification_scheme_id?: string;
  sla_scheme_id?: string;
  import_strategy?: string;
  import_sources?: string[];
  calendar_id?: string;
  timezone?: string;
  lifecycle?: ProjectLifecycleMetadata;
  field_configuration?: string[];
  workflow_ids?: string[];
  screen_ids?: string[];
  component_catalog?: string[];
  version_streams?: string[];
  automation_rules?: string[];
  integration_configs?: string[];
  default_views?: string[];
  dashboard_ids?: string[];
  archival_policy?: ProjectArchivalPolicy;
}

export async function createProject(
  input: CreateProjectInput,
  options?: ProjectServiceOptions,
): Promise<ProjectRecord> {
  const client = resolveClient(options);
  const { data: auth, error: authError } = await client.auth.getUser();
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
    template_key: input.template_key ?? null,
    modules: normalizeArray(input.modules ?? null),
    permission_scheme_id: input.permission_scheme_id ?? null,
    notification_scheme_id: input.notification_scheme_id ?? null,
    sla_scheme_id: input.sla_scheme_id ?? null,
    import_strategy: input.import_strategy ?? null,
    import_sources: normalizeArray(input.import_sources ?? null),
    calendar_id: input.calendar_id ?? null,
    timezone: input.timezone ?? null,
    lifecycle: normalizeLifecycle(input.lifecycle ?? null),
    field_configuration: normalizeArray(input.field_configuration ?? null),
    workflow_ids: normalizeArray(input.workflow_ids ?? null),
    screen_ids: normalizeArray(input.screen_ids ?? null),
    component_catalog: normalizeArray(input.component_catalog ?? null),
    version_streams: normalizeArray(input.version_streams ?? null),
    automation_rules: normalizeArray(input.automation_rules ?? null),
    integration_configs: normalizeArray(input.integration_configs ?? null),
    default_views: normalizeArray(input.default_views ?? null),
    dashboard_ids: normalizeArray(input.dashboard_ids ?? null),
    archival_policy: input.archival_policy ?? null,
    published_at: null,
    archived_at: null,
  };

  const { data, error } = await (client
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

export type UpdateProjectInput = Partial<
  Pick<
    ProjectRecord,
    | "name"
    | "description"
    | "status"
    | "code"
    | "template_key"
    | "modules"
    | "permission_scheme_id"
    | "notification_scheme_id"
    | "sla_scheme_id"
    | "import_strategy"
    | "import_sources"
    | "calendar_id"
    | "timezone"
    | "lifecycle"
    | "field_configuration"
    | "workflow_ids"
    | "screen_ids"
    | "component_catalog"
    | "version_streams"
    | "automation_rules"
    | "integration_configs"
    | "default_views"
    | "dashboard_ids"
    | "archival_policy"
    | "published_at"
    | "archived_at"
  >
>;

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

  if (nextPatch.code !== undefined) {
    const trimmedCode = nextPatch.code?.trim();
    nextPatch.code = trimmedCode ? trimmedCode.toUpperCase() : null;
  }

  const arrayFields: (keyof UpdateProjectInput)[] = [
    "modules",
    "import_sources",
    "field_configuration",
    "workflow_ids",
    "screen_ids",
    "component_catalog",
    "version_streams",
    "automation_rules",
    "integration_configs",
    "default_views",
    "dashboard_ids",
  ];

  for (const key of arrayFields) {
    if (key in nextPatch) {
      const value = nextPatch[key];
      nextPatch[key] = normalizeArray(value as any) as any;
    }
  }

  if ("lifecycle" in nextPatch) {
    nextPatch.lifecycle = normalizeLifecycle(nextPatch.lifecycle ?? null) ?? null;
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

const PROJECT_LIFECYCLE_FUNCTION = `${resolvedSupabaseUrl}/functions/v1/project-lifecycle`;

async function getLifecycleToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw error;
  }
  const token = data?.session?.access_token;
  if (!token) {
    throw new Error("Missing Supabase access token");
  }
  return token;
}

export interface CloneProjectOptions {
  includeItems?: boolean;
  includeBoards?: boolean;
  includeAutomations?: boolean;
  includeFields?: boolean;
  includeWorkflows?: boolean;
  includeSprints?: boolean;
  moduleOverrides?: string[] | null;
}

export async function cloneProject(
  sourceProjectId: string,
  input: { name?: string; code?: string; options?: CloneProjectOptions } = {},
) {
  const token = await getLifecycleToken();
  const response = await fetch(PROJECT_LIFECYCLE_FUNCTION, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: "clone",
      sourceProjectId,
      name: input.name,
      code: input.code,
      options: input.options ?? {},
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Failed to clone project");
  }

  return response.json();
}

export interface ExportProjectOptions {
  includeHistory?: boolean;
  includeAutomations?: boolean;
  includeBoards?: boolean;
  includeFields?: boolean;
  includeTasks?: boolean;
}

export async function exportProjectBundle(projectId: string, options: ExportProjectOptions = {}) {
  const token = await getLifecycleToken();
  const response = await fetch(PROJECT_LIFECYCLE_FUNCTION, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      action: "export",
      projectId,
      options,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "Failed to export project");
  }

  return response.json();
}

export async function archiveProject(id: string, options?: ProjectServiceOptions): Promise<ProjectRecord> {
  const project = await updateProject(
    id,
    { status: "archived", archived_at: new Date().toISOString() },
    options,
  );
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

export async function publishProject(id: string, options?: ProjectServiceOptions): Promise<ProjectRecord> {
  const project = await updateProject(
    id,
    { status: "active", published_at: new Date().toISOString(), archived_at: null },
    options,
  );
  if (options?.client) {
    options.client.publish("project.published", { projectId: project.id });
  } else {
    domainEventBus.publish({
      type: "project.published",
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
