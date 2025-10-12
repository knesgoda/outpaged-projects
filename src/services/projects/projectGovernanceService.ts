// @ts-nocheck
import {
  PROJECT_DEFAULT_FIELD_RULES,
  PROJECT_NOTIFICATION_SCHEMES,
  PROJECT_PERMISSION_SCHEMES,
  PROJECT_ROLE_ORDER,
  projectRoleAtLeast,
  type ProjectFieldSecurityRule,
  type ProjectNotificationScheme,
  type ProjectPermissionScheme,
  type ProjectRoleKey,
} from "@/domain/projects/governance";
import { getSearchAuditLog, getSearchDiagnostics, listSavedSearches, listSearchAlerts } from "@/services/search";

function deepClone<T>(value: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function generateId(prefix: string) {
  if (typeof crypto?.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export type ProjectMembershipStatus = "active" | "invited" | "suspended";

export interface ProjectMembership {
  id: string;
  userId: string;
  email: string;
  name: string;
  roleId: ProjectRoleKey;
  status: ProjectMembershipStatus;
  joinedAt: string;
  lastSeenAt?: string | null;
  invitedBy?: string | null;
}

export interface ProjectGuestAccess {
  enabled: boolean;
  allowedRole: ProjectRoleKey;
  expiresAt?: string | null;
  requireEmailVerification?: boolean;
  token: string;
}

export interface ProjectItemPrivacyRule {
  id: string;
  itemKey: string;
  label: string;
  visibility: ProjectRoleKey;
  reason?: string;
  createdAt: string;
  createdBy: string;
}

export type ProjectAuditSeverity = "info" | "warning" | "critical";

export interface ProjectAuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  summary: string;
  severity: ProjectAuditSeverity;
  metadata?: Record<string, unknown>;
}

export interface ProjectGovernanceSnapshot {
  projectId: string;
  permissionSchemeId: string;
  notificationSchemeId: string;
  fieldSecurityRules: ProjectFieldSecurityRule[];
  membership: ProjectMembership[];
  itemPrivacyRules: ProjectItemPrivacyRule[];
  guestAccess: ProjectGuestAccess;
  auditLog: ProjectAuditLogEntry[];
  searchGovernance: ProjectSearchGovernance;
  updatedAt: string;
}

export interface ProjectSearchGovernance {
  queryAuditLog: ReturnType<typeof getSearchAuditLog>;
  exportCaps: {
    daily: number;
    remaining: number;
    enforced: boolean;
  };
  securityPolicies: {
    requireAuditRole: boolean;
    maskedFields: string[];
  };
  alerts: {
    enabled: boolean;
    frequency: "immediate" | "daily" | "weekly";
    lastTriggeredAt?: string;
  };
}

export interface UpsertProjectMemberInput {
  projectId: string;
  userId: string;
  email: string;
  name: string;
  roleId: ProjectRoleKey;
  status?: ProjectMembershipStatus;
  actorName?: string;
}

export interface UpdateProjectMemberRoleInput {
  projectId: string;
  userId: string;
  roleId: ProjectRoleKey;
  actorName?: string;
}

export interface SetProjectPermissionSchemeInput {
  projectId: string;
  schemeId: string;
  actorName?: string;
}

export interface SetProjectNotificationSchemeInput {
  projectId: string;
  schemeId: string;
  actorName?: string;
}

export interface UpsertFieldSecurityRuleInput extends ProjectFieldSecurityRule {
  projectId: string;
  actorName?: string;
}

export interface RemoveFieldSecurityRuleInput {
  projectId: string;
  fieldKey: string;
  actorName?: string;
}

export interface UpsertItemPrivacyRuleInput {
  projectId: string;
  itemKey: string;
  label: string;
  visibility: ProjectRoleKey;
  reason?: string;
  actorName?: string;
}

export interface RemoveItemPrivacyRuleInput {
  projectId: string;
  ruleId: string;
  actorName?: string;
}

export interface SetGuestAccessInput {
  projectId: string;
  enabled: boolean;
  allowedRole: ProjectRoleKey;
  expiresAt?: string | null;
  requireEmailVerification?: boolean;
  actorName?: string;
}

const store = new Map<string, ProjectGovernanceSnapshot>();

function createDefaultMembership(): ProjectMembership[] {
  const now = new Date();
  return [
    {
      id: generateId("membership"),
      userId: "owner-1",
      email: "alex.rivera@example.com",
      name: "Alex Rivera",
      roleId: "owner",
      status: "active",
      joinedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 120).toISOString(),
      lastSeenAt: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
    },
    {
      id: generateId("membership"),
      userId: "pm-1",
      email: "mira.cho@example.com",
      name: "Mira Cho",
      roleId: "program_manager",
      status: "active",
      joinedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 60).toISOString(),
      lastSeenAt: new Date(now.getTime() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: generateId("membership"),
      userId: "lead-1",
      email: "devon.price@example.com",
      name: "Devon Price",
      roleId: "lead",
      status: "active",
      joinedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 21).toISOString(),
      lastSeenAt: new Date(now.getTime() - 1000 * 60 * 45).toISOString(),
    },
    {
      id: generateId("membership"),
      userId: "guest-1",
      email: "vendor.partner@example.com",
      name: "Vendor Partner",
      roleId: "guest",
      status: "invited",
      joinedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2).toISOString(),
      invitedBy: "Alex Rivera",
    },
  ];
}

