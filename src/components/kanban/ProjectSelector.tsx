
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  FolderOpen, 
  Users, 
  Calendar,
  BarChart3,
  Settings,
  Plus
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  owner_id: string;
  created_at: string;
  task_count?: number;
  member_count?: number;
}

interface ProjectSelectorProps {
  selectedProjectId?: string;
  onProjectSelect: (projectId: string, project: Project) => void;
  onCreateProject?: () => void;
}

export function ProjectSelector({ 
  selectedProjectId, 
  onProjectSelect, 
  onCreateProject 
}: ProjectSelectorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      // Get projects where user is owner or member
      const { data: projects, error } = await supabase
        .from('projects')
        .select(`
          *,
          project_members!inner(count)
        `)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get task counts for each project
      const projectsWithStats = await Promise.all(
        (projects || []).map(async (project) => {
          const { count: taskCount } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id);

          const { count: memberCount } = await supabase
            .from('project_members')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id);

          return {
            ...project,
            task_count: taskCount || 0,
            member_count: (memberCount || 0) + 1 // +1 for owner
          };
        })
      );

      setProjects(projectsWithStats);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'completed': return 'secondary';
      case 'on_hold': return 'outline';
      default: return 'secondary';
    }
  };

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const handleViewModeChange = (value: string) => {
    setViewMode(value as 'grid' | 'list');
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Select Project</h2>
          <div className="h-4 w-20 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Card key={i} className="h-40 bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-semibold">Select Project</h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Choose a project to view its Kanban board
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={viewMode} onValueChange={handleViewModeChange}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Grid</SelectItem>
              <SelectItem value="list">List</SelectItem>
            </SelectContent>
          </Select>
          {onCreateProject && (
            <Button onClick={onCreateProject}>
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          )}
        </div>
      </div>

      {projects.length === 0 ? (
        <Card className="p-8">
          <div className="text-center space-y-4">
            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto" />
            <div>
              <p className="text-lg font-medium">No projects found</p>
              <p className="text-muted-foreground">Create your first project to get started</p>
            </div>
            {onCreateProject && (
              <Button onClick={onCreateProject}>
                <Plus className="w-4 h-4 mr-2" />
                Create Project
              </Button>
            )}
          </div>
        </Card>
      ) : (
        <div className={viewMode === 'grid' ? 
          "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : 
          "space-y-3"
        }>
          {projects.map((project) => (
            <Card 
              key={project.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedProjectId === project.id ? 'ring-2 ring-primary' : ''
              } ${viewMode === 'list' ? 'p-4' : ''}`}
              onClick={() => onProjectSelect(project.id, project)}
            >
              {viewMode === 'grid' ? (
                <>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg line-clamp-1">
                        {project.name}
                      </CardTitle>
                      <Badge variant={getStatusBadgeVariant(project.status)} className="text-xs">
                        {formatStatus(project.status)}
                      </Badge>
                    </div>
                    {project.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <BarChart3 className="w-4 h-4" />
                        {project.task_count} tasks
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {project.member_count} members
                      </div>
                    </div>
                    {project.end_date && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        Due {new Date(project.end_date).toLocaleDateString()}
                      </div>
                    )}
                  </CardContent>
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium">{project.name}</h3>
                      <Badge variant={getStatusBadgeVariant(project.status)} className="text-xs">
                        {formatStatus(project.status)}
                      </Badge>
                    </div>
                    {project.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <BarChart3 className="w-4 h-4" />
                      {project.task_count}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {project.member_count}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
