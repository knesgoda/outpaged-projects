import { useState } from "react";
import { Shield, RefreshCcw, AlertTriangle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useProjectGovernance } from "@/hooks/useProjectGovernance";
import { PROJECT_ROLES } from "@/domain/projects/governance";

const DEFAULT_PROJECT_ID = "demo-project";

export function ProjectGovernanceAdmin() {
  const [projectId, setProjectId] = useState(DEFAULT_PROJECT_ID);
  const governance = useProjectGovernance(projectId);
  const { membership, permissionScheme, guestAccess, auditLog, permissions } = governance;

  const owner = membership.find(member => member.roleId === "owner");
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" /> Project governance overview
        </CardTitle>
        <CardDescription>
          Inspect membership, role assignments, and recent security activity for a project.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="admin-project-id">
              Project identifier
            </label>
            <Input
              id="admin-project-id"
              value={projectId}
              onChange={event => setProjectId(event.target.value)}
              placeholder="project-id"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => governance.refresh()} disabled={governance.isFetching}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
            </Button>
            <Badge variant="outline" className="h-9 items-center justify-center">
              Scheme: {permissionScheme.name}
            </Badge>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase text-muted-foreground">Primary owner</p>
            <p className="text-lg font-semibold">{owner?.name ?? "Not assigned"}</p>
            <p className="text-xs text-muted-foreground">{owner?.email ?? "Invite required"}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase text-muted-foreground">Members</p>
            <p className="text-lg font-semibold">{membership.length}</p>
            <p className="text-xs text-muted-foreground">{membership.filter(member => member.status === "invited").length} pending invites</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs uppercase text-muted-foreground">Guest access</p>
            <p className="text-lg font-semibold">{guestAccess.enabled ? "Enabled" : "Disabled"}</p>
            <p className="text-xs text-muted-foreground">Role: {guestAccess.allowedRole}</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {membership.map(member => (
              <TableRow key={member.id}>
                <TableCell>{member.name}</TableCell>
                <TableCell>{member.email}</TableCell>
                <TableCell>{PROJECT_ROLES.find(role => role.id === member.roleId)?.name ?? member.roleId}</TableCell>
                <TableCell>
                  <Badge variant={member.status === "active" ? "success" : "secondary"}>{member.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold uppercase text-muted-foreground">Recent governance activity</h4>
          {auditLog.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded.</p>
          ) : (
            auditLog.slice(0, 6).map(entry => (
              <div key={entry.id} className="flex items-center justify-between rounded border p-3 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant={entry.severity === "warning" ? "warning" : entry.severity === "critical" ? "destructive" : "secondary"}>
                    {entry.action}
                  </Badge>
                  <span>{entry.summary}</span>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>

        {!permissions.canManageMembers ? (
          <div className="rounded border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
            <AlertTriangle className="mr-2 inline h-4 w-4" />
            The signed-in user does not have management permissions for this project. Actions are read-only.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
