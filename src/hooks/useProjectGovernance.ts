import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  PROJECT_NOTIFICATION_SCHEMES,
  PROJECT_PERMISSION_SCHEMES,
  PROJECT_ROLES,
  ProjectPermissionScheme,
  ProjectRoleDefinition,
  projectRoleAtLeast,
  type ProjectPermissionKey,
  type ProjectRoleKey,
} from "@/domain/projects/governance";
import {
  determineHighestRole,
  fetchProjectGovernance,
  removeFieldSecurityRule,
  removeItemPrivacyRule,
  removeProjectMember,
  resolveNotificationScheme,
  resolvePermissionScheme,
  setGuestAccess,
  setProjectNotificationScheme,
  setProjectPermissionScheme,
  upsertFieldSecurityRule,
  upsertItemPrivacyRule,
  upsertProjectMember,
  updateProjectMemberRole,
  type ProjectGovernanceSnapshot,
  type ProjectItemPrivacyRule,
  type ProjectMembership,
  type ProjectMembershipStatus,
  type ProjectGuestAccess,
} from "@/services/projects/projectGovernanceService";

const GOVERNANCE_KEY = (projectId?: string) => ["project", projectId, "governance"] as const;
const AUTH_USER_KEY = ["auth", "current-user"] as const;

export interface ProjectGovernancePermissions {
  canViewProject: boolean;
  canCreateItems: boolean;
  canManageSettings: boolean;
  canManageLifecycle: boolean;
  canManageMembers: boolean;
  canManageFieldSecurity: boolean;
  canManageNotifications: boolean;
  canManageAutomations: boolean;
  canManageIntegrations: boolean;
  canManageGuests: boolean;
  canViewAuditLog: boolean;
  canDeleteProject: boolean;
}

export interface ProjectGovernanceActions {
  inviteMember: (input: {
    userId: string;
    email: string;
    name: string;
    roleId: ProjectRoleKey;
    status?: ProjectMembershipStatus;
  }) => Promise<void>;
  updateMemberRole: (userId: string, roleId: ProjectRoleKey) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  setPermissionScheme: (schemeId: string) => Promise<void>;
  setNotificationScheme: (schemeId: string) => Promise<void>;
  updateFieldSecurityRule: (rule: {
    fieldKey: string;
    label: string;
    classification: ProjectGovernanceSnapshot["fieldSecurityRules"][number]["classification"];
    minRoleToView: ProjectRoleKey;
    minRoleToEdit: ProjectRoleKey;
    maskBelowRole?: ProjectRoleKey;
  }) => Promise<void>;
  removeFieldSecurityRule: (fieldKey: string) => Promise<void>;
  upsertItemPrivacyRule: (rule: {
    itemKey: string;
    label: string;
    visibility: ProjectRoleKey;
    reason?: string;
  }) => Promise<void>;
  removeItemPrivacyRule: (ruleId: string) => Promise<void>;
  setGuestAccess: (options: {
    enabled: boolean;
    allowedRole: ProjectRoleKey;
    expiresAt?: string | null;
    requireEmailVerification?: boolean;
  }) => Promise<void>;
}

export interface ProjectGovernanceState {
  projectId?: string;
  isLoading: boolean;
  isFetching: boolean;
  membership: ProjectMembership[];
  currentMember?: ProjectMembership | null;
  currentRole: ProjectRoleKey;
  roleDefinition?: ProjectRoleDefinition;
  permissionScheme: ProjectPermissionScheme;
  notificationScheme: ReturnType<typeof resolveNotificationScheme> | undefined;
  fieldSecurityRules: ProjectGovernanceSnapshot["fieldSecurityRules"];
  itemPrivacyRules: ProjectItemPrivacyRule[];
  guestAccess: ProjectGuestAccess;
  auditLog: ProjectGovernanceSnapshot["auditLog"];
  searchGovernance: ProjectGovernanceSnapshot["searchGovernance"];
  permissions: ProjectGovernancePermissions;
  refresh: () => Promise<void>;
  actions: ProjectGovernanceActions;
}

const DEFAULT_PERMISSION_SCHEME = PROJECT_PERMISSION_SCHEMES[0]!;
const DEFAULT_ROLE: ProjectRoleKey = "guest";

