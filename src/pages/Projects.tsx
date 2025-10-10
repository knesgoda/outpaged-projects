import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, FolderOpen, Users, CheckSquare2, Loader2, Settings, Edit, Trash2 } from "lucide-react";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { useToast } from "@/hooks/use-toast";
import { useProjectNavigation } from "@/hooks/useProjectNavigation";
import { useProjects, useDeleteProject } from "@/hooks/useProjects";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { formatProjectStatus, getProjectStatusBadgeVariant } from "@/utils/project-status";

type Project = {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  created_at: string;
  [key: string]: unknown;
};

interface ProjectCardProps {
  project: Project;
  isMobile: boolean;
  onSelect: (project: Project) => void;
  onOpen: (project: Project) => void;
  onSettings: (project: Project) => void;
  onEdit: (project: Project) => void;
  onDelete: (project: Project) => void;
  getProjectUrl: (project: Project) => string;
  getStatusVariant: (status: string) => string;
  formatStatus: (status: string) => string;
}

interface ProjectActionsProps {
  isMobile: boolean;
  onOpen: () => void;
  onSettings: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const ProjectActions = ({ isMobile, onOpen, onSettings, onEdit, onDelete }: ProjectActionsProps) => {
  if (isMobile) {
    return (
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          Open
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onSettings();
          }}
        >
          Settings
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
        >
          Edit
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
        >
          Delete
        </Button>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          <FolderOpen className="w-4 h-4 mr-2" />
          Open Project
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            onSettings();
          }}
        >
          <Settings className="w-4 h-4 mr-2" />
          Project Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Project
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          className="text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Project
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const ProjectCard = ({
  project,
  isMobile,
  onSelect,
  onOpen,
  onSettings,
  onEdit,
  onDelete,
  getProjectUrl,
  getStatusVariant,
  formatStatus,
}: ProjectCardProps) => {
  return (
    <Card
      className={cn(
        "hover:shadow-soft transition-all cursor-pointer",
        isMobile ? "w-full" : undefined,
      )}
      onClick={() => onSelect(project)}
    >
      <CardHeader className={cn(isMobile ? "p-4 pb-0 space-y-3" : undefined)}>
        <div
          className={cn(
            "flex items-start justify-between",
            isMobile ? "flex-col gap-3" : "gap-3",
          )}
        >
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg text-foreground">
              <Link
                to={getProjectUrl(project)}
                data-testid={`project-link-${project.id}`}
                className="hover:underline"
                onClick={(event) => event.stopPropagation()}
              >
                {project.name}
              </Link>
            </CardTitle>
          </div>
          <ProjectActions
            isMobile={isMobile}
            onOpen={() => onOpen(project)}
            onSettings={() => onSettings(project)}
            onEdit={() => onEdit(project)}
            onDelete={() => onDelete(project)}
          />
        </div>
        <CardDescription className="text-sm">
          {project.description || "No description provided"}
        </CardDescription>
      </CardHeader>
      <CardContent className={cn("space-y-4", isMobile ? "p-4 pt-2" : undefined)}>
        {project.status && (
          <div className="flex items-center">
            <Badge variant={getStatusVariant(project.status)}>
              {formatStatus(project.status)}
            </Badge>
          </div>
        )}

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>1 member</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckSquare2 className="w-4 h-4" />
            <span>0 tasks</span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground border-t pt-2">
          Created {format(new Date(project.created_at), "MMM dd, yyyy")}
        </div>
      </CardContent>
    </Card>
  );
};

interface AddProjectCardProps {
  isMobile: boolean;
  onClick: () => void;
}

const AddProjectCard = ({ isMobile, onClick }: AddProjectCardProps) => (
  <Card
    className={cn(
      "border-dashed border-2 border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer",
      isMobile ? "w-full" : undefined,
    )}
    onClick={onClick}
  >
    <CardContent className={cn("flex items-center justify-center h-full min-h-[200px]", isMobile ? "p-4" : undefined)}>
      <div className="text-center space-y-2">
        <Plus className="w-8 h-8 text-muted-foreground mx-auto" />
        <h3 className="font-medium text-foreground">Create New Project</h3>
        <p className="text-sm text-muted-foreground">Start organizing your work</p>
      </div>
    </CardContent>
  </Card>
);

