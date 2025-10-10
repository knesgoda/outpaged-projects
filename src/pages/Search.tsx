
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, FolderOpen, CheckSquare, Users, Calendar } from "lucide-react";
import { SearchBar } from "@/components/search/SearchBar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  formatProjectStatus,
  getProjectStatusBadgeVariant,
  isProjectStatus,
} from "@/utils/project-status";

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({
    projects: [],
    tasks: [],
    total: 0
  });

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || !user) return;

    setLoading(true);
    try {
      // Search projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .or(`name.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // Search tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          projects:project_id (
            name
          )
        `)
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      setResults({
        projects: projects || [],
        tasks: tasks || [],
        total: (projects?.length || 0) + (tasks?.length || 0)
      });
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to perform search. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    setSearchParams(searchQuery ? { q: searchQuery } : {});
    if (searchQuery) {
      performSearch(searchQuery);
    } else {
      setResults({ projects: [], tasks: [], total: 0 });
    }
  };

  const getStatusVariant = (status: string) => {
    if (isProjectStatus(status)) {
      return getProjectStatusBadgeVariant(status);
    }

    switch (status) {
      case 'in_progress':
        return 'default';
      case 'done':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const formatStatus = (status: string) => {
    if (isProjectStatus(status)) {
      return formatProjectStatus(status);
    }

    return status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="w-6 h-6 text-muted-foreground" />
          <h1 className="text-3xl font-bold">Search</h1>
        </div>
        <SearchBar
          onSearch={handleSearch}
          placeholder="Search projects, tasks, and more..."
          className="max-w-2xl"
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {query && !loading && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Found {results.total} results for "{query}"
            </span>
          </div>

          {results.total > 0 ? (
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList>
                <TabsTrigger value="all">All ({results.total})</TabsTrigger>
                <TabsTrigger value="projects">Projects ({results.projects.length})</TabsTrigger>
                <TabsTrigger value="tasks">Tasks ({results.tasks.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                <div className="space-y-4">
                  {results.projects.map((project: any) => (
                    <Card key={`project-${project.id}`} className="hover:shadow-sm transition-shadow cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <FolderOpen className="w-5 h-5 text-primary" />
                            <CardTitle className="text-lg">{project.name}</CardTitle>
                          </div>
                          <Badge variant={getStatusVariant(project.status)}>
                            {formatStatus(project.status)}
                          </Badge>
                        </div>
                        {project.description && (
                          <p className="text-sm text-muted-foreground mt-2">{project.description}</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(project.created_at), "MMM dd, yyyy")}
                          </div>
                          <span>Project</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {results.tasks.map((task: any) => (
                    <Card key={`task-${task.id}`} className="hover:shadow-sm transition-shadow cursor-pointer">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <CheckSquare className="w-5 h-5 text-primary" />
                            <CardTitle className="text-lg">{task.title}</CardTitle>
                          </div>
                          <Badge variant={getStatusVariant(task.status)}>
                            {formatStatus(task.status)}
                          </Badge>
                        </div>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-2">{task.description}</p>
                        )}
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {format(new Date(task.created_at), "MMM dd, yyyy")}
                          </div>
                          <span>Task in {task.projects?.name || 'Unknown Project'}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="projects" className="space-y-4">
                {results.projects.map((project: any) => (
                  <Card key={project.id} className="hover:shadow-sm transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-5 h-5 text-primary" />
                          <CardTitle className="text-lg">{project.name}</CardTitle>
                        </div>
                        <Badge variant={getStatusVariant(project.status)}>
                          {formatStatus(project.status)}
                        </Badge>
                      </div>
                      {project.description && (
                        <p className="text-sm text-muted-foreground mt-2">{project.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(project.created_at), "MMM dd, yyyy")}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="tasks" className="space-y-4">
                {results.tasks.map((task: any) => (
                  <Card key={task.id} className="hover:shadow-sm transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="w-5 h-5 text-primary" />
                          <CardTitle className="text-lg">{task.title}</CardTitle>
                        </div>
                        <Badge variant={getStatusVariant(task.status)}>
                          {formatStatus(task.status)}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-2">{task.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(task.created_at), "MMM dd, yyyy")}
                        </div>
                        <span>Task in {task.projects?.name || 'Unknown Project'}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No results found</h3>
              <p className="text-muted-foreground">Try adjusting your search terms</p>
            </div>
          )}
        </div>
      )}

      {!query && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Search your workspace</h3>
          <p className="text-muted-foreground">Find projects, tasks, and more across your workspace</p>
        </div>
      )}
    </div>
  );
}
