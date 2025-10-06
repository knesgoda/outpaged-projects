import { Badge } from "@/components/ui/badge";
import type { WorkspaceMember } from "@/types";

const ROLE_LABELS: Record<WorkspaceMember["role"], string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  member: "Member",
  billing: "Billing",
};

const ROLE_VARIANTS: Record<WorkspaceMember["role"], "default" | "secondary" | "outline" | "destructive"> = {
  owner: "default",
  admin: "default",
  manager: "secondary",
  member: "outline",
  billing: "secondary",
};

export function RoleBadge({ role }: { role: WorkspaceMember["role"] }) {
  return <Badge variant={ROLE_VARIANTS[role]}>{ROLE_LABELS[role]}</Badge>;
}
