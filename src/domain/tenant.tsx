import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";

import { useAuth } from "@/hooks/useAuth";
import { useWorkspaceContext } from "@/state/workspace";
import { domainEventBus } from "./events/domainEventBus";

export type TenantEnvironment = "production" | "staging" | "development" | "preview";

export interface TenantContext {
  organizationId: string;
  workspaceId: string | null;
  spaceId: string | null;
  userId: string | null;
  environment: TenantEnvironment;
}

const DEFAULT_TENANT: TenantContext = {
  organizationId: "default-org",
  workspaceId: null,
  spaceId: null,
  userId: null,
  environment: typeof import.meta !== "undefined" && import.meta.env?.MODE
    ? (import.meta.env.MODE as TenantEnvironment)
    : "development",
};

const TenantContextInstance = createContext<TenantContext>(DEFAULT_TENANT);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { currentWorkspace, currentSpace, currentOrganization } = useWorkspaceContext();
  const { user } = useAuth();

  const value = useMemo<TenantContext>(() => {
    const organizationId =
      currentOrganization?.id ??
      (currentWorkspace?.settings as { organization_id?: string } | undefined)?.organization_id ??
      (currentWorkspace?.id ? `org-${currentWorkspace.id.slice(0, 8)}` : DEFAULT_TENANT.organizationId);

    const environment =
      typeof import.meta !== "undefined" && import.meta.env?.MODE
        ? ((import.meta.env.MODE as TenantEnvironment) ?? DEFAULT_TENANT.environment)
        : DEFAULT_TENANT.environment;

    return {
      organizationId,
      workspaceId: currentWorkspace?.id ?? null,
      spaceId: currentSpace?.id ?? null,
      userId: user?.id ?? null,
      environment,
    };
  }, [currentWorkspace, currentSpace, currentOrganization, user]);

  useEffect(() => {
    domainEventBus.publish({
      type: "tenant.changed",
      payload: value,
      tenant: value,
    });
  }, [value]);

  return <TenantContextInstance.Provider value={value}>{children}</TenantContextInstance.Provider>;
}

export function useTenant(): TenantContext {
  return useContext(TenantContextInstance);
}
