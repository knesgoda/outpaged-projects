import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceMembers, useWorkspaceSettings } from "@/hooks/useWorkspace";
import { useAuditLogs } from "@/hooks/useAudit";
import { Link } from "react-router-dom";

type SecuritySettings = {
  mfa_required?: boolean;
  session_hours?: number;
  data_retention_days?: number;
};

const RECENT_LIMIT = 5;

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function AdminHome() {
  const { data: settings, isLoading: settingsLoading } = useWorkspaceSettings();
  const { data: members = [], isLoading: membersLoading } = useWorkspaceMembers();
  const { data: auditLogs = [], isLoading: auditLoading } = useAuditLogs({ limit: RECENT_LIMIT });

  const roleSummary = useMemo(() => {
    return members.reduce(
      (acc, member) => {
        acc.total += 1;
        acc[member.role] = (acc[member.role] ?? 0) + 1;
        return acc;
      },
      { total: 0 } as Record<string, number>
    );
  }, [members]);

  const security = useMemo<SecuritySettings>(() => {
    if (!settings?.security || typeof settings.security !== "object") {
      return {};
    }
    return settings.security as SecuritySettings;
  }, [settings]);

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Admin overview</h2>
        <p className="text-muted-foreground">Check workspace status and jump into the most common tasks.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Workspace</CardTitle>
            <CardDescription>Global settings that define the workspace identity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {settingsLoading ? (
              <p className="text-sm text-muted-foreground">Loading workspace details...</p>
            ) : (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{settings?.name ?? "Unnamed workspace"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Timezone</p>
                  <p className="font-medium">{settings?.default_timezone ?? "Not set"}</p>
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/workspace">Manage workspace</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>Roles with access to this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {membersLoading ? (
              <p className="text-sm text-muted-foreground">Loading members...</p>
            ) : (
              <>
                <p className="text-3xl font-semibold">{roleSummary.total}</p>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {(["owner", "admin", "manager", "member", "billing"] as const).map((role) => (
                    <span key={role} className="rounded-full border px-2 py-1">
                      {role}: {roleSummary[role] ?? 0}
                    </span>
                  ))}
                </div>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/members">Manage members</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Current guardrails for sessions and access.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {settingsLoading ? (
              <p className="text-sm text-muted-foreground">Loading security policies...</p>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Badge variant={security.mfa_required ? "default" : "secondary"}>
                    {security.mfa_required ? "MFA required" : "MFA optional"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Sessions expire after {security.session_hours ?? 72} hours
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Audit data retention: {security.data_retention_days ?? 365} days
                </p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/admin/security">Review security</Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest audit events captured for this workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {auditLoading ? (
              <p className="text-sm text-muted-foreground">Loading audit activity...</p>
            ) : auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No audit events recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {auditLogs.map((log) => (
                  <li key={log.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between gap-4">
                      <Badge variant="secondary">{log.action}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(log.created_at)}</span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Target: {log.target_type ?? "n/a"} {log.target_id ? `(${log.target_id})` : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick links</CardTitle>
            <CardDescription>Jump straight to the most common admin areas.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/workspace">Workspace settings</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/webhooks">Webhook endpoints</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/api">API tokens</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/audit">Audit logs</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
