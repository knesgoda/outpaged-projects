import { useCallback, useMemo } from "react";
import type { ComponentType, SVGProps } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  AlertTriangle,
  Archive,
  BarChart3,
  BookOpen,
  CalendarClock,
  Flag,
  Folder,
  GitBranch,
  Inbox,
  LayoutDashboard,
  LayoutList,
  ListTodo,
  Settings,
  Sparkles,
  ArchiveRestore,
} from "lucide-react";

import { Helmet } from "react-helmet-async";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ProjectStatus,
  useArchiveProject,
  useDeleteProject,
  useProject,
  useUpdateProject,
} from "@/hooks/useProjects";
import { useToast } from "@/hooks/use-toast";
import { formatProjectStatus, getProjectStatusBadgeVariant } from "@/utils/project-status";

interface ProjectDetailPageProps {
  tab?: string;
}

interface ProjectTab {
  value: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  description: string;
}

const tabs: ProjectTab[] = [
  { value: "overview", label: "Overview", icon: LayoutList, description: "High-level summary and status." },
  { value: "list", label: "List", icon: ListTodo, description: "Plan work in a sortable list." },
  { value: "board", label: "Board", icon: LayoutDashboard, description: "Track progress on the board." },
  { value: "backlog", label: "Backlog", icon: Inbox, description: "Review and triage incoming work." },
  { value: "sprints", label: "Sprints", icon: Flag, description: "Run agile cycles with clarity." },
  { value: "calendar", label: "Calendar", icon: CalendarClock, description: "See key dates at a glance." },
  { value: "timeline", label: "Timeline", icon: GitBranch, description: "Understand sequencing and dependencies." },
  { value: "dependencies", label: "Dependencies", icon: AlertTriangle, description: "Map blockers between projects." },
  { value: "reports", label: "Reports", icon: BarChart3, description: "Measure delivery and velocity." },
  { value: "docs", label: "Docs", icon: BookOpen, description: "Document context for teammates." },
  { value: "files", label: "Files", icon: Folder, description: "Collect project files in one place." },
  { value: "automations", label: "Automations", icon: Sparkles, description: "Automate recurring steps." },
  { value: "settings", label: "Settings", icon: Settings, description: "Fine tune roles and preferences." },
];