function computePermissions(scheme: ProjectPermissionScheme, role: ProjectRoleKey): ProjectGovernancePermissions {
  const grant = (permission: ProjectPermissionKey) => {
    const required = scheme.grants[permission];
    if (!required) return false;
    return projectRoleAtLeast(role, required);
  };

  return {
    canViewProject: grant("view_project"),
    canCreateItems: grant("create_items"),
    canManageSettings: grant("manage_settings"),
    canManageLifecycle: grant("manage_lifecycle"),
    canManageMembers: grant("manage_members"),
    canManageFieldSecurity: grant("manage_field_security"),
    canManageNotifications: grant("manage_notifications"),
    canManageAutomations: grant("manage_automations"),
    canManageIntegrations: grant("manage_integrations"),
    canManageGuests: grant("manage_guests"),
    canViewAuditLog: grant("view_audit_log"),
    canDeleteProject: grant("delete_project"),
  };
}

export function useProjectGovernance(projectId?: string): ProjectGovernanceState {
  const queryClient = useQueryClient();

  const authQuery = useQuery({
    queryKey: AUTH_USER_KEY,
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user ?? null;
    },
    staleTime: 60 * 1000,
  });

  const governanceQuery = useQuery({
    queryKey: GOVERNANCE_KEY(projectId),
    enabled: Boolean(projectId),
    queryFn: async () => {
      if (!projectId) {
        return null;
      }
      return fetchProjectGovernance(projectId);
    },
  });

  const snapshot = governanceQuery.data ?? null;
  const membership = snapshot?.membership ?? [];
  const userId = authQuery.data?.id;
  const currentMember = useMemo(() => {
    if (!membership.length) return null;
    if (userId) {
      const match = membership.find((member) => member.userId === userId);
      if (match) {
        return match;
      }
    }
    const owner = membership.find((member) => member.roleId === "owner");
    if (owner) {
      return owner;
    }
    const highest = determineHighestRole(membership);
    if (highest) {
      return membership.find((member) => member.roleId === highest) ?? null;
    }
    return membership[0] ?? null;
  }, [membership, userId]);

  const currentRole = currentMember?.roleId ?? DEFAULT_ROLE;
  const permissionScheme = snapshot
    ? resolvePermissionScheme(snapshot.permissionSchemeId) ?? DEFAULT_PERMISSION_SCHEME
    : DEFAULT_PERMISSION_SCHEME;
  const permissions = useMemo(() => computePermissions(permissionScheme, currentRole), [permissionScheme, currentRole]);

  const notificationScheme = snapshot
    ? resolveNotificationScheme(snapshot.notificationSchemeId)
    : resolveNotificationScheme(PROJECT_NOTIFICATION_SCHEMES[0]?.id ?? "iterative_updates");

  const inviteMutation = useMutation({
    mutationFn: async (input: Parameters<ProjectGovernanceActions["inviteMember"]>[0]) => {
      if (!projectId) return;
      await upsertProjectMember({
        projectId,
        ...input,
        actorName: currentMember?.name ?? authQuery.data?.email ?? "System",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: GOVERNANCE_KEY(projectId) });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId: memberId, roleId }: { userId: string; roleId: ProjectRoleKey }) => {
      if (!projectId) return;
      await updateProjectMemberRole({
        projectId,
        userId: memberId,
        roleId,
        actorName: currentMember?.name ?? authQuery.data?.email ?? "System",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: GOVERNANCE_KEY(projectId) });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      if (!projectId) return;
      await removeProjectMember(projectId, memberId, currentMember?.name ?? authQuery.data?.email ?? "System");
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: GOVERNANCE_KEY(projectId) });
    },
  });

  const permissionSchemeMutation = useMutation({
    mutationFn: async (schemeId: string) => {
      if (!projectId) return;
      await setProjectPermissionScheme({
        projectId,
        schemeId,
        actorName: currentMember?.name ?? authQuery.data?.email ?? "System",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: GOVERNANCE_KEY(projectId) });
    },
  });

  const notificationSchemeMutation = useMutation({
    mutationFn: async (schemeId: string) => {
      if (!projectId) return;
      await setProjectNotificationScheme({
        projectId,
        schemeId,
        actorName: currentMember?.name ?? authQuery.data?.email ?? "System",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: GOVERNANCE_KEY(projectId) });
    },
  });

  const fieldRuleMutation = useMutation({
    mutationFn: async (
      rule: Parameters<ProjectGovernanceActions["updateFieldSecurityRule"]>[0]
    ) => {
      if (!projectId) return;
      await upsertFieldSecurityRule({
        projectId,
        ...rule,
        actorName: currentMember?.name ?? authQuery.data?.email ?? "System",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: GOVERNANCE_KEY(projectId) });
    },
  });

  const removeFieldRuleMutation = useMutation({
    mutationFn: async (fieldKey: string) => {
      if (!projectId) return;
      await removeFieldSecurityRule({
        projectId,
        fieldKey,
        actorName: currentMember?.name ?? authQuery.data?.email ?? "System",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: GOVERNANCE_KEY(projectId) });
    },
  });

  const itemPrivacyMutation = useMutation({
    mutationFn: async (
      rule: Parameters<ProjectGovernanceActions["upsertItemPrivacyRule"]>[0]
    ) => {
      if (!projectId) return;
      await upsertItemPrivacyRule({
        projectId,
        ...rule,
        actorName: currentMember?.name ?? authQuery.data?.email ?? "System",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: GOVERNANCE_KEY(projectId) });
    },
  });

  const removeItemPrivacyMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      if (!projectId) return;
      await removeItemPrivacyRule({
        projectId,
        ruleId,
        actorName: currentMember?.name ?? authQuery.data?.email ?? "System",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: GOVERNANCE_KEY(projectId) });
    },
  });

  const guestAccessMutation = useMutation({
    mutationFn: async (
      options: Parameters<ProjectGovernanceActions["setGuestAccess"]>[0]
    ) => {
      if (!projectId) return;
      await setGuestAccess({
        projectId,
        ...options,
        actorName: currentMember?.name ?? authQuery.data?.email ?? "System",
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: GOVERNANCE_KEY(projectId) });
    },
  });

  const actions: ProjectGovernanceActions = {
    inviteMember: async (input) => inviteMutation.mutateAsync(input),
    updateMemberRole: async (user, role) => updateRoleMutation.mutateAsync({ userId: user, roleId: role }),
    removeMember: async (userId) => removeMemberMutation.mutateAsync(userId),
    setPermissionScheme: async (schemeId) => permissionSchemeMutation.mutateAsync(schemeId),
    setNotificationScheme: async (schemeId) => notificationSchemeMutation.mutateAsync(schemeId),
    updateFieldSecurityRule: async (rule) => fieldRuleMutation.mutateAsync(rule),
    removeFieldSecurityRule: async (fieldKey) => removeFieldRuleMutation.mutateAsync(fieldKey),
    upsertItemPrivacyRule: async (rule) => itemPrivacyMutation.mutateAsync(rule),
    removeItemPrivacyRule: async (ruleId) => removeItemPrivacyMutation.mutateAsync(ruleId),
    setGuestAccess: async (options) => guestAccessMutation.mutateAsync(options),
  };

  return {
    projectId,
    isLoading: governanceQuery.isLoading || authQuery.isLoading,
    isFetching: governanceQuery.isFetching,
    membership,
    currentMember,
    currentRole,
    roleDefinition: PROJECT_ROLES.find((role) => role.id === currentRole),
    permissionScheme,
    notificationScheme,
    fieldSecurityRules: snapshot?.fieldSecurityRules ?? [],
    itemPrivacyRules: snapshot?.itemPrivacyRules ?? [],
    guestAccess: snapshot?.guestAccess ?? {
      enabled: false,
      allowedRole: "guest",
      token: "",
      expiresAt: null,
      requireEmailVerification: true,
    },
    auditLog: snapshot?.auditLog ?? [],
    searchGovernance:
      snapshot?.searchGovernance ??
      ({
        queryAuditLog: [],
        exportCaps: { daily: 0, remaining: 0, enforced: false },
        securityPolicies: { requireAuditRole: false, maskedFields: [] },
        alerts: { enabled: false, frequency: "daily" },
      } as ProjectGovernanceSnapshot["searchGovernance"]),
    permissions,
    refresh: async () => {
      await queryClient.invalidateQueries({ queryKey: GOVERNANCE_KEY(projectId) });
    },
    actions,
  };
}
