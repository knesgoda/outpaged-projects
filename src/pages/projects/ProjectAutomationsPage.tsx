import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAutomations, useEnqueueTestRun } from "@/hooks/useAutomations";
import { useProjectsLite } from "@/hooks/useProjectsLite";
import { setBreadcrumbLabel } from "@/state/breadcrumbs";
import type { Automation } from "@/types";
import { Loader2, Play, Plus } from "lucide-react";

export default function ProjectAutomationsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId ?? "";
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { data: projects = [] } = useProjectsLite();
  const { data: automations = [], isLoading, isError } = useAutomations(projectId || undefined);
  const enqueueTestRun = useEnqueueTestRun();

  const projectName = useMemo(() => {
    return projects.find((project) => project.id === projectId)?.name ?? projectId;
  }, [projects, projectId]);

  useEffect(() => {
    document.title = `Projects / ${projectName} / Automations`;
  }, [projectName]);

  useEffect(() => {
    if (projectId) {
      const path = `/projects/${projectId}`;
      setBreadcrumbLabel(path, projectName);
      return () => setBreadcrumbLabel(path, null);
    }
  }, [projectId, projectName]);

  const filteredAutomations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return automations;
    return automations.filter((automation) => {
      const source = `${automation.name} ${automation.trigger_type} ${automation.action_type}`.toLowerCase();
      return source.includes(term);
    });
  }, [automations, search]);

  if (!projectId) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Project not found</AlertTitle>
        <AlertDescription>The project id is missing from the URL.</AlertDescription>
      </Alert>
    );
  }

  const handleTestRun = async (automation: Automation) => {
    await enqueueTestRun.mutateAsync(automation.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Automations</h1>
          <p className="text-muted-foreground">{projectName}</p>
        </div>
        <Button
          className="gap-2"
          onClick={() => navigate(`/automations/new?projectId=${projectId}`)}
        >
          <Plus className="h-4 w-4" />
          New automation
        </Button>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <Input
          placeholder="Search automations"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="md:w-80"
        />
      </div>

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Could not load automations</AlertTitle>
          <AlertDescription>Try refreshing the page.</AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && filteredAutomations.length === 0 && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>No automations yet</CardTitle>
            <CardDescription>
              Create rules to automate work inside this project.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(`/automations/new?projectId=${projectId}`)}>
              Create automation
            </Button>
          </CardContent>
        </Card>
      )}

      {filteredAutomations.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredAutomations.map((automation) => (
            <Card key={automation.id} className="flex flex-col justify-between transition hover:shadow-md">
              <CardHeader onClick={() => navigate(`/automations/${automation.id}`)} className="cursor-pointer">
                <CardTitle className="flex items-center gap-2">
                  {automation.name}
                  <Badge variant={automation.enabled ? "default" : "outline"}>
                    {automation.enabled ? "Enabled" : "Paused"}
                  </Badge>
                </CardTitle>
                <CardDescription className="space-y-1">
                  <div>
                    Trigger: <span className="font-medium">{automation.trigger_type.replace(/_/g, " ")}</span>
                  </div>
                  <div>
                    Action: <span className="font-medium">{automation.action_type.replace(/_/g, " ")}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Updated {formatDistanceToNow(new Date(automation.updated_at), { addSuffix: true })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => handleTestRun(automation)}
                  disabled={enqueueTestRun.isPending || !automation.enabled}
                >
                  {enqueueTestRun.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  Test
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
