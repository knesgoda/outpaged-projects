import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useDeleteReport, useReport, useRunReport } from "@/hooks/useReports";

interface ProjectSummary {
  id: string;
  name: string;
}

export default function ReportDetail() {
  const navigate = useNavigate();
  const { reportId } = useParams<{ reportId: string }>();
  const [runError, setRunError] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<{ rows: any[]; meta: any } | null>(null);

  const reportQuery = useReport(reportId);
  const runReportMutation = useRunReport(reportId);
  const deleteReport = useDeleteReport();

  const projectQuery = useQuery<ProjectSummary | null>({
    queryKey: ["projects", "detail", reportQuery.data?.project_id],
    enabled: Boolean(reportQuery.data?.project_id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("id", reportQuery.data?.project_id ?? "")
        .maybeSingle();
      if (error) {
        console.error("Failed to load project", error);
        throw error;
      }
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (reportQuery.data?.name) {
      document.title = `Reports / ${reportQuery.data.name}`;
    }
  }, [reportQuery.data?.name]);

  const handleRun = async () => {
    if (!reportQuery.data) {
      return;
    }
    setRunError(null);
    try {
      const result = await runReportMutation.mutateAsync({ config: reportQuery.data.config });
      setRunResult(result);
    } catch (error: any) {
      console.error(error);
      setRunError(error?.message ?? "Failed to run report.");
    }
  };

  const handleExportJson = () => {
    if (!runResult) {
      return;
    }
    const blob = new Blob([JSON.stringify(runResult.rows, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportQuery.data?.name ?? "report"}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (!runResult || runResult.rows.length === 0) {
      return;
    }
    const headers = Object.keys(runResult.rows[0]);
    const csvRows = [headers.join(",")];
    for (const row of runResult.rows) {
      const values = headers.map((header) => {
        const value = row[header];
        if (value == null) {
          return "";
        }
        if (typeof value === "string" && value.includes(",")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      csvRows.push(values.join(","));
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${reportQuery.data?.name ?? "report"}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async () => {
    if (!reportId) {
      return;
    }
    const confirmed = window.confirm("Delete this report?");
    if (!confirmed) {
      return;
    }
    try {
      await deleteReport.mutateAsync(reportId);
      navigate("/reports");
    } catch (error: any) {
      console.error(error);
      setRunError(error?.message ?? "Failed to delete report.");
    }
  };

  const columns = useMemo(() => {
    if (!runResult || runResult.rows.length === 0) {
      return [] as string[];
    }
    const keys = new Set<string>();
    for (const row of runResult.rows) {
      Object.keys(row).forEach((key) => keys.add(key));
    }
    return Array.from(keys);
  }, [runResult]);

  if (reportQuery.isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading report...</div>
    );
  }

  if (reportQuery.isError) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <p className="text-sm text-destructive">We could not load this report.</p>
        <Button variant="outline" size="sm" onClick={() => reportQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (!reportQuery.data) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Report not found.</div>
    );
  }

  const projectName = reportQuery.data.project_id
    ? projectQuery.data?.name ?? reportQuery.data.project_id
    : "All projects";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {reportQuery.data.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {reportQuery.data.description || "Custom report"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(`/reports/${reportId}/edit`)}>
            Edit
          </Button>
          <Button variant="outline" onClick={handleRun} disabled={runReportMutation.isPending}>
            {runReportMutation.isPending ? "Running..." : "Run"}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteReport.isPending}>
            Delete
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">Scope:</span> {projectName}
          </div>
          <div className="overflow-hidden rounded border bg-muted/40">
            <pre className="max-h-64 overflow-auto p-4 text-xs text-muted-foreground">
              {JSON.stringify(reportQuery.data.config, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>

      {runError && (
        <Alert variant="destructive">
          <AlertTitle>Report error</AlertTitle>
          <AlertDescription>{runError}</AlertDescription>
        </Alert>
      )}

      {runResult && (
        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-base">Results</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline">Rows: {runResult.rows.length}</Badge>
              <Button size="sm" variant="outline" onClick={handleExportCsv}>
                Export CSV
              </Button>
              <Button size="sm" variant="outline" onClick={handleExportJson}>
                Export JSON
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {runResult.rows.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                No data
              </div>
            ) : (
              <div className="max-h-96 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((column) => (
                        <TableHead key={column}>{column}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runResult.rows.map((row, index) => (
                      <TableRow key={index}>
                        {columns.map((column) => (
                          <TableCell key={column} className="text-xs">
                            {formatCellValue(row[column])}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <div className="text-xs text-muted-foreground">
              {runResult.meta ? JSON.stringify(runResult.meta) : null}
            </div>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}

function formatCellValue(value: any) {
  if (value == null) {
    return "";
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
