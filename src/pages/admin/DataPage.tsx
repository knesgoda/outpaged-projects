import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { toCsv, downloadFile } from "@/lib/exportUtils";

const TABLES = [
  {
    id: "workspace_settings",
    label: "Workspace settings",
    description: "Branding, capacity defaults, and security JSON.",
    select: "*",
  },
  {
    id: "workspace_members",
    label: "Workspace members",
    description: "Current membership roster and roles.",
    select: "user_id, role",
  },
  {
    id: "profiles",
    label: "Profiles",
    description: "Names, titles, and personal capacity data.",
    select: "id, full_name, title, department, timezone, capacity_hours_per_week, updated_at",
  },
  {
    id: "audit_logs",
    label: "Audit logs",
    description: "Recent governance events for compliance exports.",
    select: "id, actor, action, target_type, target_id, metadata, created_at",
  },
  {
    id: "webhooks",
    label: "Webhooks",
    description: "Endpoints and activation state for outbound calls.",
    select: "id, owner, target_url, active, created_at",
  },
];

type ExportState = {
  table: string;
  format: "csv" | "json";
};

function createFilename(table: string, format: "csv" | "json") {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${table}-${timestamp}.${format}`;
}

export default function DataPage() {
  const [exporting, setExporting] = useState<ExportState | null>(null);
  const { toast } = useToast();

  const handleExport = async (tableId: string, format: "csv" | "json") => {
    const table = TABLES.find((item) => item.id === tableId);
    if (!table) return;

    setExporting({ table: tableId, format });

    const { data, error } = await supabase.from(table.id).select(table.select);

    if (error) {
      const message = error.code === "42501" || error.code === "PGRST301" ? "You do not have access" : error.message;
      toast({ title: "Export failed", description: message, variant: "destructive" });
      setExporting(null);
      return;
    }

    const rows = (data as Array<Record<string, unknown>>) ?? [];
    if (rows.length === 0) {
      toast({ title: "No data", description: "This table is empty." });
      setExporting(null);
      return;
    }

    const filename = createFilename(table.id, format);
    if (format === "csv") {
      const csv = toCsv(rows);
      downloadFile(csv, filename, "text/csv");
      toast({ title: "Export ready", description: `${table.label} saved as CSV.` });
    } else {
      const json = JSON.stringify(rows, null, 2);
      downloadFile(json, filename, "application/json");
      toast({ title: "Export ready", description: `${table.label} saved as JSON.` });
    }

    setExporting(null);
  };

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Data exports</h2>
        <p className="text-muted-foreground">
          Download structured snapshots of core tables. For automated backups, connect your data warehouse or
          enable managed exports.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Backup guidance</CardTitle>
          <CardDescription>
            Run these exports before risky changes or on a recurring schedule. Keep sensitive files in your company vault.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {TABLES.map((table) => (
          <Card key={table.id}>
            <CardHeader>
              <CardTitle>{table.label}</CardTitle>
              <CardDescription>{table.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => handleExport(table.id, "csv")}
                disabled={Boolean(exporting)}
              >
                {exporting?.table === table.id && exporting.format === "csv" ? "Exporting..." : "Export CSV"}
              </Button>
              <Button
                variant="outline"
                onClick={() => handleExport(table.id, "json")}
                disabled={Boolean(exporting)}
              >
                {exporting?.table === table.id && exporting.format === "json" ? "Exporting..." : "Export JSON"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
