import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, MoreHorizontal, FolderOpen, Calendar, Users, CheckSquare2, Loader2 } from "lucide-react";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Projects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_members(count),
          tasks(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setProjects(data || []);
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [user]);

  const handleProjectSuccess = () => {
    fetchProjects(); // Refresh the projects list
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Projects</h1>
            <p className="text-muted-foreground">Manage your projects and track progress</p>
          </div>
        </div>
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => (
          <Card key={project.id} className="hover:shadow-soft transition-all cursor-pointer">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg text-foreground">{project.name}</CardTitle>
                </div>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
              <CardDescription className="text-sm">
                {project.description || "No description provided"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status and dates */}
              <div className="flex items-center justify-between">
                <Badge variant={getStatusVariant(project.status)}>
                  {formatStatus(project.status)}
                </Badge>
                {project.end_date && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(project.end_date), "MMM dd, yyyy")}
                  </div>
                )}
              </div>

              {/* Project details */}
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{Array.isArray(project.project_members) ? project.project_members.length : 0} members</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckSquare2 className="w-4 h-4" />
                  <span>{Array.isArray(project.tasks) ? project.tasks.length : 0} tasks</span>
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

      {/* Project Dialog */}
      <ProjectDialog 
        isOpen={isProjectDialogOpen}
        onClose={() => setIsProjectDialogOpen(false)}
        onSuccess={handleProjectSuccess}
      />
    </div>
  );
}