import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableToolbar } from "@/components/admin/TableToolbar";
import { RoleBadge } from "@/components/admin/RoleBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { useRemoveMember, useSetMemberRole, useWorkspaceMembers } from "@/hooks/useWorkspace";
import { useRecordAudit } from "@/hooks/useAudit";
import type { WorkspaceMember } from "@/types";

const ROLE_OPTIONS: WorkspaceMember["role"][] = ["owner", "admin", "manager", "member", "billing"];

export default function MembersPage() {
  const { data: members = [], isLoading } = useWorkspaceMembers();
  const setRole = useSetMemberRole();
  const removeMember = useRemoveMember();
  const audit = useRecordAudit();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((member) => member.user_id.toLowerCase().includes(q));
  }, [members, query]);

  const handleRoleChange = async (member: WorkspaceMember, role: WorkspaceMember["role"]) => {
    if (member.role === "owner") {
      return;
    }
    try {
      await setRole.mutateAsync({ userId: member.user_id, role });
      audit.mutate({
        action: "workspace.member.role_change",
        target: { type: "user", id: member.user_id },
        metadata: { role },
      });
    } catch (error) {
      console.warn("Failed to update member role", error);
    }
  };

  const handleRemove = async (member: WorkspaceMember) => {
    try {
      await removeMember.mutateAsync(member.user_id);
      audit.mutate({
        action: "workspace.member.removed",
        target: { type: "user", id: member.user_id },
      });
    } catch (error) {
      console.warn("Failed to remove member", error);
    }
  };

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Members</h2>
        <p className="text-muted-foreground">Manage access for everyone in this workspace.</p>
      </header>

      <TableToolbar>
        <Input
          placeholder="Search by user id"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="w-full sm:w-72"
        />
        <Button disabled>Invite by email (coming soon)</Button>
      </TableToolbar>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User ID</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-[140px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                  Loading members...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                  No members match your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((member) => (
                <TableRow key={member.user_id}>
                  <TableCell className="font-mono text-sm">{member.user_id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <RoleBadge role={member.role} />
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleRoleChange(member, value as WorkspaceMember["role"])}
                        disabled={member.role === "owner" || setRole.isPending}
                      >
                        <SelectTrigger className="h-8 w-[150px] text-sm">
                          <SelectValue placeholder="Role" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((roleOption) => (
                            <SelectItem key={roleOption} value={roleOption} disabled={roleOption === "owner" && member.role !== "owner"}>
                              {roleOption.charAt(0).toUpperCase() + roleOption.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <ConfirmDialog
                      title="Remove member?"
                      description="This user will immediately lose access to the workspace."
                      confirmLabel="Remove"
                      onConfirm={() => handleRemove(member)}
                      trigger={
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={member.role === "owner" || removeMember.isPending}
                          className="text-destructive"
                        >
                          Remove
                        </Button>
                      }
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
