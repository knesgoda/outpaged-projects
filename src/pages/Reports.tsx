import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAnalytics } from "@/hooks/useAnalytics";
import { BuilderShell } from "@/features/reports/builder/BuilderShell";
import type { ReportExecutionResult, ReportQuery } from "@/hooks/useAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function ReportsPage() {
  const { runReport } = useAnalytics();
  const { toast } = useToast();
  const [lastResult, setLastResult] = useState<ReportExecutionResult | null>(null);
  const [running, setRunning] = useState(false);

  const handleRun = useCallback(async (query: ReportQuery) => {
    setRunning(true);
    try {
      const result = await runReport(query);
      setLastResult(result);
      toast({
        title: "Report executed",
        description: `Returned ${result.rows.length} rows`,
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Unable to run report",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setRunning(false);
    }
  }, [runReport, toast]);

  useEffect(() => {
    void handleRun({
      source: "analytics.mv_event_daily",
      dimensions: ["date_key"],
      metrics: [
        {
          id: "events",
          label: "Events",
          column: "events",
          aggregation: "sum",
        },
      ],
    });
  }, [handleRun]);

  return (
    <div className="space-y-6">
      <BuilderShell onRun={handleRun} onSave={handleRun} />
      <Card>
        <CardHeader>
          <CardTitle>Last run</CardTitle>
        </CardHeader>
        <CardContent>
          {running ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Running report...
            </div>
          ) : lastResult ? (
            <pre className="max-h-80 overflow-auto rounded bg-muted p-4 text-xs">
              {JSON.stringify(lastResult, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-muted-foreground">Run a report to see results here.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
