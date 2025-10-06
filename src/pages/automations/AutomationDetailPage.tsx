import { useEffect, useMemo } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAutomation,
  useAutomationRuns,
  useCreateAutomation,
  useDeleteAutomation,
  useEnqueueTestRun,
  useUpdateAutomation,
} from "@/hooks/useAutomations";
import { useProjectsLite } from "@/hooks/useProjectsLite";
import { AutomationForm } from "@/pages/automations/AutomationForm";
import type { Automation } from "@/types";
import { setBreadcrumbLabel } from "@/state/breadcrumbs";
import { Loader2, Play, Trash2 } from "lucide-react";

type AutomationFormValues = {
  name: string;
  enabled: boolean;
  trigger_type: Automation["trigger_type"];
  trigger_config: Record<string, any>;
  action_type: Automation["action_type"];
  action_config: Record<string, any>;
  project_id?: string | null;
};

export default function AutomationDetailPage() {
  const params = useParams<{ automationId?: string }>();
  const [searchParams] = useSearchParams();
  const routeId = params.automationId;
  const isNew = !routeId || routeId === "new";
  const automationId = routeId ?? "";
  const navigate = useNavigate();

  const defaultProjectId = searchParams.get("projectId");
  const { data: projects = [] } = useProjectsLite();
  const { data: automation, isLoading, isError } = useAutomation(isNew ? undefined : automationId);
  const { data: runs = [], isLoading: runsLoading } = useAutomationRuns(isNew ? undefined : automationId);

  const createMutation = useCreateAutomation();
  const updateMutation = useUpdateAutomation(isNew ? null : automationId);
  const deleteMutation = useDeleteAutomation();
  const enqueueTestRun = useEnqueueTestRun();

  useEffect(() => {
    if (isNew) {
      document.title = "Automations / New";
    } else if (automation?.name) {
      document.title = `Automations / ${automation.name}`;
    } else {
      document.title = "Automations";
    }
  }, [automation?.name, isNew]);

  useEffect(() => {
    if (!isNew && automation?.id && automation.name) {
      const path = `/automations/${automation.id}`;
      setBreadcrumbLabel(path, automation.name);
      return () => setBreadcrumbLabel(path, null);
    }
  }, [automation?.id, automation?.name, isNew]);

  const handleCreate = async (payload: AutomationFormValues) => {
    const created = await createMutation.mutateAsync({
      name: payload.name,
      enabled: payload.enabled,
      trigger_type: payload.trigger_type,
      trigger_config: payload.trigger_config,
      action_type: payload.action_type,
      action_config: payload.action_config,
      project_id: payload.project_id ?? null,
    });
    navigate(`/automations/${created.id}`);
  };

  const handleUpdate = async (payload: AutomationFormValues) => {
    const { project_id: _projectId, ...rest } = payload;
    await updateMutation.mutateAsync(rest);
  };

  const handleDelete = async () => {
    if (!automation) return;
    await deleteMutation.mutateAsync(automation.id);
    navigate("/automations");
  };

  const handleSubmit = async (payload: AutomationFormValues) => {
    if (isNew) {
      await handleCreate(payload);
    } else {
      await handleUpdate(payload);
    }
  };

  const handleTestRun = async () => {
    if (!automation) return;
    await enqueueTestRun.mutateAsync(automation.id);
  };

  if (!isNew && isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!isNew && isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load automation</AlertTitle>
        <AlertDescription>Try refreshing the page.</AlertDescription>
      </Alert>
    );
  }

  const current = automation ?? ({} as Automation);
  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((project) => {
      map.set(project.id, project.name ?? "Untitled project");
    });
    return map;
  }, [projects]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {isNew ? "New automation" : current.name}
          </h1>
          <p className="text-muted-foreground">
            {isNew
              ? "Configure triggers and actions to automate work."
              : `Updated ${formatDistanceToNow(new Date(current.updated_at ?? new Date().toISOString()), {
                  addSuffix: true,
                })}`}
          </p>
        </div>
        {!isNew && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleTestRun}
              disabled={enqueueTestRun.isPending || !current.enabled}
            >
              {enqueueTestRun.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Test run
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {!isNew && (
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <Badge variant={current.enabled ? "default" : "outline"}>
                  {current.enabled ? "Enabled" : "Paused"}
                </Badge>
                <span>Trigger: {current.trigger_type?.replace(/_/g, " ")}</span>
                <span>Action: {current.action_type?.replace(/_/g, " ")}</span>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div>
              Project: {projectMap.get(current.project_id ?? "") ?? "Workspace"}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{isNew ? "Create automation" : "Edit automation"}</CardTitle>
        </CardHeader>
        <CardContent>
          <AutomationForm
            initialValue={isNew ? undefined : current}
            projectOptions={projects}
            defaultProjectId={defaultProjectId}
            lockProject={!isNew || Boolean(defaultProjectId)}
            submitLabel={isNew ? "Create" : "Save"}
            isSubmitting={isNew ? createMutation.isPending : updateMutation.isPending}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/automations")}
          />
        </CardContent>
      </Card>

      {!isNew && (
        <Card>
          <CardHeader>
            <CardTitle>Recent test runs</CardTitle>
          </CardHeader>
          <CardContent>
            {runsLoading ? (
              <Skeleton className="h-24" />
            ) : runs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No test runs yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Timestamp</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>
                        <Badge variant={run.status === "success" ? "default" : "destructive"}>
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{run.message ?? ""}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
