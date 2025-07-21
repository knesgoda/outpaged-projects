import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Filter, Search, Calendar, MessageSquare, Paperclip, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TaskDialog } from "@/components/kanban/TaskDialog";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done' | 'in_review';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id?: string;
  reporter_id: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  // We'll join these from other tables
  assignee?: {
    full_name?: string;
    avatar_url?: string;
  } | null;
  project?: {
    name?: string;
  } | null;
}

const priorityColors = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/20 text-warning",
  high: "bg-destructive/20 text-destructive",
  urgent: "bg-destructive text-destructive-foreground",
};

const statusColors = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/20 text-primary",
  in_review: "bg-warning/20 text-warning", 
  done: "bg-success/20 text-success",
};

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);

  const fetchTasks = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(full_name, avatar_url),
          project:projects(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks((data as Task[]) || []);
    } catch (error: any) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Tasks</h1>
            <p className="text-muted-foreground">Manage and track all your tasks</p>
          </div>
        </div>

        <Card className="bg-warning/5 border-warning/20">
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <h3 className="text-xl font-semibold text-foreground">Authentication Required</h3>
              <p className="text-muted-foreground max-w-md">
                Please sign in to view and manage your tasks. Task management includes assignments, 
                due dates, comments, and status tracking.
              </p>
              <Button onClick={() => window.location.href = '/auth'}>
                Sign In
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground">Manage and track all your tasks</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90"
          onClick={() => setIsTaskDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/30 border-muted focus:bg-background"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="in_review">In Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-muted rounded w-16"></div>
                    <div className="h-6 bg-muted rounded w-20"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-foreground">
                {tasks.length === 0 ? "No tasks yet" : "No tasks match your filters"}
              </h3>
              <p className="text-muted-foreground max-w-md">
                {tasks.length === 0 
                  ? "Create your first task to get started with project management."
                  : "Try adjusting your search or filter criteria to find the tasks you're looking for."
                }
              </p>
              {tasks.length === 0 && (
                <Button 
                  className="bg-gradient-primary hover:opacity-90"
                  onClick={() => setIsTaskDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Task
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="hover:shadow-medium transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-foreground leading-tight">
                        {task.title}
                      </h3>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {task.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={priorityColors[task.priority]} variant="secondary">
                        {task.priority}
                      </Badge>
                      <Badge className={statusColors[task.status]} variant="secondary">
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  {/* Meta Information */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      {task.assignee && task.assignee.full_name && (
                        <div className="flex items-center gap-2">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={task.assignee.avatar_url} />
                            <AvatarFallback className="text-xs">
                              {task.assignee.full_name?.charAt(0) || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          <span>{task.assignee.full_name}</span>
                        </div>
                      )}
                      
                      {task.project && task.project.name && (
                        <div className="flex items-center gap-1">
                          <span>in</span>
                          <span className="font-medium">{task.project.name}</span>
                        </div>
                      )}

                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          <span>Due {new Date(task.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>0</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Paperclip className="w-3 h-3" />
                        <span>0</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>0h</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Task Dialog */}
      <TaskDialog
        isOpen={isTaskDialogOpen}
        onClose={() => setIsTaskDialogOpen(false)}
        onSave={async (taskData) => {
          try {
            // Get the first project the user has access to
            const { data: projects, error: projectError } = await supabase
              .from('projects')
              .select('id')
              .limit(1);

            if (projectError) throw projectError;
            if (!projects || projects.length === 0) {
              toast({
                title: "Error",
                description: "No project found. Please create a project first.",
                variant: "destructive",
              });
              return;
            }

            const { error } = await supabase
              .from('tasks')
              .insert({
                title: taskData.title,
                description: taskData.description,
                priority: taskData.priority || 'medium',
                status: 'todo',
                project_id: projects[0].id,
                reporter_id: user?.id,
                assignee_id: (taskData as any).assignee_id || null,
                due_date: (taskData as any).due_date || null,
              });

            if (error) throw error;

            toast({
              title: "Success",
              description: "Task created successfully",
            });

            setIsTaskDialogOpen(false);
            fetchTasks();
          } catch (error) {
            console.error('Error creating task:', error);
            toast({
              title: "Error",
              description: "Failed to create task",
              variant: "destructive",
            });
          }
        }}
        columnId="todo"
      />
    </div>
  );
}