import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Shield, Users, Bell, Globe, Lock, Trash2, Plus, Send } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  PROJECT_NOTIFICATION_SCHEMES,
  PROJECT_PERMISSION_SCHEMES,
  PROJECT_ROLES,
  type FieldClassification,
  type ProjectRoleKey,
} from "@/domain/projects/governance";
import { useProjectGovernanceContext } from "@/state/projectGovernance";

const CLASSIFICATION_LABELS: Record<FieldClassification, string> = {
  open: "Open",
  restricted: "Restricted",
  confidential: "Confidential",
};

const ROLE_OPTIONS = PROJECT_ROLES.map(role => ({ id: role.id, name: role.name }));

function normaliseIdentifier(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function ProjectGovernancePanel() {
  const {
    projectId,
    membership,
    permissionScheme,
    notificationScheme,
    fieldSecurityRules,
    itemPrivacyRules,
    guestAccess,
    auditLog,
    searchGovernance,
    permissions,
    currentMember,
    refresh,
    actions,
    isLoading,
    isFetching,
  } = useProjectGovernanceContext();

  const [inviteDraft, setInviteDraft] = useState({
    email: "",
    name: "",
    roleId: "contributor" as ProjectRoleKey,
  });
  const [privacyDraft, setPrivacyDraft] = useState({
    label: "",
    itemKey: "",
    reason: "",
    visibility: "lead" as ProjectRoleKey,
  });

  const ownerCount = useMemo(
    () => membership.filter(member => member.roleId === "owner").length,
    [membership],
  );

  const shareLink = useMemo(() => {
    if (!guestAccess.token) return "";
    if (typeof window === "undefined") {
      return `/projects/${projectId ?? ""}/guest/${guestAccess.token}`;
    }
    const origin = window.location.origin;
    return `${origin}/projects/${projectId ?? ""}/guest/${guestAccess.token}`;
  }, [guestAccess.token, projectId]);

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!permissions.canManageMembers || !inviteDraft.email.trim()) {
      return;
    }
    const email = inviteDraft.email.trim().toLowerCase();
    const name = inviteDraft.name.trim() || email;
    const userId = normaliseIdentifier(email);
    await actions.inviteMember({
      userId,
      email,
      name,
      roleId: inviteDraft.roleId,
    });
    setInviteDraft({ email: "", name: "", roleId: inviteDraft.roleId });
    await refresh();
  };

  const handleAddPrivacyRule = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!permissions.canManageFieldSecurity || !privacyDraft.label.trim()) {
      return;
    }
    const label = privacyDraft.label.trim();
    const itemKey = privacyDraft.itemKey.trim() || normaliseIdentifier(label);
    await actions.upsertItemPrivacyRule({
      itemKey,
      label,
      visibility: privacyDraft.visibility,
      reason: privacyDraft.reason.trim() || undefined,
    });
    setPrivacyDraft({ label: "", itemKey: "", reason: "", visibility: privacyDraft.visibility });
    await refresh();
  };

  const handleToggleGuestAccess = async (next: boolean) => {
    if (!permissions.canManageGuests) return;
    await actions.setGuestAccess({
      enabled: next,
      allowedRole: guestAccess.allowedRole,
      expiresAt: guestAccess.expiresAt,
      requireEmailVerification: guestAccess.requireEmailVerification,
    });
    await refresh();
  };

  const handleGuestRoleChange = async (roleId: ProjectRoleKey) => {
    if (!permissions.canManageGuests) return;
    await actions.setGuestAccess({
      enabled: guestAccess.enabled,
      allowedRole: roleId,
      expiresAt: guestAccess.expiresAt,
      requireEmailVerification: guestAccess.requireEmailVerification,
    });
    await refresh();
  };

  const handleGuestExpiryChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!permissions.canManageGuests) return;
    const value = event.target.value;
    await actions.setGuestAccess({
      enabled: guestAccess.enabled,
      allowedRole: guestAccess.allowedRole,
      expiresAt: value ? new Date(value).toISOString() : null,
      requireEmailVerification: guestAccess.requireEmailVerification,
    });
    await refresh();
  };

  const isReadOnly = isLoading || isFetching;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5" /> Project membership
          </CardTitle>
          <CardDescription>
            Invite collaborators and manage project roles aligned to the selected permission scheme.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleInvite} className="grid gap-4 md:grid-cols-12">
            <div className="md:col-span-4 space-y-2">
              <Label htmlFor="project-invite-email">Email</Label>
              <Input
                id="project-invite-email"
                type="email"
                value={inviteDraft.email}
                onChange={event => setInviteDraft(prev => ({ ...prev, email: event.target.value }))}
                placeholder="member@example.com"
                disabled={!permissions.canManageMembers || isReadOnly}
                required
              />
            </div>
            <div className="md:col-span-4 space-y-2">
              <Label htmlFor="project-invite-name">Display name</Label>
              <Input
                id="project-invite-name"
                value={inviteDraft.name}
                onChange={event => setInviteDraft(prev => ({ ...prev, name: event.target.value }))}
                placeholder="Full name"
                disabled={!permissions.canManageMembers || isReadOnly}
              />
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label htmlFor="project-invite-role">Role</Label>
              <Select
                value={inviteDraft.roleId}
                onValueChange={value => setInviteDraft(prev => ({ ...prev, roleId: value as ProjectRoleKey }))}
                disabled={!permissions.canManageMembers || isReadOnly}
              >
                <SelectTrigger id="project-invite-role">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1 flex items-end">
              <Button type="submit" className="w-full" disabled={!permissions.canManageMembers || isReadOnly}>
                <Plus className="mr-2 h-4 w-4" /> Invite
              </Button>
            </div>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last seen</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membership.map(member => {
                const canEdit = permissions.canManageMembers && !isReadOnly;
                const isCurrent = member.userId === currentMember?.userId;
                const disableRemove =
                  !permissions.canManageMembers ||
                  isReadOnly ||
                  isCurrent ||
                  (member.roleId === "owner" && ownerCount <= 1);
                return (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{member.name}</span>
                        <span className="text-xs text-muted-foreground">{member.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={member.roleId}
                        onValueChange={value => {
                          void actions.updateMemberRole(member.userId, value as ProjectRoleKey);
                        }}
                        disabled={!canEdit}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map(role => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.status === "active" ? "success" : "secondary"}>{member.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {member.lastSeenAt
                        ? formatDistanceToNow(new Date(member.lastSeenAt), { addSuffix: true })
                        : member.status === "invited"
                          ? "Invited"
                          : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Remove member"
                        onClick={() => {
                          void actions.removeMember(member.userId);
                        }}
                        disabled={disableRemove}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" /> Permission scheme
            </CardTitle>
            <CardDescription>
              Align role capabilities to the governance model for this project.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select
              value={permissionScheme.id}
              onValueChange={value => {
                void actions.setPermissionScheme(value);
              }}
              disabled={!permissions.canManageSettings || isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_PERMISSION_SCHEMES.map(scheme => (
                  <SelectItem key={scheme.id} value={scheme.id}>
                    {scheme.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">{permissionScheme.description}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bell className="h-5 w-5" /> Notification scheme
            </CardTitle>
            <CardDescription>Control digests, alerts, and escalation destinations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={notificationScheme?.id ?? PROJECT_NOTIFICATION_SCHEMES[0]?.id}
              onValueChange={value => {
                void actions.setNotificationScheme(value);
              }}
              disabled={!permissions.canManageNotifications || isReadOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROJECT_NOTIFICATION_SCHEMES.map(scheme => (
                  <SelectItem key={scheme.id} value={scheme.id}>
                    {scheme.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>{notificationScheme?.description}</p>
              {notificationScheme?.channels ? (
                <p>
                  Channels: <span className="font-medium text-foreground">{notificationScheme.channels.join(", ")}</span>
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" /> Field-level security
          </CardTitle>
          <CardDescription>Gate sensitive fields by role and classification.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Field</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>View role</TableHead>
                <TableHead>Edit role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fieldSecurityRules.map(rule => (
                <TableRow key={rule.fieldKey}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{rule.label}</span>
                      <span className="text-xs text-muted-foreground">{rule.fieldKey}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={rule.classification}
                      onValueChange={value => {
                        void actions.updateFieldSecurityRule({
                          ...rule,
                          classification: value as FieldClassification,
                        });
                      }}
                      disabled={!permissions.canManageFieldSecurity || isReadOnly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(CLASSIFICATION_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={rule.minRoleToView}
                      onValueChange={value => {
                        void actions.updateFieldSecurityRule({
                          ...rule,
                          minRoleToView: value as ProjectRoleKey,
                        });
                      }}
                      disabled={!permissions.canManageFieldSecurity || isReadOnly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map(role => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={rule.minRoleToEdit}
                      onValueChange={value => {
                        void actions.updateFieldSecurityRule({
                          ...rule,
                          minRoleToEdit: value as ProjectRoleKey,
                        });
                      }}
                      disabled={!permissions.canManageFieldSecurity || isReadOnly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map(role => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove field rule"
                      onClick={() => {
                        void actions.removeFieldSecurityRule(rule.fieldKey);
                      }}
                      disabled={!permissions.canManageFieldSecurity || isReadOnly}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" /> Item privacy rules
          </CardTitle>
          <CardDescription>Restrict visibility of individual plans, documents, or workstreams.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleAddPrivacyRule} className="grid gap-4 md:grid-cols-12">
            <div className="md:col-span-4 space-y-2">
              <Label htmlFor="privacy-label">Label</Label>
              <Input
                id="privacy-label"
                value={privacyDraft.label}
                onChange={event => setPrivacyDraft(prev => ({ ...prev, label: event.target.value }))}
                placeholder="Executive roadmap"
                disabled={!permissions.canManageFieldSecurity || isReadOnly}
                required
              />
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label htmlFor="privacy-key">Reference key</Label>
              <Input
                id="privacy-key"
                value={privacyDraft.itemKey}
                onChange={event => setPrivacyDraft(prev => ({ ...prev, itemKey: event.target.value }))}
                placeholder="executive-roadmap"
                disabled={!permissions.canManageFieldSecurity || isReadOnly}
              />
            </div>
            <div className="md:col-span-3 space-y-2">
              <Label htmlFor="privacy-role">Minimum role</Label>
              <Select
                value={privacyDraft.visibility}
                onValueChange={value => setPrivacyDraft(prev => ({ ...prev, visibility: value as ProjectRoleKey }))}
                disabled={!permissions.canManageFieldSecurity || isReadOnly}
              >
                <SelectTrigger id="privacy-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="privacy-reason">Reason</Label>
              <Input
                id="privacy-reason"
                value={privacyDraft.reason}
                onChange={event => setPrivacyDraft(prev => ({ ...prev, reason: event.target.value }))}
                placeholder="Includes NDA partners"
                disabled={!permissions.canManageFieldSecurity || isReadOnly}
              />
            </div>
            <div className="md:col-span-12 flex justify-end">
              <Button type="submit" disabled={!permissions.canManageFieldSecurity || isReadOnly}>
                <Send className="mr-2 h-4 w-4" /> Save rule
              </Button>
            </div>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itemPrivacyRules.map(rule => (
                <TableRow key={rule.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{rule.label}</span>
                      <span className="text-xs text-muted-foreground">{rule.itemKey}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={rule.visibility}
                      onValueChange={value => {
                        void actions.upsertItemPrivacyRule({
                          itemKey: rule.itemKey,
                          label: rule.label,
                          reason: rule.reason,
                          visibility: value as ProjectRoleKey,
                        });
                      }}
                      disabled={!permissions.canManageFieldSecurity || isReadOnly}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map(role => (
                          <SelectItem key={role.id} value={role.id}>
                            {role.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {rule.reason ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Remove item privacy rule"
                      onClick={() => {
                        void actions.removeItemPrivacyRule(rule.id);
                      }}
                      disabled={!permissions.canManageFieldSecurity || isReadOnly}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Globe className="h-5 w-5" /> Guest access
          </CardTitle>
          <CardDescription>Control external access links and expiry.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <h4 className="font-medium">Allow guest access</h4>
              <p className="text-sm text-muted-foreground">
                Guests inherit a limited role and can only view what privacy rules allow.
              </p>
            </div>
            <Switch
              checked={guestAccess.enabled}
              onCheckedChange={handleToggleGuestAccess}
              disabled={!permissions.canManageGuests || isReadOnly}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Guest role</Label>
              <Select
                value={guestAccess.allowedRole}
                onValueChange={value => handleGuestRoleChange(value as ProjectRoleKey)}
                disabled={!permissions.canManageGuests || isReadOnly}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="guest-expiry">Expires</Label>
              <Input
                id="guest-expiry"
                type="date"
                value={guestAccess.expiresAt ? guestAccess.expiresAt.substring(0, 10) : ""}
                onChange={handleGuestExpiryChange}
                disabled={!permissions.canManageGuests || isReadOnly}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Share link</Label>
            <Input value={shareLink} readOnly className="font-mono text-xs" />
            <p className="text-xs text-muted-foreground">
              {guestAccess.requireEmailVerification
                ? "Guests must verify their email before access is granted."
                : "Guests can access without verification."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" /> Search governance
          </CardTitle>
          <CardDescription>Audit search access, export caps, and masked field policies.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-xs uppercase text-muted-foreground">Daily export cap</p>
              <p className="mt-1 text-2xl font-semibold">{searchGovernance.exportCaps.daily.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">
                {searchGovernance.exportCaps.remaining.toLocaleString()} remaining · {searchGovernance.exportCaps.enforced ? "enforced" : "advisory"}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-xs uppercase text-muted-foreground">Security policies</p>
              <p className="mt-1 text-sm">
                AUDIT role required: {searchGovernance.securityPolicies.requireAuditRole ? "Yes" : "No"}
              </p>
              <p className="text-xs text-muted-foreground">Masked fields: {searchGovernance.securityPolicies.maskedFields.length ? searchGovernance.securityPolicies.maskedFields.join(", ") : "None"}</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-xs uppercase text-muted-foreground">Alerts</p>
              <p className="mt-1 text-sm">
                {searchGovernance.alerts.enabled ? `Enabled (${searchGovernance.alerts.frequency})` : "Disabled"}
              </p>
              <p className="text-xs text-muted-foreground">
                Last triggered: {searchGovernance.alerts.lastTriggeredAt ? formatDistanceToNow(new Date(searchGovernance.alerts.lastTriggeredAt), { addSuffix: true }) : "Never"}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-xs uppercase text-muted-foreground">Recent search audit events</Label>
            {searchGovernance.queryAuditLog.length === 0 ? (
              <p className="text-sm text-muted-foreground">No AUDIT scoped queries recorded.</p>
            ) : (
              searchGovernance.queryAuditLog.slice(-6).reverse().map((entry) => (
                <div key={entry.id} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{entry.principalId}</span>
                    <Badge variant="secondary">hash {entry.hashedQuery}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {entry.types.length ? entry.types.join(", ") : "all types"} · {formatDistanceToNow(new Date(entry.at), { addSuffix: true })}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5" /> Audit log
          </CardTitle>
          <CardDescription>Review recent governance actions for this project.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {permissions.canViewAuditLog ? (
            <div className="space-y-2">
              {auditLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">No governance changes recorded yet.</p>
              ) : (
                auditLog.slice(0, 12).map(entry => (
                  <div key={entry.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge variant={entry.severity === "critical" ? "destructive" : entry.severity === "warning" ? "warning" : "secondary"}>
                          {entry.action}
                        </Badge>
                        <span className="text-sm font-medium">{entry.summary}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Actor: {entry.actor}</p>
                  </div>
                ))
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              You do not have permission to view the audit log for this project.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
