import { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, BarChart3, Clock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getSearchAuditLog, getSearchDiagnostics } from "@/services/search";

const formatDuration = (ms: number) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${Math.round(ms / 100) / 10}s`;
  return `${Math.round(ms / 600) / 100}m`;
};

export function SearchDiagnosticsPanel() {
  const [snapshot, setSnapshot] = useState(() => getSearchDiagnostics());
  const [auditLog, setAuditLog] = useState(() => getSearchAuditLog());

  useEffect(() => {
    const interval = setInterval(() => {
      setSnapshot(getSearchDiagnostics());
      setAuditLog(getSearchAuditLog());
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  const hottestQueries = useMemo(() => snapshot.hottestQueries, [snapshot.hottestQueries]);
  const latestAudits = useMemo(() => auditLog.slice(-5).reverse(), [auditLog]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <BarChart3 className="h-5 w-5" /> Search diagnostics
        </CardTitle>
        <CardDescription>Real-time observability for the search service index and abuse guard rails.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Index freshness</p>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{snapshot.indexFreshnessMinutes}m</p>
            <p className="text-xs text-muted-foreground">Time since the most recent document was indexed.</p>
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Ingestion lag</p>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{formatDuration(snapshot.ingestionLagMs)}</p>
            <p className="text-xs text-muted-foreground">Average backlog across the search queue.</p>
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Abuse throttles</p>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{snapshot.abuseSignals.throttledRequests}</p>
            <p className="text-xs text-muted-foreground">
              Blocked principals: {snapshot.abuseSignals.blockedPrincipals.length || "None"}
            </p>
          </div>

          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Last throttle</p>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 text-2xl font-semibold">
              {snapshot.abuseSignals.lastThrottleAt ? new Date(snapshot.abuseSignals.lastThrottleAt).toLocaleTimeString() : "Never"}
            </p>
            <p className="text-xs text-muted-foreground">Most recent abuse mitigation event.</p>
          </div>
        </div>

        <Separator />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Hottest queries</CardTitle>
              <CardDescription>Most frequently executed search hashes over the last hour.</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query hash</TableHead>
                    <TableHead>Executions</TableHead>
                    <TableHead>Last run</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hottestQueries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                        No searches recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    hottestQueries.map((entry) => (
                      <TableRow key={entry.hash}>
                        <TableCell className="font-mono text-xs">{entry.hash}</TableCell>
                        <TableCell>{entry.count}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(entry.lastRunAt).toLocaleTimeString()} {entry.sample ? <Badge variant="outline">{entry.sample}</Badge> : null}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Audit log extracts</CardTitle>
              <CardDescription>Recent AUDIT scoped access to search data.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {latestAudits.length === 0 ? (
                <p className="text-sm text-muted-foreground">No audit entries captured yet.</p>
              ) : (
                latestAudits.map((entry) => (
                  <div key={entry.id} className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{entry.principalId}</span>
                      <Badge variant="secondary">AUDIT</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Hash {entry.hashedQuery} · {new Date(entry.at).toLocaleTimeString()} · types {entry.types.join(", ") || "all"}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
