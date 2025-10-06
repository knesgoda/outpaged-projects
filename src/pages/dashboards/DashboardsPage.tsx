import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageTemplate } from "../ia/PageTemplate";
import { useDashboards, useDashboardMutations } from "@/hooks/useDashboards";
import { listProjects } from "@/services/projects";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";

export default function DashboardsPage() {
  const navigate = useNavigate();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [projectId, setProjectId] = useState<string | "all">("all");

  useEffect(() => {
    document.title = "Dashboards • Outpaged";
  }, []);

  const dashboardsQuery = useDashboards();
  const { createDashboard, deleteDashboard, creating } = useDashboardMutations();
  const projectsQuery = useQuery({
    queryKey: ["projects", "options"],
    queryFn: listProjects,
    staleTime: 1000 * 60 * 5,
  });

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createDashboard({
      name: name.trim(),
      projectId: projectId === "all" ? null : projectId,
      layout: {},
    });
    setName("");
    setProjectId("all");
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteDashboard(id);
  };

  const projectLookup = new Map(projectsQuery.data?.map((project) => [project.id, project.name]));

  return (
    <PageTemplate
      title="Dashboards"
      description="Build curated dashboards with real-time metrics for leadership."
      featureFlag="dashboards"
    >
      <div className="mb-6 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {dashboardsQuery.data?.length ?? 0} dashboard(s)
        </div>
        <Button onClick={() => setDialogOpen(true)}>New dashboard</Button>
      </div>

      {dashboardsQuery.isError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTitle>Unable to load dashboards</AlertTitle>
          <AlertDescription>Check your connection and try again.</AlertDescription>
        </Alert>
      )}

      {dashboardsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="h-36 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : (dashboardsQuery.data ?? []).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <h2 className="text-xl font-semibold">No dashboards yet</h2>
            <p className="text-sm text-muted-foreground">Create a dashboard to track key metrics.</p>
            <Button onClick={() => setDialogOpen(true)}>New dashboard</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(dashboardsQuery.data ?? []).map((dashboard) => (
            <Card
              key={dashboard.id}
              className="cursor-pointer transition hover:border-primary"
              onClick={() => navigate(`/dashboards/${dashboard.id}`)}
            >
              <CardHeader className="flex flex-row items-start justify-between">
                <CardTitle className="text-lg">{dashboard.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDelete(dashboard.id);
                  }}
                >
                  Delete
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Created {format(new Date(dashboard.created_at), "MMM d, yyyy")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">
                    {dashboard.project_id
                      ? projectLookup.get(dashboard.project_id) ?? "Project"
                      : "Workspace"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New dashboard</DialogTitle>
            <DialogDescription>Give your dashboard a name and optional project scope.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="dashboard-name">Name</Label>
              <Input
                id="dashboard-name"
                placeholder="Executive overview"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dashboard-project">Project</Label>
              <Select
                value={projectId}
                onValueChange={(value) => setProjectId(value as typeof projectId)}
              >
                <SelectTrigger id="dashboard-project">
                  <SelectValue placeholder="Workspace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Workspace</SelectItem>
                  {(projectsQuery.data ?? []).map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || !name.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTemplate>
  );
}
