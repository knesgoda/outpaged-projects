import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useReports, useReportSearch } from "@/hooks/useReports";
import type { Report } from "@/types";

interface ProjectOption {
  id: string;
  name: string;
}

export default function ReportsHome() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [projectId, setProjectId] = useState<string | "all">("all");

  useEffect(() => {
    document.title = "Reports";
  }, []);

  const projectsQuery = useQuery<ProjectOption[]>({
    queryKey: ["projects", "options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .order("name", { ascending: true });
      if (error) {
        console.error("Failed to load projects", error);
        throw error;
      }
      return data ?? [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const reportsQuery = useReports({ projectId: projectId === "all" ? undefined : projectId });

  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    projectsQuery.data?.forEach((project) => {
      map.set(project.id, project.name);
    });
    return map;
  }, [projectsQuery.data]);

  const projectFilteredReports = useMemo(() => {
    if (!reportsQuery.data) {
      return undefined;
    }
    if (projectId === "all") {
      return reportsQuery.data;
    }
    return reportsQuery.data.filter((report) => report.project_id === projectId);
  }, [projectId, reportsQuery.data]);

  const filteredReports = useReportSearch(projectFilteredReports, search);

  const handleCreate = () => {
    navigate("/reports/new");
  };

  const handleRowClick = (report: Report) => {
    navigate(`/reports/${report.id}`);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Track key metrics across projects and teams.
          </p>
        </div>
        <Button onClick={handleCreate}>New report</Button>
      </div>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Filters</CardTitle>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              placeholder="Search reports"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full sm:w-64"
            />
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                {projectsQuery.data?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {reportsQuery.isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Loading reports...
            </div>
          ) : reportsQuery.isError ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="text-sm text-destructive">
                We could not load reports.
              </p>
              <Button variant="outline" size="sm" onClick={() => reportsQuery.refetch()}>
                Try again
              </Button>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No reports yet. Create your first report to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden sm:table-cell">Project</TableHead>
                  <TableHead className="hidden md:table-cell">Updated</TableHead>
                  <TableHead className="hidden lg:table-cell">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.map((report) => (
                  <TableRow
                    key={report.id}
                    onClick={() => handleRowClick(report)}
                    className="cursor-pointer hover:bg-muted/60"
                  >
                    <TableCell className="font-medium">{report.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {report.project_id ? projectMap.get(report.project_id) ?? report.project_id : "All"}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {report.updated_at
                        ? formatDistanceToNow(new Date(report.updated_at), { addSuffix: true })
                        : ""}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                      {report.description ?? ""}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
