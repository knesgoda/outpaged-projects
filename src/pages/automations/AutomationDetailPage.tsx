import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAutomation, useAutomationRuns, useDeleteAutomation, useEnqueueAutomationTest, useUpdateAutomation } from "@/hooks/useAutomations";
import { useProjectOptions } from "@/hooks/useProjectOptions";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useToast } from "@/hooks/use-toast";
import { AutomationForm, type AutomationFormValues } from "./AutomationForm";

export default function AutomationDetailPage() {
  const { automationId } = useParams<{ automationId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: automation, isLoading, isError, error } = useAutomation(automationId);
  const updateAutomation = useUpdateAutomation(automationId ?? "");
  const deleteAutomation = useDeleteAutomation();
  const testRun = useEnqueueAutomationTest();
  const { data: runs = [], isLoading: runsLoading, error: runsError } = useAutomationRuns(automationId);
  const { data: projectOptions = [] } = useProjectOptions(true);

  const projectNames = useMemo(() => {
    const map = new Map<string, string>();
    projectOptions.forEach((project) => {
      if (project?.id) {
        map.set(project.id, project.name ?? project.id);
      }
    });
    return map;
  }, [projectOptions]);

  const projectLabel = automation?.project_id
    ? projectNames.get(automation.project_id) ?? automation.project_id
    : "All projects";

  useDocumentTitle(automation ? `Automations / ${automation.name}` : "Automations");

  const handleSubmit = async (values: AutomationFormValues) => {
    if (!automationId) return;
    await updateAutomation.mutateAsync({
      name: values.name,
      enabled: values.enabled,
      project_id: values.project_id ?? null,
      trigger_type: values.trigger_type,
      trigger_config: values.trigger_config,
      action_type: values.action_type,
      action_config: values.action_config,
    });
  };

  const handleDelete = async () => {
    if (!automationId) return;
    const confirmed = window.confirm("Delete this automation?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteAutomation.mutateAsync(automationId);
      navigate("/automations");
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Unable to delete automation.";
      toast({ title: "Delete failed", description: message, variant: "destructive" });
    }
  };

  const handleTestRun = async () => {
    if (!automationId || !automation?.enabled) {
      return;
    }
    try {
      await testRun.mutateAsync(automationId);
    } catch (testError) {
      const message = testError instanceof Error ? testError.message : "Unable to run automation.";
      toast({ title: "Test failed", description: message, variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <section className="space-y-4 p-6">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-96 w-full" />
      </section>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Unable to load automation.";
    return (
      <section className="space-y-4 p-6">
        <p className="text-sm text-destructive">{message}</p>
      </section>
    );
  }

  if (!automation) {
    return (
      <section className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">Automation not found.</p>
        <Button variant="link" onClick={() => navigate("/automations")}>Back to automations</Button>
      </section>
    );
  }

  return (
    <section className="space-y-6 p-6">
      <div className="space-y-2">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/automations">Automations</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>{automation.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">{automation.name}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>Project: {projectLabel}</span>
              <span>
                Updated {formatDistanceToNow(new Date(automation.updated_at), { addSuffix: true })}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={automation.enabled ? "default" : "outline"}>
              {automation.enabled ? "Enabled" : "Disabled"}
            </Badge>
            <Button
              onClick={handleTestRun}
              disabled={!automation.enabled || testRun.isPending}
              variant="secondary"
            >
              {testRun.isPending ? "Testing" : "Test run"}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteAutomation.isPending}>
              Delete
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit automation</CardTitle>
        </CardHeader>
        <CardContent>
          <AutomationForm
            initial={automation}
            onSubmit={handleSubmit}
            isSubmitting={updateAutomation.isPending}
            projectOptions={projectOptions}
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent runs</CardTitle>
        </CardHeader>
        <CardContent>
          {runsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : runsError ? (
            <p className="text-sm text-destructive">Unable to load runs.</p>
          ) : runs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No test runs recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="text-right">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>
                        <Badge variant={run.status === "success" ? "default" : "outline"}>
                          {run.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[420px] truncate text-sm">
                        {run.message ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
