import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getReport, createReport, deleteReport } from "@/services/reports";
import { Report } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function ReportDetail() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const loadReport = async () => {
      if (!reportId) return;
      try {
        setLoading(true);
        setError(null);
        const data = await getReport(reportId);
        if (!data) {
          setError("Report not found");
          return;
        }
        setReport(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load report");
      } finally {
        setLoading(false);
      }
    };

    loadReport();
  }, [reportId]);

  const handleRun = async () => {
    if (!report) return;
    try {
      setIsRunning(true);
      // Placeholder for future report execution
      await new Promise((resolve) => setTimeout(resolve, 600));
      setHasRun(true);
      toast({ title: "Report ran", description: "Results updated." });
    } finally {
      setIsRunning(false);
    }
  };

  const handleDuplicate = async () => {
    if (!report) return;
    try {
      setWorking(true);
      const copy = await createReport({
        name: `${report.name} copy`,
        description: report.description ?? undefined,
        config: report.config,
      });
      toast({ title: "Report duplicated", description: "You can now edit the copy." });
      navigate(`/reports/${copy.id}`);
    } catch (error) {
      toast({
        title: "Could not duplicate", 
        description: error instanceof Error ? error.message : "Try again later.",
        variant: "destructive",
      });
    } finally {
      setWorking(false);
    }
  };

  const handleDelete = async () => {
    if (!report || !reportId) return;
    const confirmed = window.confirm("Delete this report? This cannot be undone.");
    if (!confirmed) return;

    try {
      setWorking(true);
      await deleteReport(reportId);
      toast({ title: "Report deleted" });
      navigate("/reports");
    } catch (error) {
      toast({
        title: "Could not delete", 
        description: error instanceof Error ? error.message : "Try again later.",
        variant: "destructive",
      });
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">Loading report...</CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" onClick={() => navigate("/reports")}>Back to reports</Button>
        </CardContent>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">Report not found</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold">{report.name}</h1>
          <p className="text-muted-foreground">{report.description || "No description"}</p>
          <Badge variant="secondary">
            Updated {format(new Date(report.updated_at), "MMM d, yyyy 'at' h:mm a")}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleDuplicate} disabled={working}>
            Duplicate
          </Button>
          <Button variant="outline" asChild disabled={working}>
            <Link to={`/reports/${report.id}/edit`}>Edit</Link>
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={working}>
            Delete
          </Button>
          <Button onClick={handleRun} disabled={isRunning}>
            {isRunning ? "Running..." : "Run"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="overflow-auto rounded-md bg-muted p-4 text-sm">{JSON.stringify(report.config, null, 2)}</pre>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results</CardTitle>
        </CardHeader>
        <CardContent>
          {hasRun ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium">Last run just now</p>
              <p className="text-muted-foreground">TODO: Wire up visualizations.</p>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>No run yet.</p>
              <p>Run the report to generate results.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />
      <Button variant="ghost" asChild>
        <Link to="/reports">Back to reports</Link>
      </Button>
    </div>
  );
}
