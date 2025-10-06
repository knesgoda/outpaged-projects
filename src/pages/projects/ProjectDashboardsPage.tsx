import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useDashboards, useDashboardMutations } from "@/hooks/useDashboards";
import { getProject } from "@/services/projects";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export default function ProjectDashboardsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const dashboardsQuery = useDashboards(projectId);
  const { createDashboard, deleteDashboard, creating } = useDashboardMutations();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");

  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => (projectId ? getProject(projectId) : Promise.resolve(null)),
    enabled: Boolean(projectId),
    staleTime: 1000 * 60 * 5,
  });

  const projectName = projectQuery.data?.name ?? projectId ?? "Project";

  useEffect(() => {
    document.title = `${projectName} • Dashboards`;
  }, [projectName]);

  const handleCreate = async () => {
    if (!projectId || !name.trim()) return;
    await createDashboard({ name: name.trim(), projectId });
    setName("");
    setDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    await deleteDashboard(id);
  };

  const dashboards = useMemo(() => dashboardsQuery.data ?? [], [dashboardsQuery.data]);

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Dashboards</h1>
            <p className="text-muted-foreground">Insights scoped to {projectName}.</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>New dashboard</Button>
        </div>
        <Badge variant="outline">Project</Badge>
      </header>

      {dashboardsQuery.isError && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load dashboards</AlertTitle>
          <AlertDescription>Refresh to try again.</AlertDescription>
        </Alert>
      )}

      {dashboardsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="h-36 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : dashboards.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <h2 className="text-xl font-semibold">No dashboards yet</h2>
            <p className="text-sm text-muted-foreground">Create the first dashboard for {projectName}.</p>
            <Button onClick={() => setDialogOpen(true)}>New dashboard</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {dashboards.map((dashboard) => (
            <Card
              key={dashboard.id}
              className="cursor-pointer transition hover:border-primary"
              onClick={() => navigate(`/projects/${projectId}/dashboards/${dashboard.id}`)}
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
                <p>Created {format(new Date(dashboard.created_at), "MMM d, yyyy")}</p>
                <Badge variant="outline">{projectName}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Executive overview"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
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
    </section>
  );
}
