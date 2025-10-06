import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
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
import { useProjectOptions } from "@/hooks/useProjectOptions";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useToast } from "@/hooks/use-toast";
import type { Automation } from "@/types";
import { AutomationForm, type AutomationFormValues } from "./AutomationForm";

const formatType = (value: string) => value.replace(/_/g, " ");

const sortAutomations = (items: Automation[]) =>
  [...items].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

export default function AutomationsPage() {
  useDocumentTitle("Automations");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState<string | "all">("all");
  const [isCreateOpen, setCreateOpen] = useState(false);

  const {
    data: automations = [],
    isLoading,
    isFetching,
    isError,
    error,
  } = useAutomationsList({ projectId: projectFilter === "all" ? undefined : projectFilter });
  const {
    data: projectOptions = [],
    isLoading: loadingProjects,
  } = useProjectOptions(true);
  const createAutomation = useCreateAutomation();
  const deleteAutomation = useDeleteAutomation();

  const projectNames = useMemo(() => {
    const map = new Map<string, string>();
    projectOptions.forEach((project) => {
      if (project?.id) {
        map.set(project.id, project.name ?? project.id);
      }
    });
    return map;
  }, [projectOptions]);

  const filteredAutomations = useMemo(() => {
    const term = search.trim().toLowerCase();
    const scoped = sortAutomations(automations);
    if (!term) {
      return scoped;
    }
    return scoped.filter((automation) => {
      const haystack = `${automation.name} ${automation.trigger_type} ${automation.action_type}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [automations, search]);

  const handleCreate = async (values: AutomationFormValues) => {
    try {
      const automation = await createAutomation.mutateAsync({
        name: values.name,
        enabled: values.enabled,
        project_id: values.project_id ?? null,
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

  if (isLoading) {
    return (
      <section className="space-y-6 p-6">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-10 w-full" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full" />
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    const message = error instanceof Error ? error.message : "Unable to load automations.";
    return (
      <section className="space-y-4 p-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>Automations</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <p className="text-sm text-destructive">{message}</p>
      </section>
    );
  }

  if (!filteredAutomations.length) {
    return (
      <section className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Automations</h1>
          <p className="text-muted-foreground">Create rules to orchestrate your workflows.</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search automations"
            className="w-56"
          />
          <Button onClick={() => setCreateOpen(true)}>New automation</Button>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New automation</DialogTitle>
              <DialogDescription>
                Define a trigger and action. Runs immediately when criteria match.
              </DialogDescription>
            </DialogHeader>
            <AutomationForm
              onSubmit={handleCreate}
              isSubmitting={createAutomation.isPending}
              projectOptions={projectOptions}
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
              <BreadcrumbPage>Automations</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Automations</h1>
            <p className="text-sm text-muted-foreground">
              Manage automation rules across every project you can access.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>New automation</Button>
        </header>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search automations"
          className="w-full max-w-xs"
        />
        <Select value={projectFilter} onValueChange={(value) => setProjectFilter(value)}>
          <SelectTrigger className="w-full max-w-[220px]">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projectOptions.map((project) => (
              <SelectItem key={project.id} value={project.id} disabled={loadingProjects}>
                {project.name ?? project.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Name</TableHead>
              <TableHead>Project</TableHead>
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
                    <p className="text-xs text-muted-foreground">
                      ID: {automation.id.slice(0, 8)}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {automation.project_id ? projectNames.get(automation.project_id) ?? automation.project_id : "All projects"}
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
              Choose trigger and action to automate routine work.
            </DialogDescription>
          </DialogHeader>
          <AutomationForm
            onSubmit={handleCreate}
            isSubmitting={createAutomation.isPending}
            projectOptions={projectOptions}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
}
