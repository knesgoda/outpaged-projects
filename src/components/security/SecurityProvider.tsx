import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useFeatureFlags } from "@/components/feature-flags/FeatureFlagProvider";
import { useTelemetry } from "@/components/telemetry/TelemetryProvider";
import { useDomainClient } from "@/domain/client";
import { domainEventBus } from "@/domain/events/domainEventBus";
import { useTenant } from "@/domain/tenant";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import { createAuditClient } from "./auditClient";

interface SecurityContextType {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
  securityLevel: "basic" | "enhanced" | "enterprise";
  isSecureEnvironment: boolean;
  auditLog: (action: string, resource: string) => void;
  refresh: () => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

const ROLE_MATRIX: Record<string, string[]> = {
  owner: ["*"],
  admin: [
    "read:projects",
    "write:projects",
    "read:tasks",
    "write:tasks",
    "read:reports",
    "write:reports",
    "admin:users",
    "admin:system",
    "admin:audit",
    "admin:security",
  ],
  manager: [
    "read:projects",
    "write:projects",
    "read:tasks",
    "write:tasks",
    "read:reports",
  ],
  contributor: [
    "read:projects",
    "write:tasks",
    "read:tasks",
  ],
  requester: [
    "read:projects",
    "read:tasks",
    "create:requests",
  ],
  guest: ["read:projects"],
};

export function SecurityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const tenant = useTenant();
  const domainClient = useDomainClient();
  const telemetry = useTelemetry();
  const { isEnabled } = useFeatureFlags();
  const [permissions, setPermissions] = useState<string[]>([]);
  const auditClient = useMemo(() => createAuditClient(), []);

  const securityLevel: "basic" | "enhanced" | "enterprise" = useMemo(() => {
    if (isEnabled("governance-suite")) {
      return "enterprise";
    }
    if (isEnabled("dynamic-fields")) {
      return "enhanced";
    }
    return "basic";
  }, [isEnabled]);

  const derivePermissions = useCallback((role: string | null | undefined, explicit?: string[] | null) => {
    if (role === "owner") {
      return ["*"];
    }
    const base = role ? ROLE_MATRIX[role] ?? ROLE_MATRIX.guest : ROLE_MATRIX.guest;
    const next = new Set(base);
    (explicit ?? []).forEach((permission) => next.add(permission));
    return Array.from(next);
  }, []);

  const loadPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      return;
    }
    if (!tenant.workspaceId) {
      setPermissions(ROLE_MATRIX.guest);
      return;
    }

    try {
      const scoped = domainClient.scope("workspace_members" as any, domainClient.raw.from("workspace_members" as any));
      const { data, error } = await scoped
        .select("role, explicit_permissions")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      const role = (data as { role?: string } | null)?.role ?? null;
      const explicit = (data as { explicit_permissions?: string[] } | null)?.explicit_permissions ?? [];
      const derived = derivePermissions(role, explicit);
      setPermissions(derived);
      telemetry.track("security.policy-refreshed", { role: role ?? "unknown" });
    } catch (error) {
      telemetry.trackError(error, { module: "SecurityProvider" });
      toast({
        variant: "destructive",
        title: "Permission load failed",
        description: "We could not verify your workspace access. Some actions may be disabled.",
      });
      setPermissions(ROLE_MATRIX.guest);
    }
  }, [derivePermissions, domainClient, telemetry, tenant.workspaceId, toast, user]);

  useEffect(() => {
    void loadPermissions();
  }, [loadPermissions]);

  useEffect(() => {
    const unsubscribe = domainEventBus.subscribe("tenant.changed", () => {
      void loadPermissions();
    });
    return unsubscribe;
  }, [loadPermissions]);

  const hasPermission = useCallback(
    (permission: string) => {
      if (permissions.includes("*")) {
        return true;
      }

      if (permission.includes(":")) {
        return permissions.includes(permission);
      }

      return permissions.some((candidate) => candidate.startsWith(`${permission}:`) || candidate === permission);
    },
    [permissions]
  );

  const isSecureEnvironment =
    (typeof location !== "undefined" && location.protocol === "https:") ||
    (typeof location === "undefined" && tenant.environment !== "development");

  const auditLog = useCallback(
    (action: string, resource: string) => {
      if (!user) {
        return;
      }

      const entry = {
        userId: user.id,
        action,
        resource,
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        workspaceId: tenant.workspaceId,
        environment: tenant.environment,
        ip: "client-ip",
      };

      const isTestEnvironment =
        (typeof process !== "undefined" && process.env?.NODE_ENV === "test") ||
        ((globalThis as { __import_meta_env__?: Record<string, unknown> }).__import_meta_env__?.MODE === "test");

      if (!isTestEnvironment) {
        console.log(
          `[AUDIT] User: ${entry.userId}, Action: ${entry.action}, Resource: ${entry.resource}, Workspace: ${entry.workspaceId}`
        );
      }

      if (!auditClient) {
        return;
      }

      void auditClient.log(entry).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "Unable to reach the audit service.";
        console.error("Failed to send audit log entry", error);
        toast({
          variant: "destructive",
          title: "Audit logging failed",
          description: message,
        });
      });
    },
    [auditClient, tenant.environment, tenant.workspaceId, toast, user]
  );

  const refresh = useCallback(async () => {
    await loadPermissions();
  }, [loadPermissions]);

  const value = useMemo(
    () => ({
      permissions,
      hasPermission,
      securityLevel,
      isSecureEnvironment,
      auditLog,
      refresh,
    }),
    [auditLog, hasPermission, permissions, refresh, securityLevel, isSecureEnvironment]
  );

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function useSecurity() {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error("useSecurity must be used within SecurityProvider");
  }
  return context;
}
