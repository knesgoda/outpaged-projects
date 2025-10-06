import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, Edit3, MoreHorizontal, Trash2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  ProjectStatus,
  ProjectSummary,
  useArchiveProject,
  useDeleteProject,
  useProject,
  useUpdateProject,
} from "@/hooks/useProjects";

import { ProjectFormDialog } from "./ProjectFormDialog";
import { PROJECT_TABS } from "./projectTabs";
import { getProjectStatusLabel, getProjectStatusVariant } from "./status";

function ProjectHeaderSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function ProjectNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border bg-card p-10 text-center">
      <h2 className="text-2xl font-semibold text-foreground">Project not found</h2>
      <p className="text-muted-foreground">We could not find that project. It may have been removed.</p>
      <Button asChild>
        <Link to="/projects">Back to projects</Link>
      </Button>
    </div>
  );
}

function TabNavigation({ projectId }: { projectId: string }) {
  const location = useLocation();
  const basePath = `/projects/${projectId}`;

  return (
    <div className="flex w-full overflow-x-auto border-b">
      <nav className="flex min-w-full gap-4">
        {PROJECT_TABS.map((tab) => {
          const to = `${basePath}/${tab.path}`;
          const isActive =
            location.pathname === to || (tab.path === "overview" && location.pathname === basePath);
          return (
            <NavLink
              key={tab.key}
              to={to}
              className={({ isActive: linkActive }) =>
                [
                  "px-2 py-3 text-sm font-medium transition", 
                  (isActive || linkActive)
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")
              }
              end={tab.path === "overview"}
            >
              {tab.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    data: project,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useProject(projectId);
  const { mutateAsync: archiveProject, isPending: isArchiving } = useArchiveProject();
  const { mutateAsync: updateProject, isPending: isUpdating } = useUpdateProject();
  const { mutateAsync: deleteProject, isPending: isDeleting } = useDeleteProject();

  useEffect(() => {
    const baseTitle = "Projects | Outpaged";

    if (!projectId) {
      document.title = baseTitle;
      return;
    }

    if (isLoading) {
      document.title = "Loading project | " + baseTitle;
      return;
    }

    if (isError) {
      document.title = "Project error | " + baseTitle;
      return;
    }

    const segments = location.pathname.split("/").filter(Boolean);
    const tabSegment = segments[2] ?? "overview";
    const tab = PROJECT_TABS.find((item) => item.path === tabSegment);
    const tabLabel = tab
      ? tab.label
      : tabSegment
          .split("-")
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(" ");

    if (!project) {
      document.title = "Project not found | " + baseTitle;
      return;
    }

    document.title = `${project.name} | ${tabLabel} | ${baseTitle}`;
  }, [isError, isLoading, location.pathname, project, projectId]);

  const statusLabel = project ? getProjectStatusLabel(project.status) : null;
  const updatedLabel = useMemo(() => {
    if (!project?.updated_at) return null;
    return formatDistanceToNow(new Date(project.updated_at), { addSuffix: true });
  }, [project?.updated_at]);

  const handleArchiveToggle = async () => {
    if (!project) return;
    try {
      if (project.status === "archived") {
        await updateProject({ id: project.id, patch: { status: "active" as ProjectStatus } });
        toast({ title: "Project restored" });
      } else {
        await archiveProject({ id: project.id });
        toast({ title: "Project archived" });
      }
      refetch();
    } catch (err) {
      console.error(err);
      toast({
        title: "Action failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    try {
      await deleteProject({ id: project.id });
      toast({ title: "Project deleted" });
      setShowDeleteConfirm(false);
      navigate("/projects");
    } catch (err) {
      console.error(err);
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleDialogSuccess = (id: string) => {
    refetch();
    if (projectId && id !== projectId) {
      navigate(`/projects/${id}`);
    }
  };

  if (!projectId) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Missing project</AlertTitle>
        <AlertDescription>The project identifier was not provided.</AlertDescription>
      </Alert>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ProjectHeaderSkeleton />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Failed to load project</AlertTitle>
        <AlertDescription className="flex items-center gap-2">
          {(error as Error | undefined)?.message ?? "Please try again."}
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!project) {
    return <ProjectNotFound />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="px-2" onClick={() => navigate("/projects")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Badge variant={getProjectStatusVariant(project.status)}>{statusLabel}</Badge>
            </div>
            <h1 className="text-3xl font-semibold text-foreground">{project.name}</h1>
            <p className="text-sm text-muted-foreground">
              {updatedLabel ? `Updated ${updatedLabel}` : "No updates yet"}
              {isFetching && <span className="ml-2 text-xs">Refreshing…</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(true)}>
              <Edit3 className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" onClick={handleArchiveToggle} disabled={isArchiving || isUpdating}>
              {project.status === "archived" ? "Unarchive" : "Archive"}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More project actions">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <TabNavigation projectId={projectId} />
      </div>

      <div className="py-2">
        <Outlet />
      </div>

      <ProjectFormDialog
        open={showEditDialog}
        mode="edit"
        project={project as ProjectSummary}
        onOpenChange={setShowEditDialog}
        onSuccess={handleDialogSuccess}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {project.name}. You cannot undo this action.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
