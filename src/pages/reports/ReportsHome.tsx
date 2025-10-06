import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useReports } from "@/hooks/useReports";
import { useProjectsLite } from "@/hooks/useProjectsLite";
import { cn } from "@/lib/utils";
import { Loader2, Plus, RefreshCcw } from "lucide-react";

export default function ReportsHome() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const { data: reports = [], isLoading, isError, refetch } = useReports(
    projectFilter === "all" ? undefined : projectFilter
  );
  const { data: projects = [] } = useProjectsLite();

  useEffect(() => {
    document.title = "Reports";
  }, []);

  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((project) => {
      map.set(project.id, project.name ?? "Untitled project");
    });
    return map;
  }, [projects]);

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    return reports
      .filter((report) => {
        if (!term) return true;
        const target = `${report.name} ${report.description ?? ""}`.toLowerCase();
        return target.includes(term);
      })
      .sort((a, b) => {
        return (
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      });
  }, [reports, search]);

  const hasReports = filteredReports.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Monitor work across projects.</p>
        </div>
        <Button onClick={() => navigate("/reports/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          New report
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-4 sm:flex-row">
          <Input
            placeholder="Search reports"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="sm:w-52">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name ?? "Untitled project"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isLoading}
          aria-label="Refresh reports"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
        </Button>
      </div>

      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load reports</AlertTitle>
          <AlertDescription>Try refreshing the page.</AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && !hasReports && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No reports yet</CardTitle>
            <CardDescription>
              Create a report to explore performance trends and team activity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/reports/new")}>Create report</Button>
          </CardContent>
        </Card>
      )}

      {hasReports && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredReports.map((report) => {
            const projectLabel = report.project_id
              ? projectMap.get(report.project_id) ?? "Project"
              : "Workspace";
            return (
              <Card
                key={report.id}
                className={cn(
                  "cursor-pointer transition hover:shadow-md",
                  "focus-within:ring-2 focus-within:ring-ring"
                )}
                onClick={() => navigate(`/reports/${report.id}`)}
              >
                <CardHeader>
                  <CardTitle className="line-clamp-1">{report.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {report.description || "No description"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>{projectLabel}</span>
                    <span>
                      Updated {formatDistanceToNow(new Date(report.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide">
                    <span>{report.project_id ? "Project scoped" : "Workspace"}</span>
                    <span>{Array.isArray(report.config?.select) ? report.config.select.length : "Config"}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
