// @ts-nocheck
import { supabase } from "@/integrations/supabase/client";
import type { ProjectServiceOptions } from "../projects";
import { domainEventBus } from "@/domain/events/domainEventBus";
import type { TenantContext } from "@/domain/tenant";

export type PortfolioStatus = "draft" | "active" | "paused" | "archived";

export interface PortfolioRecord {
  id: string;
  workspace_id: string | null;
  owner_id: string | null;
  name: string;
  description: string | null;
  status: PortfolioStatus;
  health: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PortfolioOverview extends PortfolioRecord {
  project_count: number;
  item_count: number;
  completed_item_count: number;
}

export interface PortfolioListParams {
  search?: string;
  status?: PortfolioStatus;
  limit?: number;
}

export interface CreatePortfolioInput {
  name: string;
  description?: string;
  status?: PortfolioStatus;
  metadata?: Record<string, unknown> | null;
}

export interface PortfolioProjectLinkInput {
  portfolioId: string;
  projectId: string;
  strategicImportance?: number | null;
  metadata?: Record<string, unknown> | null;
}

const resolveTenant = (options?: ProjectServiceOptions): TenantContext | null =>
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

const escapeIlikeValue = (value: string) =>
  value.replace(/[%_]/g, match => `\\${match}`).replace(/,/g, "\\,");

const toOverview = (row: any): PortfolioOverview => ({
  id: row.id,
  workspace_id: row.workspace_id ?? null,
  owner_id: row.owner_id ?? null,
  name: row.name,
  description: row.description ?? null,
  status: row.status ?? "active",
  health: row.health ?? null,
  metadata: (row.metadata as Record<string, unknown> | null) ?? null,
  created_at: row.created_at,
  updated_at: row.updated_at,
  project_count: Number(row.project_count ?? 0),
  item_count: Number(row.item_count ?? 0),
  completed_item_count: Number(row.completed_item_count ?? 0),
});

export async function listPortfolios(
  params: PortfolioListParams = {},
  options?: ProjectServiceOptions,
): Promise<PortfolioOverview[]> {
  const client = resolveClient(options);
  let query = client
    .from("portfolio_overview" as any)
    .select("*")
    .order("updated_at", { ascending: false });

  query = applyWorkspaceConstraint(query, options);

  if (params.status) {
    query = query.eq("status", params.status);
  }

  const trimmedSearch = params.search?.trim();
  if (trimmedSearch) {
    const escaped = escapeIlikeValue(trimmedSearch);
    query = query.or(
      `name.ilike.%${escaped}%,description.ilike.%${escaped}%`,
    );
  }

  if (params.limit && params.limit > 0) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []).map(toOverview);
}

const fetchOverviewById = async (
  client: ReturnType<typeof resolveClient>,
  id: string,
  options?: ProjectServiceOptions,
): Promise<PortfolioOverview | null> => {
  let query = client
    .from("portfolio_overview" as any)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  const tenant = resolveTenant(options);
  if (tenant?.workspaceId) {
    query = client
      .from("portfolio_overview" as any)
      .select("*")
      .eq("id", id)
      .eq("workspace_id", tenant.workspaceId)
      .maybeSingle();
  }

  const { data, error } = await query;
  if (error) {
    return null;
  }
  if (!data) {
    return null;
  }
  return toOverview(data);
};

export async function createPortfolio(
  input: CreatePortfolioInput,
  options?: ProjectServiceOptions,
): Promise<PortfolioOverview> {
  const client = resolveClient(options);
  const tenant = resolveTenant(options);
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError) {
    throw authError;
  }

  const ownerId = auth?.user?.id ?? null;
  if (!ownerId) {
    throw new Error("User must be signed in to create portfolios");
  }

  const trimmedName = input.name?.trim();
  if (!trimmedName) {
    throw new Error("Portfolio name is required");
  }

  const payload = {
    name: trimmedName,
    description: input.description?.trim() || null,
    status: input.status ?? "active",
    metadata: input.metadata ?? {},
    owner_id: ownerId,
    workspace_id: tenant?.workspaceId ?? null,
  };

  const { data, error } = await client
    .from("portfolios" as any)
    .insert(payload as any)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const overview =
    (await fetchOverviewById(client, data.id, options)) ??
    ({
      ...toOverview({ ...data, project_count: 0, item_count: 0, completed_item_count: 0 }),
    } as PortfolioOverview);

  if (options?.client) {
    options.client.publish("portfolio.created", { portfolioId: overview.id });
  } else {
    domainEventBus.publish({
      type: "portfolio.created",
      payload: { portfolioId: overview.id },
      tenant: tenant ?? undefined,
    });
  }

  return overview;
}

export async function linkProjectToPortfolio(
  input: PortfolioProjectLinkInput,
  options?: ProjectServiceOptions,
) {
  const client = resolveClient(options);
  const tenant = resolveTenant(options);
  const { data: auth } = await client.auth.getUser();
  const userId = auth?.user?.id ?? null;

  const payload = {
    portfolio_id: input.portfolioId,
    project_id: input.projectId,
    strategic_importance: input.strategicImportance ?? null,
    metadata: input.metadata ?? {},
    added_by: userId,
  };

  const { data, error } = await client
    .from("portfolio_projects" as any)
    .upsert(payload as any, { onConflict: "portfolio_id,project_id" })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  const linkId = data?.id ?? null;

  const eventPayload = {
    entityType: "portfolio_project",
    portfolioId: input.portfolioId,
    projectId: input.projectId,
    linkId,
  };

  if (options?.client) {
    options.client.publish("entity.linked", eventPayload);
  } else {
    domainEventBus.publish({
      type: "entity.linked",
      payload: eventPayload,
      tenant: tenant ?? undefined,
    });
  }

  return data;
}

export async function unlinkProjectFromPortfolio(
  portfolioId: string,
  projectId: string,
  options?: ProjectServiceOptions,
): Promise<void> {
  const client = resolveClient(options);
  const tenant = resolveTenant(options);

  const { error } = await client
    .from("portfolio_projects" as any)
    .delete()
    .eq("portfolio_id", portfolioId)
    .eq("project_id", projectId);

  if (error) {
    throw error;
  }

  const payload = {
    entityType: "portfolio_project",
    portfolioId,
    projectId,
  };

  if (options?.client) {
    options.client.publish("entity.unlinked", payload);
  } else {
    domainEventBus.publish({
      type: "entity.unlinked",
      payload,
      tenant: tenant ?? undefined,
    });
  }
}
