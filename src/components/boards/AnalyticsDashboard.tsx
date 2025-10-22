import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CumulativeFlowDiagram } from "./analytics/CumulativeFlowDiagram";
import { LoadingState } from "@/components/boards/LoadingState";
import { useEffect, useState } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { fetchCFDData, fetchCycleTimeMetrics, fetchThroughputMetrics } from "@/services/boards/analyticsService";
import type { CFDDataPoint, ColumnDefinition } from "@/services/boards/analyticsService";

export function AnalyticsDashboard() {
  const { project } = useProject();
  const [cfdData, setCfdData] = useState<CFDDataPoint[]>([]);
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [cycleTime, setCycleTime] = useState({ average: 0, median: 0, p85: 0, p95: 0 });
  const [throughput, setThroughput] = useState({ average: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAnalytics() {
      setIsLoading(true);
      try {
        const [cfd, ct, tp] = await Promise.all([
          fetchCFDData(project.id, 30),
          fetchCycleTimeMetrics(project.id),
          fetchThroughputMetrics(project.id, 4),
        ]);

        setCfdData(cfd.data);
        setColumns(cfd.columns);
        setCycleTime(ct);
        setThroughput(tp);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadAnalytics();
  }, [project.id]);

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingState type="spinner" message="Loading analytics..." />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Board Analytics</h2>
        <p className="text-muted-foreground">
          Track flow metrics and performance for {project.name}
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Cycle Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cycleTime.average} days</div>
            <p className="text-xs text-muted-foreground">
              Median: {cycleTime.median}d • 85%: {cycleTime.p85}d
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Throughput</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{throughput.average} tasks/week</div>
            <p className="text-xs text-muted-foreground">4-week average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Columns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{columns.length}</div>
            <p className="text-xs text-muted-foreground">On this board</p>
          </CardContent>
        </Card>
      </div>

      {/* CFD Chart */}
      <CumulativeFlowDiagram data={cfdData} columns={columns} />
    </div>
  );
}
