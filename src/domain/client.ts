import { useMemo } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase as defaultSupabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { domainEventBus } from "./events/domainEventBus";
import type { DomainEventType } from "./events/domainEventBus";
import type { TenantContext } from "./tenant";
import { useTenant } from "./tenant";

const WORKSPACE_SCOPED_TABLES: Record<string, string> = {
  projects: "workspace_id",
  spaces: "workspace_id",
  workspace_members: "workspace_id",
  workspace_settings: "workspace_id",
};

const ORGANIZATION_SCOPED_TABLES: Record<string, string> = {
  workspaces: "organization_id",
  organization_members: "organization_id",
};

export interface DomainTelemetry {
  track: (event: DomainEventType, payload?: Record<string, unknown>) => void;
  trackError: (error: unknown, context?: Record<string, unknown>) => void;
}

export interface DomainClientOptions {
  supabase?: SupabaseClient<Database>;
  tenant: TenantContext;
  telemetry?: DomainTelemetry;
}

export class DomainClient {
  private readonly supabase: SupabaseClient<Database>;

  constructor(private readonly options: DomainClientOptions) {
    this.supabase = options.supabase ?? defaultSupabase;
  }

  get tenant(): TenantContext {
    return this.options.tenant;
  }

  get raw(): SupabaseClient<Database> {
    return this.supabase;
  }

  private scopeQuery<T extends keyof Database["public"]["Tables"]>(
    table: T,
    query: ReturnType<SupabaseClient<Database>["from"]>
  ) {
    const workspaceColumn = WORKSPACE_SCOPED_TABLES[String(table)];
    const organizationColumn = ORGANIZATION_SCOPED_TABLES[String(table)];
    const { tenant } = this.options as { tenant: TenantContext };

    if (workspaceColumn && tenant.workspaceId) {
      return (query as any).eq(workspaceColumn, tenant.workspaceId);
    }

    if (organizationColumn && tenant.organizationId) {
      return (query as any).eq(organizationColumn, tenant.organizationId);
    }

    return query;
  }

  from<T extends keyof Database["public"]["Tables"]>(table: T) {
    const query = this.supabase.from(table as string);
    return this.scopeQuery(table, query);
  }

  scope<T extends keyof Database["public"]["Tables"]>(
    table: T,
    query: ReturnType<SupabaseClient<Database>["from"]>
  ) {
    return this.scopeQuery(table, query);
  }

  rpc<Name extends keyof Database["public"]["Functions"] & string>(
    functionName: Name,
    args?: Database["public"]["Functions"][Name]["Args"],
    config?: Parameters<SupabaseClient<Database>["rpc"]>[2]
  ) {
    return this.supabase.rpc(functionName, args as never, config);
  }

  withTenant(tenant: TenantContext) {
    return new DomainClient({
      ...this.options,
      tenant,
    });
  }

  publish(event: DomainEventType, payload: Record<string, unknown> = {}) {
    domainEventBus.publish({
      type: event,
      payload,
      tenant: this.options.tenant,
    });
    this.options.telemetry?.track(event, payload);
  }

  reportError(error: unknown, context: Record<string, unknown> = {}) {
    console.error("Domain client error", {
      error,
      tenant: this.options.tenant,
      context,
    });
    this.options.telemetry?.trackError(error, { ...context, tenant: this.options.tenant });
  }
}

export function useDomainClient(options?: Partial<Omit<DomainClientOptions, "tenant">>) {
  const tenant = useTenant();

  return useMemo(() => {
    return new DomainClient({
      tenant,
      supabase: options?.supabase,
      telemetry: options?.telemetry,
    });
  }, [tenant, options?.supabase, options?.telemetry]);
}