function createDefaultItemPrivacyRules(): ProjectItemPrivacyRule[] {
  const now = new Date().toISOString();
  return [
    {
      id: generateId("privacy"),
      itemKey: "release-plan",
      label: "Release plan",
      visibility: "lead",
      reason: "Contains launch partners",
      createdAt: now,
      createdBy: "Alex Rivera",
    },
    {
      id: generateId("privacy"),
      itemKey: "security-review",
      label: "Security review",
      visibility: "program_manager",
      reason: "Pending vulnerability fixes",
      createdAt: now,
      createdBy: "Mira Cho",
    },
  ];
}

function createDefaultAuditLog(projectId: string): ProjectAuditLogEntry[] {
  const now = Date.now();
  return [
    {
      id: generateId("audit"),
      timestamp: new Date(now - 1000 * 60 * 60 * 24 * 3).toISOString(),
      actor: "Alex Rivera",
      actorId: "owner-1",
      action: "membership.added",
      targetType: "membership",
      targetId: "devon.price@example.com",
      summary: "Invited Devon Price as Delivery Lead",
      severity: "info",
    },
    {
      id: generateId("audit"),
      timestamp: new Date(now - 1000 * 60 * 60 * 12).toISOString(),
      actor: "Mira Cho",
      actorId: "pm-1",
      action: "security.field_rule.updated",
      targetType: "field_security",
      targetId: "financial_impact",
      summary: "Restricted Financial impact to program managers",
      severity: "warning",
    },
    {
      id: generateId("audit"),
      timestamp: new Date(now - 1000 * 60 * 30).toISOString(),
      actor: "System",
      action: "guest_access.revoked",
      targetType: "guest_access",
      summary: "Guest link expired",
      severity: "info",
    },
  ];
}

function createDefaultSnapshot(projectId: string): ProjectGovernanceSnapshot {
  const savedSearches = listSavedSearches();
  const searchDiagnostics = getSearchDiagnostics();
  const searchAuditLog = getSearchAuditLog();
  const searchAlerts = listSearchAlerts();
  const maskedFields = Array.from(new Set(savedSearches.flatMap((record) => record.maskedFields)));
  const exportDailyCap = 500;
  const exportUsage = savedSearches.reduce((count, record) => count + record.audit.exports.length, 0) * 10;
  return {
    projectId,
    permissionSchemeId: PROJECT_PERMISSION_SCHEMES[0]?.id ?? "standard_delivery",
    notificationSchemeId: PROJECT_NOTIFICATION_SCHEMES[0]?.id ?? "iterative_updates",
    fieldSecurityRules: deepClone(PROJECT_DEFAULT_FIELD_RULES),
    membership: createDefaultMembership(),
    itemPrivacyRules: createDefaultItemPrivacyRules(),
    guestAccess: {
      enabled: false,
      allowedRole: "guest",
      expiresAt: null,
      requireEmailVerification: true,
      token: generateId("guest"),
    },
    auditLog: createDefaultAuditLog(projectId),
    searchGovernance: {
      queryAuditLog: searchAuditLog.slice(-15),
      exportCaps: {
        daily: exportDailyCap,
        remaining: Math.max(0, exportDailyCap - exportUsage),
        enforced: true,
      },
      securityPolicies: {
        requireAuditRole: true,
        maskedFields,
      },
      alerts: {
        enabled: searchAlerts.some((alert) => !alert.muted),
        frequency: searchAlerts[0]?.frequency ?? "daily",
        lastTriggeredAt: searchAlerts[0]?.lastTriggeredAt ?? searchDiagnostics.abuseSignals.lastThrottleAt,
      },
    },
    updatedAt: new Date().toISOString(),
  };
}

function ensureProject(projectId: string) {
  let snapshot = store.get(projectId);
  if (!snapshot) {
    snapshot = createDefaultSnapshot(projectId);
    store.set(projectId, snapshot);
  }
  return snapshot;
}