export default function Projects() {
  const { toast } = useToast();
  const { navigateToProject, navigateToProjectSettings, getProjectUrl } = useProjectNavigation();
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  const { data: projectsData, isLoading, error } = useProjects({ status: "all", sort: "updated_at", dir: "desc" });
  const deleteProjectMutation = useDeleteProject();

  const projects = (projectsData?.data as Project[]) || [];

  const handleProjectSuccess = () => {
    // The query will automatically refetch
  };

  const handleProjectClick = (project: Project) => {
    navigateToProject(project);
  };

  const handleEditProject = (project: Project) => {
    // Placeholder for edit functionality until implemented
    console.log("Edit project:", project.id);
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete "${projectName}"?`)) {
      return;
    }

    try {
      await deleteProjectMutation.mutateAsync({ id: projectId });
      toast({
        title: "Success",
        description: "Project deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    }
  };

  const getStatusVariant = (status: string) => getProjectStatusBadgeVariant(status);

  const formatStatus = (status: string) => formatProjectStatus(status);

  if (isLoading) {
    return (
      <div className="space-y-6 px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground">Manage your projects and track progress</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground">Manage your projects and track progress</p>
          </div>
          <Button
            className="bg-gradient-primary hover:opacity-90 w-full md:w-auto"
            onClick={() => setIsProjectDialogOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </Button>
        </div>
        <Card className="border-destructive/50">
          <CardContent className="flex flex-col items-center justify-center min-h-[200px] space-y-4 py-8">
            <div className="text-center space-y-2">
              <p className="text-destructive font-medium">Failed to load projects</p>
              <p className="text-sm text-muted-foreground">
                {error instanceof Error ? error.message : "An unexpected error occurred"}
              </p>
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="mt-4"
              >
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
        <ProjectDialog 
          open={isProjectDialogOpen}
          onOpenChange={setIsProjectDialogOpen}
          onSuccess={handleProjectSuccess}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 pb-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground">Manage your projects and track progress</p>
        </div>
        <Button
          className="bg-gradient-primary hover:opacity-90 w-full md:w-auto"
          onClick={() => setIsProjectDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <Card className="col-span-full">
          <CardContent className="flex flex-col items-center justify-center min-h-[300px] space-y-4 py-8">
            <FolderOpen className="w-16 h-16 text-muted-foreground/50" />
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-foreground">No projects yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Get started by creating your first project to organize your work and track progress.
              </p>
              <Button
                className="bg-gradient-primary hover:opacity-90 mt-4 w-full sm:w-auto"
                onClick={() => setIsProjectDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Project
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : isMobile ? (
        <div data-testid="projects-mobile-list" className="space-y-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isMobile={isMobile}
              onSelect={handleProjectClick}
              onOpen={navigateToProject}
              onSettings={navigateToProjectSettings}
              onEdit={handleEditProject}
              onDelete={(selected) =>
                handleDeleteProject(selected.id, selected.name)
              }
              getProjectUrl={getProjectUrl}
              getStatusVariant={getStatusVariant}
              formatStatus={formatStatus}
            />
          ))}
          <AddProjectCard isMobile={isMobile} onClick={() => setIsProjectDialogOpen(true)} />
        </div>
      ) : (
        <div data-testid="projects-grid" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isMobile={isMobile}
              onSelect={handleProjectClick}
              onOpen={navigateToProject}
              onSettings={navigateToProjectSettings}
              onEdit={handleEditProject}
              onDelete={(selected) =>
                handleDeleteProject(selected.id, selected.name)
              }
              getProjectUrl={getProjectUrl}
              getStatusVariant={getStatusVariant}
              formatStatus={formatStatus}
            />
          ))}
          <AddProjectCard isMobile={isMobile} onClick={() => setIsProjectDialogOpen(true)} />
        </div>
      )}

      {/* Project Dialog */}
      <ProjectDialog 
        open={isProjectDialogOpen}
        onOpenChange={setIsProjectDialogOpen}
        onSuccess={handleProjectSuccess}
      />
    </div>
  );
}
