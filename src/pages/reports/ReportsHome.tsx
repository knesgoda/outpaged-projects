import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listReports } from "@/services/reports";
import { Report } from "@/types";

export default function ReportsHome() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listReports();
      setReports(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not load reports";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">Track custom insights for your workspace</p>
        </div>
        <Button asChild>
          <Link to="/reports/new">New report</Link>
        </Button>
      </div>

      {loading && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Loading reports...</CardContent>
        </Card>
      )}

      {!loading && error && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={loadReports}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && reports.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <CardTitle className="text-lg">No reports yet</CardTitle>
            <p className="text-sm text-muted-foreground">Create your first report to get started.</p>
            <Button asChild>
              <Link to="/reports/new">Create report</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && reports.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <Card key={report.id} className="transition hover:shadow-md">
              <Link to={`/reports/${report.id}`} className="block h-full">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">{report.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p className="line-clamp-2">{report.description || "No description"}</p>
                  <p>Updated {formatDistanceToNow(new Date(report.updated_at), { addSuffix: true })}</p>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
