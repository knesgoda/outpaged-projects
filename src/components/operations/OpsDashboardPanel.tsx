import { useEffect, useMemo, useState } from "react";
import { Download, Gauge, TrendingDown, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOperations } from "./OperationsProvider";

function exportCsv(rows: Array<Record<string, number | string>>) {
  const header = Object.keys(rows[0]).join(",");
  const data = rows.map((row) => Object.values(row).join(","));
  const csv = [header, ...data].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ops-dashboard.csv";
  link.click();
  URL.revokeObjectURL(url);
}

async function exportPng(metrics: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 200;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#ffffff";
    ctx.font = "16px Inter";
    ctx.fillText("Operations Dashboard", 20, 40);
    ctx.font = "14px Inter";
    ctx.fillText(metrics, 20, 80);
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = "ops-dashboard.png";
    link.click();
  }
}

export function OpsDashboardPanel() {
  const { opsMetrics, captureOpsMetrics, incidents, changeRequests } = useOperations();
  const [range, setRange] = useState("30");

  useEffect(() => {
    if (opsMetrics.length === 0) {
      captureOpsMetrics();
    }
  }, [opsMetrics.length, captureOpsMetrics]);

  const snapshot = useMemo(() => {
    if (opsMetrics.length === 0) {
      return {
        id: "temp",
        capturedAt: new Date().toISOString(),
        mttaMinutes: 0,
        mttrMinutes: 0,
        slaCompliance: 100,
        changeFailureRate: 0,
      };
    }
    return opsMetrics[opsMetrics.length - 1];
  }, [opsMetrics]);

  const summary = useMemo(() => {
    const recentIncidents = incidents.slice(-Number(range));
    const recentChanges = changeRequests.slice(-Number(range));
    const sev1Count = recentIncidents.filter((incident) => incident.severity === "Sev1").length;
    const resolved = recentIncidents.filter((incident) => incident.state === "resolved").length;
    const completedChanges = recentChanges.filter((change) => change.state === "done").length;
    return { sev1Count, resolved, completedChanges };
  }, [incidents, changeRequests, range]);

  const metricsText = `MTTA ${snapshot.mttaMinutes}m | MTTR ${snapshot.mttrMinutes}m | SLA ${snapshot.slaCompliance}% | Change Failure ${snapshot.changeFailureRate}%`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operations dashboard</CardTitle>
        <CardDescription>
          Monitor response and recovery with exportable MTTA/MTTR, SLA compliance, and change stability trends.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-center gap-4 justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7</SelectItem>
                <SelectItem value="30">Last 30</SelectItem>
                <SelectItem value="90">Last 90</SelectItem>
              </SelectContent>
            </Select>
            <span>records</span>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => exportCsv([snapshot as unknown as Record<string, string | number>])}>
              <Download className="h-4 w-4 mr-2" /> Export CSV
            </Button>
            <Button type="button" variant="outline" onClick={() => exportPng(metricsText)}>
              <Download className="h-4 w-4 mr-2" /> Export PNG
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          <Card className="bg-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Mean time to acknowledge</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-2xl font-semibold">{snapshot.mttaMinutes}m</div>
              <Gauge className="h-8 w-8 text-primary" />
            </CardContent>
          </Card>
          <Card className="bg-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Mean time to resolve</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-2xl font-semibold">{snapshot.mttrMinutes}m</div>
              <TrendingDown className="h-8 w-8 text-primary" />
            </CardContent>
          </Card>
          <Card className="bg-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">SLA compliance</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-2xl font-semibold">{snapshot.slaCompliance}%</div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </CardContent>
          </Card>
          <Card className="bg-muted">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Change failure rate</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-2xl font-semibold">{snapshot.changeFailureRate}%</div>
              <TrendingDown className="h-8 w-8 text-primary" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3 text-sm">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Sev1 volume</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{summary.sev1Count}</div>
              <p className="text-xs text-muted-foreground">Number of Sev1 incidents in the selected range.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Incidents resolved</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{summary.resolved}</div>
              <p className="text-xs text-muted-foreground">Closed incidents over the selected period.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Changes completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{summary.completedChanges}</div>
              <p className="text-xs text-muted-foreground">Deployment changes reaching Done state.</p>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
