import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type {
  CalendarFollower,
  CalendarInvitation,
  CalendarShareRole,
  CalendarShareSetting,
  CalendarDelegation,
} from "@/types/calendar";

interface SharingPermissionsPanelProps {
  shareSettings: CalendarShareSetting[];
  invitations: CalendarInvitation[];
  followers: CalendarFollower[];
  delegations: CalendarDelegation[];
  onUpdateRole: (shareId: string, role: CalendarShareRole) => void;
  onRemoveShare: (shareId: string) => void;
  onAddShare: (share: CalendarShareSetting) => void;
  onUpdateInvitation: (invitationId: string, status: CalendarInvitation["status"]) => void;
  onRemoveFollower: (followerId: string) => void;
}

const ROLE_LABEL: Record<CalendarShareRole, string> = {
  viewer: "Viewer",
  editor: "Editor",
  manager: "Manager",
};

export function SharingPermissionsPanel({
  shareSettings,
  invitations,
  followers,
  delegations,
  onUpdateRole,
  onRemoveShare,
  onAddShare,
  onUpdateInvitation,
  onRemoveFollower,
}: SharingPermissionsPanelProps) {
  const [newShareEmail, setNewShareEmail] = useState("");
  const [newShareRole, setNewShareRole] = useState<CalendarShareRole>("viewer");

  const pendingInvitations = useMemo(
    () => invitations.filter((invite) => invite.status === "needs-action" || invite.status === "tentative"),
    [invitations]
  );

  const handleInvite = () => {
    if (!newShareEmail) return;
    const id = `share-${Date.now()}`;
    onAddShare({
      id,
      calendarId: "calendar.project.apollo",
      target: { id, type: "external", name: newShareEmail, email: newShareEmail },
      role: newShareRole,
      subscribed: true,
    });
    setNewShareEmail("");
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Sharing & permissions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase text-muted-foreground">Shared calendars</h3>
          {shareSettings.length === 0 ? (
            <p className="text-muted-foreground">No share targets.</p>
          ) : (
            <div className="space-y-2">
              {shareSettings.map((share) => (
                <div key={share.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 p-3">
                  <div>
                    <p className="text-sm font-medium">{share.target.name}</p>
                    <p className="text-muted-foreground">{share.target.email ?? share.target.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={share.role} onValueChange={(value) => onUpdateRole(share.id, value as CalendarShareRole)}>
                      <SelectTrigger className="h-8 w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" variant="ghost" onClick={() => onRemoveShare(share.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="grid gap-2 rounded-md border bg-muted/10 p-3 md:grid-cols-[minmax(0,1fr)_140px_auto]">
            <div>
              <Label className="text-[11px]">Invite by email</Label>
              <Input
                className="h-8"
                placeholder="name@example.com"
                value={newShareEmail}
                onChange={(event) => setNewShareEmail(event.target.value)}
              />
            </div>
            <div>
              <Label className="text-[11px]">Role</Label>
              <Select value={newShareRole} onValueChange={(value) => setNewShareRole(value as CalendarShareRole)}>
                <SelectTrigger className="h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="self-end" size="sm" onClick={handleInvite}>
              Share
            </Button>
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase text-muted-foreground">Invitations</h3>
          {pendingInvitations.length === 0 ? (
            <p className="text-muted-foreground">No pending invitations.</p>
          ) : (
            <div className="space-y-2">
              {pendingInvitations.map((invitation) => (
                <div key={invitation.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/20 p-3">
                  <div>
                    <p className="text-sm font-medium">{invitation.invitee.name}</p>
                    <p className="text-muted-foreground">{invitation.invitee.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{invitation.status}</Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onUpdateInvitation(invitation.id, "accepted")}
                    >
                      Mark accepted
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onUpdateInvitation(invitation.id, "declined")}
                    >
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase text-muted-foreground">Followers & delegation</h3>
          <div className="space-y-2">
            {followers.length === 0 ? (
              <p className="text-muted-foreground">No followers.</p>
            ) : (
              followers.map((follower) => (
                <div key={follower.id} className="flex items-center justify-between rounded-md border bg-muted/10 p-3">
                  <div>
                    <p className="text-sm font-medium">{follower.target.name}</p>
                    <p className="text-muted-foreground">Subscribed {new Date(follower.subscribedAt).toLocaleDateString()}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => onRemoveFollower(follower.id)}>
                    Remove
                  </Button>
                </div>
              ))
            )}
          </div>
          {delegations.length > 0 && (
            <div className="rounded-md border bg-muted/20 p-3 text-[11px] text-muted-foreground">
              <p className="font-medium text-xs">Delegations</p>
              {delegations.map((delegation) => (
                <p key={delegation.id}>
                  {delegation.delegateName} can {delegation.scope} until {delegation.expiresAt?.slice(0, 10) ?? "indefinitely"}
                </p>
              ))}
            </div>
          )}
        </section>
      </CardContent>
    </Card>
  );
}