function recordAudit(
  snapshot: ProjectGovernanceSnapshot,
  entry: Omit<ProjectAuditLogEntry, "id" | "timestamp">
) {
  const fullEntry: ProjectAuditLogEntry = {
    id: generateId("audit"),
    timestamp: new Date().toISOString(),
    severity: "info",
    ...entry,
  };
  snapshot.auditLog = [fullEntry, ...snapshot.auditLog].slice(0, 50);
  snapshot.updatedAt = fullEntry.timestamp;
}

export async function fetchProjectGovernance(projectId: string): Promise<ProjectGovernanceSnapshot> {
  const snapshot = ensureProject(projectId);
  return deepClone(snapshot);
}

export async function upsertProjectMember(options: UpsertProjectMemberInput) {
  const snapshot = ensureProject(options.projectId);
  const existing = snapshot.membership.find((member) => member.userId === options.userId);
  const status = options.status ?? "active";

  if (existing) {
    existing.email = options.email;
    existing.name = options.name;
    existing.roleId = options.roleId;
    existing.status = status;
    recordAudit(snapshot, {
      actor: options.actorName ?? "System",
      action: "membership.updated",
      targetType: "membership",
      targetId: existing.userId,
      summary: `Updated ${existing.name}'s role to ${options.roleId}`,
    });
  } else {
    snapshot.membership.push({
      id: generateId("membership"),
      userId: options.userId,
      email: options.email,
      name: options.name,
      roleId: options.roleId,
      status,
      joinedAt: new Date().toISOString(),
      invitedBy: options.actorName ?? "System",
    });
    recordAudit(snapshot, {
      actor: options.actorName ?? "System",
      action: "membership.added",
      targetType: "membership",
      targetId: options.userId,
      summary: `Invited ${options.name} as ${options.roleId}`,
    });
  }

  return deepClone(snapshot);
}

export async function updateProjectMemberRole(options: UpdateProjectMemberRoleInput) {
  const snapshot = ensureProject(options.projectId);
  const member = snapshot.membership.find((entry) => entry.userId === options.userId);
  if (!member) {
    throw new Error(`Member ${options.userId} not found`);
  }
  member.roleId = options.roleId;
  recordAudit(snapshot, {
    actor: options.actorName ?? "System",
    action: "membership.role_changed",
    targetType: "membership",
    targetId: member.userId,
    summary: `Changed ${member.name}'s role to ${options.roleId}`,
  });
  return deepClone(snapshot);
}

export async function removeProjectMember(projectId: string, userId: string, actorName?: string) {
  const snapshot = ensureProject(projectId);
  const before = snapshot.membership.length;
  snapshot.membership = snapshot.membership.filter((member) => member.userId !== userId);
  if (snapshot.membership.length !== before) {
    recordAudit(snapshot, {
      actor: actorName ?? "System",
      action: "membership.removed",
      targetType: "membership",
      targetId: userId,
      summary: `Removed member ${userId}`,
      severity: "warning",
    });
  }
  return deepClone(snapshot);
}

export async function setProjectPermissionScheme(options: SetProjectPermissionSchemeInput) {
  const snapshot = ensureProject(options.projectId);
  snapshot.permissionSchemeId = options.schemeId;
  const scheme = PROJECT_PERMISSION_SCHEMES.find((entry) => entry.id === options.schemeId);
  recordAudit(snapshot, {
    actor: options.actorName ?? "System",
    action: "governance.permission_scheme.changed",
    targetType: "permission_scheme",
    targetId: options.schemeId,
    summary: `Switched to ${scheme?.name ?? options.schemeId} scheme`,
  });
  return deepClone(snapshot);
}

export async function setProjectNotificationScheme(options: SetProjectNotificationSchemeInput) {
  const snapshot = ensureProject(options.projectId);
  snapshot.notificationSchemeId = options.schemeId;
  const scheme = PROJECT_NOTIFICATION_SCHEMES.find((entry) => entry.id === options.schemeId);
  recordAudit(snapshot, {
    actor: options.actorName ?? "System",
    action: "governance.notification_scheme.changed",
    targetType: "notification_scheme",
    targetId: options.schemeId,
    summary: `Updated notification policy to ${scheme?.name ?? options.schemeId}`,
  });
  return deepClone(snapshot);
}

export async function upsertFieldSecurityRule(options: UpsertFieldSecurityRuleInput) {
  const snapshot = ensureProject(options.projectId);
  const existing = snapshot.fieldSecurityRules.find((rule) => rule.fieldKey === options.fieldKey);
  if (existing) {
    existing.classification = options.classification;
    existing.label = options.label;
    existing.minRoleToView = options.minRoleToView;
    existing.minRoleToEdit = options.minRoleToEdit;
    existing.maskBelowRole = options.maskBelowRole;
  } else {
    snapshot.fieldSecurityRules.push({
      fieldKey: options.fieldKey,
      label: options.label,
      classification: options.classification,
      minRoleToView: options.minRoleToView,
      minRoleToEdit: options.minRoleToEdit,
      maskBelowRole: options.maskBelowRole,
    });
  }
  recordAudit(snapshot, {
    actor: options.actorName ?? "System",
    action: "security.field_rule.updated",
    targetType: "field_security",
    targetId: options.fieldKey,
    summary: `Updated field rule for ${options.label}`,
    severity: "warning",
  });
  return deepClone(snapshot);
}

