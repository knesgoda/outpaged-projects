import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, FolderOpen, Calendar, Users, CheckSquare2, Loader2, Settings, Edit, Trash2 } from "lucide-react";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { useToast } from "@/hooks/use-toast";
import { useProjectNavigation } from "@/hooks/useProjectNavigation";
import { useProjects, useDeleteProject } from "@/hooks/useProjects";
import { format } from "date-fns";

export default function Projects() {
  const { toast } = useToast();
  const { navigateToProject, navigateToProjectSettings, getProjectUrl } = useProjectNavigation();
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  
  const { data: projectsData, isLoading, error } = useProjects({ status: "all", sort: "updated_at", dir: "desc" });
  const deleteProjectMutation = useDeleteProject();

  const projects = projectsData?.data || [];

  // Debug logging for mobile issues
  console.log('Projects Page State:', {
    isLoading,
    hasError: !!error,
    projectCount: projects.length,
    projectsData
  });

  const handleProjectSuccess = () => {
    // The query will automatically refetch
  };

  const handleProjectClick = (project: any) => {
    navigateToProject(project);
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

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'on_hold':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'on_hold':
        return 'On Hold';
      case 'planning':
        return 'Planning';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
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
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground">Manage your projects and track progress</p>
          </div>
          <Button 
            className="bg-gradient-primary hover:opacity-90"
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground">Manage your projects and track progress</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90"
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
                className="bg-gradient-primary hover:opacity-90 mt-4"
                onClick={() => setIsProjectDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Project
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
          <Card
            key={project.id}
            className="hover:shadow-soft transition-all cursor-pointer"
            onClick={() => handleProjectClick(project)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg text-foreground">
                    <Link
                      to={getProjectUrl(project)}
                      data-testid={`project-link-${project.id}`}
                      className="hover:underline"
                    >
                      {project.name}
                    </Link>
                  </CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="w-8 h-8"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToProject(project);
                      }}
                    >
                      <FolderOpen className="w-4 h-4 mr-2" />
                      Open Project
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        navigateToProjectSettings(project);
                      }}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Project Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle edit action
                        console.log('Edit project:', project.id);
                      }}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Project
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id, project.name);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <CardDescription className="text-sm">
                {project.description || "No description provided"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div className="flex items-center">
                {project.status && (
                  <Badge variant={getStatusVariant(project.status)}>
                    {formatStatus(project.status)}
                  </Badge>
                )}
              </div>

              {/* Project details */}
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

              {/* Created date */}
              <div className="text-xs text-muted-foreground border-t pt-2">
                Created {format(new Date(project.created_at), "MMM dd, yyyy")}
              </div>
            </CardContent>
          </Card>
          ))}

          {/* Add Project Card */}
          <Card 
            className="border-dashed border-2 border-muted-foreground/20 hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer"
            onClick={() => setIsProjectDialogOpen(true)}
          >
            <CardContent className="flex items-center justify-center h-full min-h-[200px]">
              <div className="text-center space-y-2">
                <Plus className="w-8 h-8 text-muted-foreground mx-auto" />
                <h3 className="font-medium text-foreground">Create New Project</h3>
                <p className="text-sm text-muted-foreground">Start organizing your work</p>
              </div>
            </CardContent>
          </Card>
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
