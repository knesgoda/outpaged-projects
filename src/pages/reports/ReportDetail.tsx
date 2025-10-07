import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDeleteReport, useDuplicateReport, useReport, useRunReport } from "@/hooks/useReports";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useProjectSummary } from "@/hooks/useProjectOptions";
import { useToast } from "@/hooks/use-toast";

type RunResult = {
  rows: any[];
  meta: { total?: number; groupCounts?: Record<string, Record<string, number>> };
};

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function toCsv(rows: any[]): string {
  if (!rows.length) {
    return "";
  }
  const columns = Array.from(
    rows.reduce<Set<string>>((set, row) => {
      Object.keys(row ?? {}).forEach((key) => set.add(key));
      return set;
    }, new Set())
  );

  const escapeCell = (value: unknown) => {
    if (value === null || value === undefined) return "";
    if (typeof value === "object") {
      return JSON.stringify(value).replace(/"/g, '""');
    }
    const text = String(value).replace(/"/g, '""');
    if (text.includes(",") || text.includes("\n")) {
      return `"${text}"`;
    }
    return text;
  };

  const header = columns.join(",");
  const lines = rows.map((row) => columns.map((column) => escapeCell(row?.[column])).join(","));
  return [header, ...lines].join("\n");
}

export default function ReportDetail() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: report, isLoading, isError, error } = useReport(reportId);
  const deleteReport = useDeleteReport();
  const duplicateReport = useDuplicateReport();
  const runReport = useRunReport();
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const projectId = report?.project_id ?? undefined;
  const { data: project } = useProjectSummary(projectId);

  useDocumentTitle(report ? `Reports / ${report.name}` : "Reports");

  useEffect(() => {
    setRunError(null);
  }, [runReport.status]);

  const formattedConfig = useMemo(() => {
    if (!report) return "{}";
    try {
      return JSON.stringify(report.config ?? {}, null, 2);
    } catch (_error) {
      return "{}";
    }
  }, [report]);

  const columns = useMemo(() => {
    if (!runResult?.rows?.length) {
      return [] as string[];
    }
    const set = new Set<string>();
    runResult.rows.forEach((row) => {
      Object.keys(row ?? {}).forEach((key) => set.add(key));
    });
    return Array.from(set);
  }, [runResult]);

  if (isLoading) {
    return (
      <section className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </section>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Unable to load the report.";
    return (
      <section className="p-6">
        <p className="text-sm text-destructive">{message}</p>
      </section>
    );
  }

  if (!report) {
    return (
      <section className="p-6 space-y-4">
        <p className="text-sm text-muted-foreground">Report not found.</p>
        <Button variant="link" onClick={() => navigate("/reports")}>Back to reports</Button>
      </section>
    );
  }

  const handleDelete = async () => {
    if (!reportId) return;
    if (!window.confirm("Delete this report?")) {
      return;
    }

    try {
      await deleteReport.mutateAsync(reportId);
      navigate("/reports");
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Unable to delete report.";
      toast.toast({ title: "Delete failed", description: message, variant: "destructive" });
    }
  };

  const handleDuplicate = async () => {
    try {
      const copy = await duplicateReport.mutateAsync(report);
      navigate(`/reports/${copy.id}`);
    } catch (duplicateError) {
      const message =
        duplicateError instanceof Error ? duplicateError.message : "Unable to duplicate report.";
      toast.toast({ title: "Duplicate failed", description: message, variant: "destructive" });
    }
  };

  const handleRun = async () => {
    if (!report) return;
    setRunError(null);
    try {
      const result = await runReport.mutateAsync(report.config ?? {});
      setRunResult(result);
      setLastRunAt(new Date().toISOString());
    } catch (runErr) {
      const message = runErr instanceof Error ? runErr.message : "Unable to run report.";
      setRunError(message);
    }
  };

  const safeName = (report.name || "report").replace(/[^a-z0-9_-]+/gi, "-").toLowerCase() || "report";

  const handleExportCsv = () => {
    if (!runResult?.rows?.length) return;
    const csv = toCsv(runResult.rows);
    downloadBlob(csv, `${safeName}.csv`, "text/csv;charset=utf-8");
  };

  const handleExportJson = () => {
    if (!runResult) return;
    downloadBlob(
      JSON.stringify(runResult.rows, null, 2),
      `${safeName}.json`,
      "application/json;charset=utf-8"
    );
  };

  return (
    <section className="space-y-6 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/reports">Reports</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem>
            <BreadcrumbPage>{report.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{report.name}</h1>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>{report.description || "No description provided."}</p>
            <p>
              Last updated {formatDistanceToNow(new Date(report.updated_at), { addSuffix: true })}
              {project ? ` • Project ${project.name ?? project.id}` : null}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/reports/${report.id}/edit`)}>
            Edit
          </Button>
          <Button variant="outline" onClick={handleDuplicate} disabled={duplicateReport.isPending}>
            {duplicateReport.isPending ? "Duplicating" : "Duplicate"}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteReport.isPending}>
            {deleteReport.isPending ? "Deleting" : "Delete"}
          </Button>
          <Button onClick={handleRun} disabled={runReport.isPending}>
            {runReport.isPending ? "Running" : "Run"}
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Config</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-md border bg-muted/40 p-4 text-sm font-mono">
            {formattedConfig}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Results</CardTitle>
            {lastRunAt ? (
              <p className="text-sm text-muted-foreground">
                Last ran {new Date(lastRunAt).toLocaleString()}
                {typeof runResult?.meta?.total === "number"
                  ? ` • ${runResult.meta.total} row${runResult.meta.total === 1 ? "" : "s"}`
                  : null}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Run the report to view data.</p>
            )}
            {runError ? <p className="text-sm text-destructive">{runError}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={!runResult?.rows?.length}>
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportJson} disabled={!runResult?.rows?.length}>
              Export JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {runReport.isPending ? (
            <p className="text-sm text-muted-foreground">Running report…</p>
          ) : null}

          {runResult?.rows?.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {columns.map((column) => (
                      <TableHead key={column} className="whitespace-nowrap">
                        {column}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runResult.rows.map((row, index) => (
                    <TableRow key={index}>
                      {columns.map((column) => {
                        const value = row?.[column];
                        const display =
                          value === null || value === undefined
                            ? ""
                            : typeof value === "object"
                            ? JSON.stringify(value)
                            : String(value);
                        return <TableCell key={column}>{display}</TableCell>;
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {lastRunAt ? "No data" : "Results will appear after running the report."}
            </p>
          )}

          {runResult?.meta?.groupCounts &&
          Object.keys(runResult.meta.groupCounts).length > 0 ? (
            <div className="space-y-2 text-sm">
              <h3 className="font-medium">Groups</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(runResult.meta.groupCounts).map(([field, groups]) => (
                  <div key={field} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{field}</p>
                    <ul className="mt-2 space-y-1">
                      {Object.entries(groups).map(([key, count]) => (
                        <li key={key} className="flex items-center justify-between text-xs">
                          <span className="truncate" title={key}>
                            {key}
                          </span>
                          <span>{count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
