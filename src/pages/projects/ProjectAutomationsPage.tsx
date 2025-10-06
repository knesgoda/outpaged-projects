import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAutomationsList, useCreateAutomation, useDeleteAutomation } from "@/hooks/useAutomations";
import { useProjectSummary } from "@/hooks/useProjectOptions";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useToast } from "@/hooks/use-toast";
import { AutomationForm, type AutomationFormValues } from "@/pages/automations/AutomationForm";

const formatType = (value: string) => value.replace(/_/g, " ");

export default function ProjectAutomationsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [isCreateOpen, setCreateOpen] = useState(false);

  const {
    data: project,
    isLoading: loadingProject,
    error: projectError,
  } = useProjectSummary(projectId);

  const projectLabel = project?.name ?? projectId ?? "Project";
  useDocumentTitle(`Projects / ${projectLabel} / Automations`);

  const {
    data: automations = [],
    isLoading,
    isFetching,
    isError,
    error,
  } = useAutomationsList({ projectId: projectId ?? undefined, enabled: Boolean(projectId) });

  const createAutomation = useCreateAutomation();
  const deleteAutomation = useDeleteAutomation();

  const filteredAutomations = useMemo(() => {
    const term = search.trim().toLowerCase();
    const items = [...automations].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    if (!term) {
      return items;
    }
    return items.filter((automation) => {
      const haystack = `${automation.name} ${automation.trigger_type} ${automation.action_type}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [automations, search]);

  const handleCreate = async (values: AutomationFormValues) => {
    if (!projectId) return;
    try {
      const automation = await createAutomation.mutateAsync({
        name: values.name,
        enabled: values.enabled,
        project_id: projectId,
        trigger_type: values.trigger_type,
        trigger_config: values.trigger_config,
        action_type: values.action_type,
        action_config: values.action_config,
      });
      setCreateOpen(false);
      setSearch("");
      navigate(`/automations/${automation.id}`);
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : "Unable to create automation.";
      toast({ title: "Create failed", description: message, variant: "destructive" });
    }
  };

  const handleDelete = async (automationId: string) => {
    const confirmed = window.confirm("Delete this automation?");
    if (!confirmed) {
      return;
    }

    try {
      await deleteAutomation.mutateAsync(automationId);
    } catch (deleteError) {
      const message =
        deleteError instanceof Error ? deleteError.message : "Unable to delete automation.";
      toast({ title: "Delete failed", description: message, variant: "destructive" });
    }
  };

  if (!projectId) {
    return (
      <section className="space-y-4 p-6">
        <p className="text-sm text-muted-foreground">Project id missing from route.</p>
      </section>
    );
  }

  if (loadingProject) {
    return (
      <section className="space-y-4 p-6">
        <Skeleton className="h-7 w-60" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-48 w-full" />
      </section>
    );
  }

  const projectErrorMessage = projectError instanceof Error ? projectError.message : null;

  if (isError) {
    const message = error instanceof Error ? error.message : "Unable to load automations.";
    const denied = /permission|denied|not\s+authorized/i.test(message);
    return (
      <section className="space-y-4 p-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/projects">Projects</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>{projectLabel}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <p className={`text-sm ${denied ? "text-muted-foreground" : "text-destructive"}`}>
          {denied ? "You do not have access to this project's automations." : message}
        </p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="space-y-4 p-6">
        <Skeleton className="h-7 w-60" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-48 w-full" />
      </section>
    );
  }

  if (!filteredAutomations.length) {
    return (
      <section className="space-y-6 p-6">
        <div className="space-y-2">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/projects">Projects</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to={`/projects/${projectId}/overview`}>{projectLabel}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbPage>Automations</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <header className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Automations</h1>
              <p className="text-sm text-muted-foreground">
                Build rules for {projectLabel} to keep work flowing.
              </p>
            </div>
            <Button onClick={() => setCreateOpen(true)}>New automation</Button>
          </header>
          {projectErrorMessage ? (
            <p className="text-xs text-muted-foreground">{projectErrorMessage}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search automations"
            className="w-full max-w-sm"
          />
        </div>
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          No automations yet. Create one to start automating tasks.
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New automation</DialogTitle>
              <DialogDescription>
                Automations run for {projectLabel} when the trigger matches.
              </DialogDescription>
            </DialogHeader>
            <AutomationForm
              onSubmit={handleCreate}
              isSubmitting={createAutomation.isPending}
              hideProjectSelect
              defaultProjectId={projectId}
            />
          </DialogContent>
        </Dialog>
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
                <Link to="/projects">Projects</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/projects/${projectId}/overview`}>{projectLabel}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem>
              <BreadcrumbPage>Automations</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Automations</h1>
            <p className="text-sm text-muted-foreground">
              Manage rules scoped to {projectLabel}.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>New automation</Button>
        </header>
        {projectErrorMessage ? (
          <p className="text-xs text-muted-foreground">{projectErrorMessage}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search automations"
          className="w-full max-w-sm"
        />
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Name</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAutomations.map((automation) => (
              <TableRow key={automation.id} className="align-top">
                <TableCell>
                  <div className="space-y-1">
                    <Link to={`/automations/${automation.id}`} className="font-medium hover:underline">
                      {automation.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">ID: {automation.id.slice(0, 8)}</p>
                  </div>
                </TableCell>
                <TableCell>{formatType(automation.trigger_type)}</TableCell>
                <TableCell>{formatType(automation.action_type)}</TableCell>
                <TableCell>
                  <Badge variant={automation.enabled ? "default" : "outline"}>
                    {automation.enabled ? "Enabled" : "Disabled"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(automation.updated_at), { addSuffix: true })}
                  <div className="mt-2 flex justify-end gap-2 text-xs">
                    <Button asChild variant="link" size="sm" className="h-auto p-0">
                      <Link to={`/automations/${automation.id}`}>View</Link>
                    </Button>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-destructive"
                      onClick={() => handleDelete(automation.id)}
                      disabled={deleteAutomation.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {isFetching ? <p className="text-xs text-muted-foreground">Refreshing…</p> : null}

      <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New automation</DialogTitle>
            <DialogDescription>
              Automations run for {projectLabel} when the trigger matches.
            </DialogDescription>
          </DialogHeader>
          <AutomationForm
            onSubmit={handleCreate}
            isSubmitting={createAutomation.isPending}
            hideProjectSelect
            defaultProjectId={projectId}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
