import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDeleteReport, useDuplicateReport, useReport } from "@/hooks/useReports";
import { useToast } from "@/components/ui/use-toast";

export default function ReportDetail() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: report, isLoading, isError, error } = useReport(reportId);
  const deleteReport = useDeleteReport();
  const duplicateReport = useDuplicateReport();
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const formattedConfig = useMemo(() => {
    if (!report) return "{}";
    try {
      return JSON.stringify(report.config ?? {}, null, 2);
    } catch (_error) {
      return "{}";
    }
  }, [report]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Unable to load the report.";
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{message}</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Report not found.</p>
        <Button variant="link" onClick={() => navigate("/reports")}>Back to reports</Button>
      </div>
    );
  }

  const handleDelete = async () => {
    if (!reportId) return;
    const confirmed = window.confirm("Delete this report?");
    if (!confirmed) return;

    try {
      await deleteReport.mutateAsync(reportId);
      navigate("/reports");
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Unable to delete report.";
      toast({ title: "Delete failed", description: message, variant: "destructive" });
    }
  };

  const handleDuplicate = async () => {
    try {
      const copy = await duplicateReport.mutateAsync(report);
      navigate(`/reports/${copy.id}`);
    } catch (duplicateError) {
      const message =
        duplicateError instanceof Error ? duplicateError.message : "Unable to duplicate report.";
      toast({ title: "Duplicate failed", description: message, variant: "destructive" });
    }
  };

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setLastRunAt(new Date().toISOString());
      toast({ title: "Report ran", description: "Preview refreshed." });
    }, 400);
  };

  return (
    <section className="space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{report.name}</h1>
          <p className="text-sm text-muted-foreground">
            {report.description || "No description provided."}
          </p>
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
          <Button onClick={handleRun} disabled={isRunning}>
            {isRunning ? "Running" : "Run"}
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
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>Placeholder results. Connect data sources to visualize insights.</p>
          {lastRunAt ? <p>Last ran at {new Date(lastRunAt).toLocaleString()}</p> : null}
        </CardContent>
      </Card>
    </section>
  );
}
