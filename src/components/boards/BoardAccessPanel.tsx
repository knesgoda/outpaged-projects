import { useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ShieldCheck, Users, EyeOff, Link2, Lock } from "lucide-react";
import { useBoardPermissions, BOARD_ROLES } from "@/hooks/useBoardPermissions";
import type { BoardRole } from "@/services/boards/boardGovernanceService";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const ROLE_LABELS: Record<BoardRole, string> = {
  owner: "Owner",
  manager: "Manager",
  editor: "Editor",
  commenter: "Commenter",
  viewer: "Viewer",
  guest: "Guest",
};

function getInitials(name?: string | null) {
  if (!name) return "??";
  const parts = name.split(" ").filter(Boolean);
  if (parts.length === 0) return name.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function computeHiddenRoles(minRole: BoardRole): BoardRole[] {
  const index = BOARD_ROLES.indexOf(minRole);
  if (index === -1) return [];
  return BOARD_ROLES.slice(index + 1);
}

interface BoardAccessPanelProps {
  boardId: string;
}

export function BoardAccessPanel({ boardId }: BoardAccessPanelProps) {
  const { toast } = useToast();
  const {
    role,
    permissions,
    members,
    shareLinks,
    fieldVisibility,
    itemPrivacy,
    hiddenFields,
    restrictedItemIds,
    isLoading,
    actions,
  } = useBoardPermissions(boardId);

  const [memberForm, setMemberForm] = useState({
    userId: "",
    role: "viewer" as BoardRole,
    message: "",
  });

  const [fieldForm, setFieldForm] = useState({
    fieldKey: "",
    minRole: "viewer" as BoardRole,
    sensitive: false,
  });

  const [privacyForm, setPrivacyForm] = useState({
    itemId: "",
    visibility: "commenter" as BoardRole,
    reason: "",
  });

  const [shareForm, setShareForm] = useState({
    allowedRole: "viewer" as BoardRole,
    expiresAt: "",
    maxUses: "",
    password: "",
    requirePassword: false,
  });

  const capabilities = useMemo(
    () =>
      Object.entries(permissions).map(([key, value]) => ({
        key,
        allowed: value,
      })),
    [permissions]
  );

  const handleMemberSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await actions.inviteOrUpdateMember({
        boardId,
        userId: memberForm.userId,
        role: memberForm.role,
        invitationMessage: memberForm.message,
      });
      setMemberForm((prev) => ({ ...prev, userId: "", message: "" }));
      toast({ title: "Member added", description: "Updated board membership." });
    } catch (error) {
      const description = error instanceof Error ? error.message : "Unable to update member.";
      toast({ title: "Membership update failed", description, variant: "destructive" });
    }
  };

  const handleFieldSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await actions.updateFieldVisibility({
        boardId,
        fieldKey: fieldForm.fieldKey,
        hiddenForRoles: computeHiddenRoles(fieldForm.minRole),
        isSensitive: fieldForm.sensitive,
      });
      setFieldForm({ fieldKey: "", minRole: "viewer", sensitive: false });
      toast({ title: "Field visibility saved" });
    } catch (error) {
      const description = error instanceof Error ? error.message : "Unable to update field visibility.";
      toast({ title: "Field update failed", description, variant: "destructive" });
    }
  };

  const handlePrivacySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await actions.setItemPrivacy({
        boardId,
        itemId: privacyForm.itemId,
        visibility: privacyForm.visibility,
        reason: privacyForm.reason || undefined,
      });
      setPrivacyForm({ itemId: "", visibility: "commenter", reason: "" });
      toast({ title: "Privacy rule saved" });
    } catch (error) {
      const description = error instanceof Error ? error.message : "Unable to update privacy.";
      toast({ title: "Privacy update failed", description, variant: "destructive" });
    }
  };

  const handleShareSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await actions.createShareLink({
        allowedRole: shareForm.allowedRole,
        expiresAt: shareForm.expiresAt ? new Date(shareForm.expiresAt).toISOString() : null,
        maxUses: shareForm.maxUses ? Number(shareForm.maxUses) : null,
        password: shareForm.requirePassword ? shareForm.password : null,
      });
      setShareForm({ allowedRole: "viewer", expiresAt: "", maxUses: "", password: "", requirePassword: false });
      toast({ title: "Share link created" });
    } catch (error) {
      const description = error instanceof Error ? error.message : "Unable to create share link.";
      toast({ title: "Share link creation failed", description, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Board access</CardTitle>
          <CardDescription>Loading governance controls…</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Access overview
          </CardTitle>
          <CardDescription>
            You are signed in as <strong>{ROLE_LABELS[role]}</strong>. Review what you can do on this board.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {capabilities.map(({ key, allowed }) => (
            <div key={key} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="font-medium capitalize">{key.replace(/([A-Z])/g, " $1").toLowerCase()}</p>
                <p className="text-sm text-muted-foreground">
                  {allowed ? "Permitted" : "Not permitted for your role"}
                </p>
              </div>
              <Badge variant={allowed ? "default" : "outline"}>{allowed ? "Allowed" : "Blocked"}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Board members
          </CardTitle>
          <CardDescription>Manage who can collaborate on this board.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {permissions.canManageMembers && (
            <form onSubmit={handleMemberSubmit} className="grid gap-4 md:grid-cols-3 md:items-end">
              <div className="space-y-2">
                <Label htmlFor="member-id">User ID</Label>
                <Input
                  id="member-id"
                  placeholder="user-uuid"
                  value={memberForm.userId}
                  onChange={(event) => setMemberForm((prev) => ({ ...prev, userId: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="member-role">Role</Label>
                <Select
                  value={memberForm.role}
                  onValueChange={(value) => setMemberForm((prev) => ({ ...prev, role: value as BoardRole }))}
                >
                  <SelectTrigger id="member-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {BOARD_ROLES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {ROLE_LABELS[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label htmlFor="member-message">Invitation message (optional)</Label>
                <Textarea
                  id="member-message"
                  rows={2}
                  value={memberForm.message}
                  onChange={(event) => setMemberForm((prev) => ({ ...prev, message: event.target.value }))}
                />
              </div>
              <div className="md:col-span-3">
                <Button type="submit" disabled={!memberForm.userId}>
                  Add or update member
                </Button>
              </div>
            </form>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  {permissions.canManageMembers && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={`${member.board_id}-${member.user_id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={member.avatar_url ?? undefined} alt={member.full_name ?? undefined} />
                          <AvatarFallback>{getInitials(member.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{member.full_name ?? member.user_id}</p>
                          <p className="text-sm text-muted-foreground">{member.title ?? "Member"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{member.department ?? "—"}</TableCell>
                    <TableCell>
                      {permissions.canManageMembers && member.user_id ? (
                        <Select
                          value={(member.role ?? "guest") as BoardRole}
                          onValueChange={async (value) => {
                            try {
                              await actions.inviteOrUpdateMember({
                                boardId,
                                userId: member.user_id!,
                                role: value as BoardRole,
                              });
                              toast({ title: "Role updated" });
                            } catch (error) {
                              const description =
                                error instanceof Error ? error.message : "Unable to update role.";
                              toast({ title: "Update failed", description, variant: "destructive" });
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BOARD_ROLES.map((option) => (
                              <SelectItem key={option} value={option}>
                                {ROLE_LABELS[option]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">{ROLE_LABELS[(member.role ?? "guest") as BoardRole]}</Badge>
                      )}
                    </TableCell>
                    {permissions.canManageMembers && member.user_id && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          onClick={async () => {
                            try {
                              await actions.removeMember(member.user_id!);
                              toast({ title: "Member removed" });
                            } catch (error) {
                              const description =
                                error instanceof Error ? error.message : "Unable to remove member.";
                              toast({ title: "Removal failed", description, variant: "destructive" });
                            }
                          }}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {members.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={permissions.canManageMembers ? 4 : 3} className="text-center text-muted-foreground">
                      No members yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <EyeOff className="h-5 w-5" /> Field visibility
          </CardTitle>
          <CardDescription>Hide sensitive fields for less privileged roles.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {permissions.canManagePrivacy && (
            <form onSubmit={handleFieldSubmit} className="grid gap-4 md:grid-cols-4 md:items-end">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="field-key">Field key</Label>
                <Input
                  id="field-key"
                  placeholder="custom_field.identifier"
                  value={fieldForm.fieldKey}
                  onChange={(event) => setFieldForm((prev) => ({ ...prev, fieldKey: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="field-min-role">Minimum role to view</Label>
                <Select
                  value={fieldForm.minRole}
                  onValueChange={(value) => setFieldForm((prev) => ({ ...prev, minRole: value as BoardRole }))}
                >
                  <SelectTrigger id="field-min-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BOARD_ROLES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {ROLE_LABELS[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="field-sensitive">Mark as sensitive</Label>
                <div className="flex items-center gap-2 rounded-md border p-2">
                  <Switch
                    id="field-sensitive"
                    checked={fieldForm.sensitive}
                    onCheckedChange={(checked) => setFieldForm((prev) => ({ ...prev, sensitive: checked }))}
                  />
                  <span className="text-sm text-muted-foreground">Require audit logging on access</span>
                </div>
              </div>
              <div className="md:col-span-4">
                <Button type="submit" disabled={!fieldForm.fieldKey}>
                  Save visibility
                </Button>
              </div>
            </form>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                  <TableHead>Hidden for</TableHead>
                  <TableHead>Sensitive</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fieldVisibility.map((field) => (
                  <TableRow key={field.field_key}>
                    <TableCell>{field.field_key}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {field.hidden_for_roles.length === 0 ? (
                          <Badge variant="outline">Visible to all</Badge>
                        ) : (
                          field.hidden_for_roles.map((roleKey) => (
                            <Badge key={roleKey} variant="secondary">
                              {ROLE_LABELS[roleKey]}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{field.is_sensitive ? "Yes" : "No"}</TableCell>
                  </TableRow>
                ))}
                {fieldVisibility.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No field restrictions configured.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {hiddenFields.length > 0 && (
            <p className="text-sm text-muted-foreground">
              You cannot see fields: <strong>{hiddenFields.join(", ")}</strong> with your current role.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" /> Item-level privacy
          </CardTitle>
          <CardDescription>Restrict access to specific items for limited audiences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {permissions.canManagePrivacy && (
            <form onSubmit={handlePrivacySubmit} className="grid gap-4 md:grid-cols-4 md:items-end">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="item-id">Item ID</Label>
                <Input
                  id="item-id"
                  placeholder="task-uuid"
                  value={privacyForm.itemId}
                  onChange={(event) => setPrivacyForm((prev) => ({ ...prev, itemId: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-visibility">Minimum role</Label>
                <Select
                  value={privacyForm.visibility}
                  onValueChange={(value) => setPrivacyForm((prev) => ({ ...prev, visibility: value as BoardRole }))}
                >
                  <SelectTrigger id="item-visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BOARD_ROLES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {ROLE_LABELS[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-4">
                <Label htmlFor="item-reason">Reason (optional)</Label>
                <Textarea
                  id="item-reason"
                  rows={2}
                  value={privacyForm.reason}
                  onChange={(event) => setPrivacyForm((prev) => ({ ...prev, reason: event.target.value }))}
                />
              </div>
              <div className="md:col-span-4">
                <Button type="submit" disabled={!privacyForm.itemId}>
                  Save privacy rule
                </Button>
              </div>
            </form>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Minimum role</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Updated</TableHead>
                  {permissions.canManagePrivacy && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemPrivacy.map((rule) => (
                  <TableRow key={rule.item_id}>
                    <TableCell>{rule.item_id}</TableCell>
                    <TableCell>{ROLE_LABELS[rule.visibility]}</TableCell>
                    <TableCell>{rule.reason ?? "—"}</TableCell>
                    <TableCell>
                      {rule.updated_at ? formatDistanceToNow(new Date(rule.updated_at), { addSuffix: true }) : "—"}
                    </TableCell>
                    {permissions.canManagePrivacy && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          onClick={async () => {
                            try {
                              await actions.removeItemPrivacy(rule.item_id);
                              toast({ title: "Privacy rule removed" });
                            } catch (error) {
                              const description =
                                error instanceof Error ? error.message : "Unable to remove privacy rule.";
                              toast({ title: "Removal failed", description, variant: "destructive" });
                            }
                          }}
                        >
                          Clear
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {itemPrivacy.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={permissions.canManagePrivacy ? 5 : 4} className="text-center text-muted-foreground">
                      No item-level restrictions configured.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {restrictedItemIds.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Items hidden from you: <strong>{restrictedItemIds.join(", ")}</strong>
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" /> Share links
          </CardTitle>
          <CardDescription>Generate time-boxed, password protected access to the board.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {permissions.canManageShareLinks && (
            <form onSubmit={handleShareSubmit} className="grid gap-4 md:grid-cols-4 md:items-end">
              <div className="space-y-2">
                <Label htmlFor="share-role">Role</Label>
                <Select
                  value={shareForm.allowedRole}
                  onValueChange={(value) => setShareForm((prev) => ({ ...prev, allowedRole: value as BoardRole }))}
                >
                  <SelectTrigger id="share-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BOARD_ROLES.map((option) => (
                      <SelectItem key={option} value={option}>
                        {ROLE_LABELS[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="share-expires">Expires</Label>
                <Input
                  id="share-expires"
                  type="datetime-local"
                  value={shareForm.expiresAt}
                  onChange={(event) => setShareForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="share-max-uses">Max uses</Label>
                <Input
                  id="share-max-uses"
                  type="number"
                  min={1}
                  value={shareForm.maxUses}
                  onChange={(event) => setShareForm((prev) => ({ ...prev, maxUses: event.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="share-password-toggle">Password protection</Label>
                <div className="flex items-center gap-2 rounded-md border p-2">
                  <Checkbox
                    id="share-password-toggle"
                    checked={shareForm.requirePassword}
                    onCheckedChange={(checked) =>
                      setShareForm((prev) => ({ ...prev, requirePassword: Boolean(checked), password: "" }))
                    }
                  />
                  <span className="text-sm text-muted-foreground">Require password</span>
                </div>
                {shareForm.requirePassword && (
                  <Input
                    type="password"
                    placeholder="Set password"
                    value={shareForm.password}
                    onChange={(event) => setShareForm((prev) => ({ ...prev, password: event.target.value }))}
                    required
                  />
                )}
              </div>
              <div className="md:col-span-4">
                <Button type="submit">Create share link</Button>
              </div>
            </form>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slug</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  {permissions.canManageShareLinks && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {shareLinks.map((link) => {
                  const isRevoked = Boolean(link.revoked_at);
                  const isExpired = link.expires_at ? new Date(link.expires_at) < new Date() : false;
                  return (
                    <TableRow key={link.id}>
                      <TableCell>
                        <code className="text-sm">{link.slug}</code>
                      </TableCell>
                      <TableCell>{ROLE_LABELS[link.allowed_role]}</TableCell>
                      <TableCell>
                        {link.expires_at
                          ? formatDistanceToNow(new Date(link.expires_at), { addSuffix: true })
                          : "No expiry"}
                      </TableCell>
                      <TableCell>
                        {link.usage_count}
                        {link.max_uses ? ` / ${link.max_uses}` : ""}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isRevoked || isExpired ? "outline" : "secondary"}>
                          {isRevoked ? "Revoked" : isExpired ? "Expired" : "Active"}
                        </Badge>
                      </TableCell>
                      {permissions.canManageShareLinks && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              onClick={async () => {
                                try {
                                  await actions.updateShareLink({
                                    id: link.id,
                                    allowedRole: link.allowed_role,
                                    expiresAt: link.expires_at,
                                    maxUses: link.max_uses,
                                    password: link.password_hash ? "" : undefined,
                                  });
                                  toast({ title: "Share link refreshed" });
                                } catch (error) {
                                  const description =
                                    error instanceof Error ? error.message : "Unable to update share link.";
                                  toast({ title: "Update failed", description, variant: "destructive" });
                                }
                              }}
                            >
                              Refresh
                            </Button>
                            {!isRevoked && (
                              <Button
                                variant="destructive"
                                onClick={async () => {
                                  try {
                                    await actions.revokeShareLink(link.id);
                                    toast({ title: "Share link revoked" });
                                  } catch (error) {
                                    const description =
                                      error instanceof Error ? error.message : "Unable to revoke share link.";
                                    toast({ title: "Revoke failed", description, variant: "destructive" });
                                  }
                                }}
                              >
                                Revoke
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
                {shareLinks.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={permissions.canManageShareLinks ? 6 : 5} className="text-center text-muted-foreground">
                      No share links created yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
