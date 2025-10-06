import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Papa from "papaparse";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeleteReport, useReport, useRunReport } from "@/hooks/useReports";
import { useProjectsLite } from "@/hooks/useProjectsLite";
import { setBreadcrumbLabel } from "@/state/breadcrumbs";
import type { RunReportResult } from "@/services/reports";
import { Download, Edit, Loader2, Play, Trash2 } from "lucide-react";

export default function ReportDetail() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { data: report, isLoading, isError } = useReport(reportId);
  const { data: projects = [] } = useProjectsLite();
  const runMutation = useRunReport();
  const deleteMutation = useDeleteReport();
  const [result, setResult] = useState<RunReportResult | null>(null);

  const projectName = useMemo(() => {
    if (!report?.project_id) return "Workspace";
    return projects.find((project) => project.id === report.project_id)?.name ?? "Project";
  }, [projects, report?.project_id]);

  useEffect(() => {
    if (report?.name) {
      document.title = `Reports / ${report.name}`;
    } else {
      document.title = "Reports";
    }
  }, [report?.name]);

  useEffect(() => {
    if (report?.id && report.name) {
      const path = `/reports/${report.id}`;
      setBreadcrumbLabel(path, report.name);
      return () => setBreadcrumbLabel(path, null);
    }
  }, [report?.id, report?.name]);

  useEffect(() => {
    setResult(null);
  }, [reportId]);

  const handleRun = async () => {
    if (!report) return;
    const data = await runMutation.mutateAsync(report.config);
    setResult(data);
  };

  const handleExportCsv = () => {
    if (!result?.rows?.length) return;
    const csv = Papa.unparse(result.rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${report?.name ?? "report"}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    if (!result?.rows?.length) return;
    const payload = JSON.stringify(result.rows, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${report?.name ?? "report"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const columns = useMemo(() => {
    if (!result?.rows?.length) return [] as string[];
    const first = result.rows[0];
    if (first && typeof first === "object" && !Array.isArray(first)) {
      return Object.keys(first);
    }
    return ["value"];
  }, [result?.rows]);

  const renderRowValues = (row: any) => {
    if (row && typeof row === "object" && !Array.isArray(row)) {
      return columns.map((column) => {
        const value = row[column];
        return typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
      });
    }
    return [typeof row === "object" ? JSON.stringify(row) : String(row ?? "")];
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load report</AlertTitle>
        <AlertDescription>Try refreshing the page.</AlertDescription>
      </Alert>
    );
  }

  if (!report) {
    return (
      <Alert>
        <AlertTitle>Report not found</AlertTitle>
        <AlertDescription>The requested report does not exist.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{report.name}</h1>
          <p className="text-muted-foreground">Updated {format(new Date(report.updated_at), "PPpp")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => navigate(`/reports/${report.id}/edit`)} className="gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2" disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete report?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone and will remove the saved report.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try {
                      await deleteMutation.mutateAsync(report.id);
                      navigate("/reports");
                    } catch (error) {
                      console.error(error);
                    }
                  }}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button onClick={handleRun} disabled={runMutation.isPending} className="gap-2">
            {runMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Run
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>
            {report.description || "No description"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6 text-sm text-muted-foreground">
          <div>
            <p className="text-xs uppercase">Scope</p>
            <p className="text-base font-medium">{projectName}</p>
          </div>
          <div>
            <p className="text-xs uppercase">Owner</p>
            <p>{report.owner}</p>
          </div>
          <div>
            <p className="text-xs uppercase">Created</p>
            <p>{format(new Date(report.created_at), "PPpp")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Config</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-80 overflow-auto rounded bg-muted p-4 text-sm">
            {JSON.stringify(report.config, null, 2)}
          </pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              {result?.meta?.count ? `${result.meta.count} rows fetched` : "Run the report to see data."}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{result?.meta?.resource ?? report.config?.resource ?? "tasks"}</Badge>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExportCsv}
              disabled={!result?.rows?.length}
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExportJson}
              disabled={!result?.rows?.length}
            >
              <Download className="h-4 w-4" />
              JSON
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!result?.rows?.length ? (
            <p className="text-sm text-muted-foreground">Run the report to view rows.</p>
          ) : (
            <div className="space-y-2">
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
                  {result.rows.map((row, index) => (
                    <TableRow key={index}>
                      {renderRowValues(row).map((value, cellIndex) => (
                        <TableCell key={cellIndex} className="align-top">
                          <span className="break-words text-xs md:text-sm">{value}</span>
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
