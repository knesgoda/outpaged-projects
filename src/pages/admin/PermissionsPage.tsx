import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X } from "lucide-react";
import { ProjectGovernanceAdmin } from "@/components/admin/ProjectGovernanceAdmin";

const ROLE_MATRIX = [
  {
    capability: "Update workspace settings",
    permissions: {
      owner: true,
      admin: true,
      manager: false,
      member: false,
      billing: false,
    },
  },
  {
    capability: "Manage members",
    permissions: {
      owner: true,
      admin: true,
      manager: true,
      member: false,
      billing: false,
    },
  },
  {
    capability: "View billing",
    permissions: {
      owner: true,
      admin: true,
      manager: false,
      member: false,
      billing: true,
    },
  },
  {
    capability: "View audit logs",
    permissions: {
      owner: true,
      admin: true,
      manager: true,
      member: false,
      billing: false,
    },
  },
  {
    capability: "Manage security policies",
    permissions: {
      owner: true,
      admin: true,
      manager: false,
      member: false,
      billing: false,
    },
  },
  {
    capability: "Create API tokens",
    permissions: {
      owner: true,
      admin: true,
      manager: false,
      member: true,
      billing: false,
    },
  },
];

const ROLES: Array<"owner" | "admin" | "manager" | "member" | "billing"> = [
  "owner",
  "admin",
  "manager",
  "member",
  "billing",
];

const ROLE_LABELS = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  member: "Member",
  billing: "Billing",
};

function PermissionIcon({ allowed }: { allowed: boolean }) {
  return allowed ? <Check className="h-4 w-4 text-green-500" aria-hidden="true" /> : <X className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
}

export default function PermissionsPage() {
  return (
    <>
      <section className="space-y-8">
        <header className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">Permissions</h2>
          <p className="text-muted-foreground">Review what each role can do inside the workspace.</p>
        </header>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Capability</TableHead>
              {ROLES.map((role) => (
                <TableHead key={role} className="text-center">
                  {ROLE_LABELS[role]}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {ROLE_MATRIX.map((row) => (
              <TableRow key={row.capability}>
                <TableCell className="font-medium">{row.capability}</TableCell>
                {ROLES.map((role) => (
                  <TableCell key={role} className="text-center">
                    <PermissionIcon allowed={row.permissions[role]} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </section>

      <ProjectGovernanceAdmin />
    </>
  );
}
