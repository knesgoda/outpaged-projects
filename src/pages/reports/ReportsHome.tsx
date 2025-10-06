import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useReportsList } from "@/hooks/useReports";

export default function ReportsHome() {
  const { data: reports, isLoading, isError, error } = useReportsList();

  if (isLoading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading reports...</p>
      </div>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Unable to load reports.";
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{message}</p>
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Create your first report to track progress.</p>
        </div>
        <Button asChild>
          <Link to="/reports/new">New report</Link>
        </Button>
      </section>
    );
  }

  return (
    <section className="space-y-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Review saved analytics for your workspace.
          </p>
        </div>
        <Button asChild>
          <Link to="/reports/new">New report</Link>
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <Card key={report.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg">
                <Link to={`/reports/${report.id}`} className="hover:underline">
                  {report.name}
                </Link>
              </CardTitle>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {report.description || "No description"}
              </p>
            </CardHeader>
            <CardContent className="mt-auto text-sm text-muted-foreground">
              Updated {formatDistanceToNow(new Date(report.updated_at), { addSuffix: true })}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