export function ProjectDetailPage({ tab = "overview" }: ProjectDetailPageProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const activeTab = tabs.some(entry => entry.value === tab) ? tab : "overview";

  const { data: project, isLoading, isError, error, refetch } = useProject(projectId);
  const archiveMutation = useArchiveProject();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();

  const isOwner = true; // TODO: restrict destructive actions to the project owner when memberships are available.
  const currentTab = tabs.find(entry => entry.value === activeTab) ?? tabs[0];
  const projectLabel = project?.name ?? projectId ?? "Project";
  const pageTitle = `Projects - ${projectLabel} - ${currentTab.label}`;

  const renderBreadcrumbForState = (
    finalLabel: string,
    options: { linkProject?: boolean; hideProject?: boolean } = {},
  ) => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/projects">Projects</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {options.hideProject || !projectId ? null : (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {options.linkProject ? (
                <BreadcrumbLink asChild>
                  <Link to={`/projects/${projectId}`}>{projectLabel}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{projectLabel}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        )}
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{finalLabel}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );

  const handleNavigateToTab = useCallback(
    (nextTab: string) => {
      if (!projectId) return;
      const base = `/projects/${projectId}`;
      const path = nextTab === "overview" ? base : `${base}/${nextTab}`;
      if (location.pathname !== path) {
        navigate(path);
      }
    },
    [location.pathname, navigate, projectId],
  );

  const handleArchive = async () => {
    if (!projectId) return;
    try {
      if (project?.status === "archived") {
        await updateMutation.mutateAsync({ id: projectId, patch: { status: "active" } });
        toast({ title: "Project restored" });
      } else {
        await archiveMutation.mutateAsync({ id: projectId });
        toast({ title: "Project archived" });
      }
    } catch (exception) {
      console.error(exception);
      toast({
        title: "Action failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!projectId) return;
    const confirmDelete = window.confirm("Delete this project? This cannot be undone.");
    if (!confirmDelete) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id: projectId });
      toast({ title: "Project deleted" });
      navigate("/projects");
    } catch (exception) {
      console.error(exception);
      toast({
        title: "Could not delete",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const headerContent = useMemo(() => {
    if (!project) {
      return null;
    }

    const updatedDate = project.updated_at ? new Date(project.updated_at) : null;
    const isValidDate = updatedDate && !Number.isNaN(updatedDate.getTime());
    const lastUpdatedLabel = isValidDate
      ? formatDistanceToNow(updatedDate, { addSuffix: true })
      : "Unknown";

    return (
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
            <Badge variant={getProjectStatusBadgeVariant(project.status)}>
              {formatProjectStatus(project.status)}
            </Badge>
          </div>
          {project.description ? (
            <p className="max-w-3xl text-muted-foreground">{project.description}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">Last updated {lastUpdatedLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/projects/${projectId}/settings`)}
            disabled={!projectId}
          >
            <Settings className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={handleArchive}
            disabled={archiveMutation.isPending || updateMutation.isPending}
          >
            {project.status === "archived" ? (
              <>
                <ArchiveRestore className="mr-2 h-4 w-4" />
                Unarchive
              </>
            ) : (
              <>
                <Archive className="mr-2 h-4 w-4" />
                Archive
              </>
            )}
          </Button>
          {isOwner ? (
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Delete
            </Button>
          ) : null}
        </div>
      </div>
    );
  }, [archiveMutation.isPending, deleteMutation.isPending, navigate, project, projectId, updateMutation.isPending, isOwner]);

  if (!projectId) {
    const title = "Projects - Not found";
    return (
      <div className="space-y-6 p-6">
        <Helmet>
          <title>{title}</title>
        </Helmet>
        {renderBreadcrumbForState("Not found", { hideProject: true })}
        <Alert>
          <AlertTitle>Project not found</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>The requested project is missing.</span>
            <Button variant="outline" onClick={() => navigate("/projects")}>Go to projects</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    const title = projectId ? `Projects - ${projectId}` : "Projects";
    return (
      <div className="space-y-6 p-6">
        <Helmet>
          <title>{title}</title>
        </Helmet>
        {renderBreadcrumbForState(currentTab.label)}
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (isError) {
    const title = `Projects - ${projectLabel} - Error`;
    return (
      <div className="space-y-6 p-6">
        <Helmet>
          <title>{title}</title>
        </Helmet>
        {renderBreadcrumbForState("Error", { linkProject: Boolean(projectId) })}
        <Alert variant="destructive">
          <AlertTitle>We hit a snag</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error instanceof Error ? error.message : "The project failed to load."}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!project) {
    const title = "Projects - Not found";
    return (
      <div className="space-y-6 p-6">
        <Helmet>
          <title>{title}</title>
        </Helmet>
        {renderBreadcrumbForState("Not found", { linkProject: Boolean(projectId) })}
        <Alert>
          <AlertTitle>Project not found</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>This project does not exist.</span>
            <Button variant="outline" onClick={() => navigate("/projects")}>Go to projects</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      {renderBreadcrumbForState(currentTab.label, { linkProject: true })}
      {headerContent}

      <Tabs value={activeTab} onValueChange={handleNavigateToTab} className="space-y-4">
        <TabsList className="flex w-full flex-wrap justify-start gap-1 bg-muted p-1">
          {tabs.map(entry => (
            <TabsTrigger key={entry.value} value={entry.value} className="flex items-center gap-2">
              <entry.icon className="h-4 w-4" />
              {entry.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map(entry => (
          <TabsContent key={entry.value} value={entry.value} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{entry.label}</CardTitle>
                <CardDescription>{entry.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  TODO: Build the full {entry.label.toLowerCase()} experience.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
