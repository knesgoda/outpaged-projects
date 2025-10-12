// @ts-nocheck
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
import { Skeleton } from "@/components/ui/skeleton";
import { useAutomation, useAutomationRuns, useDeleteAutomation, useEnqueueAutomationTest, useUpdateAutomation } from "@/hooks/useAutomations";
import { useProjectOptions } from "@/hooks/useProjectOptions";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useToast } from "@/hooks/use-toast";
import {
  AutomationDesigner,
  automationToDesignerState,
  designerStateToPayload,
  type AutomationDesignerState,
} from "@/components/automation/AutomationDesigner";

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

  const designerState = useMemo(() => {
    return automationToDesignerState(automation, { defaultProjectId: automation?.project_id ?? null });
  }, [automation]);

  const handleDesignerSubmit = async (state: AutomationDesignerState) => {
    if (!automationId) return;
    const payload = designerStateToPayload(state);
    await updateAutomation.mutateAsync({
      name: payload.name,
      description: payload.description ?? null,
      enabled: payload.enabled,
      project_id: payload.project_id ?? null,
      trigger_type: payload.trigger_type,
      trigger_config: payload.trigger_config,
      action_type: payload.action_type,
      action_config: payload.action_config,
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
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{automation.name}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span>Scoped to: {projectLabel}</span>
            <span>
              Updated {formatDistanceToNow(new Date(automation.updated_at), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>

      {runsError ? (
        <p className="text-sm text-destructive">Unable to load runs.</p>
      ) : null}

      <AutomationDesigner
        initialState={designerState}
        onSubmit={handleDesignerSubmit}
        onTest={automation.enabled ? handleTestRun : undefined}
        projectOptions={projectOptions}
        runs={runsLoading ? [] : runs}
        isSubmitting={updateAutomation.isPending}
        isTesting={testRun.isPending}
        submitLabel="Save changes"
        headerActions={
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteAutomation.isPending}
          >
            Delete
          </Button>
        }
      />
    </section>
  );
}
