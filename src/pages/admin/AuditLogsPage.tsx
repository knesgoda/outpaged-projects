import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuditExport, useAuditLogs } from "@/hooks/useAudit";
import { useToast } from "@/components/ui/use-toast";
import { toCsv, downloadFile } from "@/lib/exportUtils";
import type { AuditLog } from "@/types";
import { Badge } from "@/components/ui/badge";

const DEFAULT_FILTERS = { limit: 100 } as const;

type Filters = {
  q?: string;
  action?: string;
  from?: string;
  to?: string;
  limit?: number;
};

type FormState = {
  q: string;
  action: string;
  from: string;
  to: string;
};

const INITIAL_FORM: FormState = {
  q: "",
  action: "",
  from: "",
  to: "",
};

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return value;
  }
}

export default function AuditLogsPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM);
  const { data = [], isLoading, isFetching, error } = useAuditLogs(filters);
  const exportQuery = useAuditExport(filters);
  const { toast } = useToast();

  const actions = useMemo(() => {
    const unique = new Set<string>();
    data.forEach((log) => unique.add(log.action));
    const sorted = Array.from(unique).sort();
    return sorted;
  }, [data]);

  const handleChange = (field: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormState((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSelectAction = (value: string) => {
    setFormState((prev) => ({ ...prev, action: value }));
  };

  const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextFilters: Filters = {
      q: formState.q.trim() || undefined,
      action: formState.action || undefined,
      from: formState.from || undefined,
      to: formState.to || undefined,
      limit: DEFAULT_FILTERS.limit,
    };
    setFilters(nextFilters);
  };

  const resetFilters = () => {
    setFormState(INITIAL_FORM);
    setFilters(DEFAULT_FILTERS);
  };

  const handleExport = async (format: "csv" | "json") => {
    const result = await exportQuery.refetch();
    if (result.error) {
      const message = result.error instanceof Error ? result.error.message : "Unable to export logs.";
      toast({ title: "Export failed", description: message, variant: "destructive" });
      return;
    }

    const logs = result.data ?? [];
    if (logs.length === 0) {
      toast({ title: "No results", description: "There are no entries for the selected filters." });
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    if (format === "csv") {
      const csv = toCsv(logs as Array<Record<string, unknown>>);
      downloadFile(csv, `audit-logs-${timestamp}.csv`, "text/csv");
      toast({ title: "Export ready", description: "Saved audit logs as CSV." });
    } else {
      const json = JSON.stringify(logs, null, 2);
      downloadFile(json, `audit-logs-${timestamp}.json`, "application/json");
      toast({ title: "Export ready", description: "Saved audit logs as JSON." });
    }
  };

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">Audit logs</h2>
        <p className="text-muted-foreground">Review recent changes across the workspace.</p>
      </header>

      <form onSubmit={applyFilters} className="grid gap-4 rounded-lg border bg-card p-4 md:grid-cols-4">
        <div className="space-y-2">
          <Label htmlFor="audit-search">Search</Label>
          <Input
            id="audit-search"
            placeholder="Search actions or targets"
            value={formState.q}
            onChange={handleChange("q")}
          />
        </div>
        <div className="space-y-2">
          <Label>Action</Label>
          <Select value={formState.action} onValueChange={handleSelectAction}>
            <SelectTrigger>
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All actions</SelectItem>
              {actions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-from">From</Label>
          <Input id="audit-from" type="date" value={formState.from} onChange={handleChange("from")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-to">To</Label>
          <Input id="audit-to" type="date" value={formState.to} onChange={handleChange("to")} />
        </div>
        <div className="flex items-end gap-2 md:col-span-4">
          <Button type="submit" disabled={isFetching || isLoading}>
            Apply filters
          </Button>
          <Button type="button" variant="outline" onClick={resetFilters} disabled={isFetching || isLoading}>
            Reset
          </Button>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" onClick={() => handleExport("csv")} disabled={exportQuery.isFetching}>
              Export CSV
            </Button>
            <Button type="button" variant="outline" onClick={() => handleExport("json")} disabled={exportQuery.isFetching}>
              Export JSON
            </Button>
          </div>
        </div>
      </form>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Metadata</TableHead>
              <TableHead className="w-48">When</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  Loading audit entries...
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-destructive">
                  {error instanceof Error ? error.message : "Failed to load audit logs."}
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No audit entries found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((log: AuditLog) => (
                <TableRow key={log.id}>
                  <TableCell>
                    <Badge variant="secondary">{log.action}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col text-sm">
                      <span className="font-medium">{log.target_type ?? "n/a"}</span>
                      <span className="text-muted-foreground">{log.target_id ?? ""}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{log.actor ?? "system"}</TableCell>
                  <TableCell>
                    <pre className="max-h-24 overflow-auto whitespace-pre-wrap rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {log.metadata ? JSON.stringify(log.metadata, null, 2) : ""}
                    </pre>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(log.created_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