export async function removeFieldSecurityRule(options: RemoveFieldSecurityRuleInput) {
  const snapshot = ensureProject(options.projectId);
  const before = snapshot.fieldSecurityRules.length;
  snapshot.fieldSecurityRules = snapshot.fieldSecurityRules.filter((rule) => rule.fieldKey !== options.fieldKey);
  if (snapshot.fieldSecurityRules.length !== before) {
    recordAudit(snapshot, {
      actor: options.actorName ?? "System",
      action: "security.field_rule.removed",
      targetType: "field_security",
      targetId: options.fieldKey,
      summary: `Removed field rule ${options.fieldKey}`,
      severity: "warning",
    });
  }
  return deepClone(snapshot);
}

export async function upsertItemPrivacyRule(options: UpsertItemPrivacyRuleInput) {
  const snapshot = ensureProject(options.projectId);
  const existing = snapshot.itemPrivacyRules.find((rule) => rule.itemKey === options.itemKey);
  if (existing) {
    existing.label = options.label;
    existing.reason = options.reason;
    existing.visibility = options.visibility;
  } else {
    snapshot.itemPrivacyRules.push({
      id: generateId("privacy"),
      itemKey: options.itemKey,
      label: options.label,
      visibility: options.visibility,
      reason: options.reason,
      createdAt: new Date().toISOString(),
      createdBy: options.actorName ?? "System",
    });
  }
  recordAudit(snapshot, {
    actor: options.actorName ?? "System",
    action: "security.item_privacy.updated",
    targetType: "item_privacy",
    targetId: options.itemKey,
    summary: `Set ${options.label} visibility to ${options.visibility}`,
  });
  return deepClone(snapshot);
}

export async function removeItemPrivacyRule(options: RemoveItemPrivacyRuleInput) {
  const snapshot = ensureProject(options.projectId);
  const before = snapshot.itemPrivacyRules.length;
  snapshot.itemPrivacyRules = snapshot.itemPrivacyRules.filter((rule) => rule.id !== options.ruleId);
  if (snapshot.itemPrivacyRules.length !== before) {
    recordAudit(snapshot, {
      actor: options.actorName ?? "System",
      action: "security.item_privacy.removed",
      targetType: "item_privacy",
      targetId: options.ruleId,
      summary: `Removed privacy rule ${options.ruleId}`,
      severity: "warning",
    });
  }
  return deepClone(snapshot);
}

export async function setGuestAccess(options: SetGuestAccessInput) {
  const snapshot = ensureProject(options.projectId);
  snapshot.guestAccess.enabled = options.enabled;
  snapshot.guestAccess.allowedRole = options.allowedRole;
  snapshot.guestAccess.expiresAt = options.expiresAt ?? null;
  snapshot.guestAccess.requireEmailVerification = options.requireEmailVerification ?? true;
  if (!snapshot.guestAccess.token) {
    snapshot.guestAccess.token = generateId("guest");
  }
  recordAudit(snapshot, {
    actor: options.actorName ?? "System",
    action: options.enabled ? "guest_access.enabled" : "guest_access.disabled",
    targetType: "guest_access",
    targetId: snapshot.guestAccess.token,
    summary: options.enabled
      ? `Guest access enabled for ${options.allowedRole} roles`
      : "Guest access disabled",
    severity: options.enabled ? "info" : "warning",
  });
  return deepClone(snapshot);
}

export function resolvePermissionScheme(id: string): ProjectPermissionScheme | undefined {
  return PROJECT_PERMISSION_SCHEMES.find((scheme) => scheme.id === id);
}

export function resolveNotificationScheme(id: string): ProjectNotificationScheme | undefined {
  return PROJECT_NOTIFICATION_SCHEMES.find((scheme) => scheme.id === id);
}

export function determineHighestRole(members: ProjectMembership[]): ProjectRoleKey | null {
  const sorted = [...members].sort(
    (a, b) => PROJECT_ROLE_ORDER.indexOf(a.roleId) - PROJECT_ROLE_ORDER.indexOf(b.roleId)
  );
  return sorted[0]?.roleId ?? null;
}

export function hasPermission(
  scheme: ProjectPermissionScheme,
  role: ProjectRoleKey,
  permission: keyof ProjectPermissionScheme["grants"]
) {
  const required = scheme.grants[permission];
  if (!required) {
    return false;
  }
  return projectRoleAtLeast(role, required);
}
