import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useReportsList } from "@/hooks/useReports";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useProjectOptions } from "@/hooks/useProjectOptions";

type SortOption = "updated_desc" | "updated_asc";

export default function ReportsHome() {
  useDocumentTitle("Reports");
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState<string | "all">("all");
  const [sort, setSort] = useState<SortOption>("updated_desc");

  const {
    data: reports = [],
    isLoading,
    isFetching,
    isError,
    error,
  } = useReportsList({ projectId: projectId === "all" ? undefined : projectId });

  const {
    data: projects = [],
    isLoading: loadingProjects,
    error: projectError,
  } = useProjectOptions(true);

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();
    let items = reports;
    if (term) {
      items = items.filter((report) => {
        const haystack = `${report.name} ${report.description ?? ""}`.toLowerCase();
        return haystack.includes(term);
      });
    }

    if (sort === "updated_asc") {
      return [...items].sort((a, b) =>
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
      );
    }

    return [...items].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }, [reports, search, sort]);

  if (isLoading) {
    return (
      <section className="space-y-6 p-6">
        <Skeleton className="h-7 w-40" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Unable to load reports.";
    return (
      <section className="p-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Reports</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <p className="mt-6 text-sm text-destructive">{message}</p>
      </section>
    );
  }

  if (!filteredReports.length) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Create your first report to track progress.</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search reports"
            className="w-56"
          />
          <Button asChild>
            <Link to="/reports/new">New report</Link>
          </Button>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6 p-6">
      <div className="space-y-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Reports</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
            <p className="text-sm text-muted-foreground">
              Review saved analytics across your workspace.
            </p>
          </div>
          <Button asChild>
            <Link to="/reports/new">New report</Link>
          </Button>
        </header>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search reports"
          className="w-full max-w-xs"
        />
        <Select value={projectId} onValueChange={(value) => setProjectId(value)}>
          <SelectTrigger className="w-full max-w-[220px]">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name ?? project.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => setSort(value as SortOption)}>
          <SelectTrigger className="w-full max-w-[200px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="updated_desc">Newest first</SelectItem>
            <SelectItem value="updated_asc">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {projectError ? (
        <p className="text-sm text-destructive">
          {projectError instanceof Error ? projectError.message : "Projects unavailable."}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredReports.map((report) => (
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
            <CardContent className="mt-auto space-y-1 text-sm text-muted-foreground">
              <p>
                Updated {formatDistanceToNow(new Date(report.updated_at), { addSuffix: true })}
              </p>
              {isFetching ? <p className="text-xs">Refreshing…</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
