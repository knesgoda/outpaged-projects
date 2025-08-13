import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, Filter, Search, Calendar, MessageSquare, Paperclip, Clock, Eye, Edit } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TaskDialog } from "@/components/kanban/TaskDialog";
import { StandardizedTaskCard, StandardizedTask } from "@/components/ui/standardized-task-card";

interface TaskType {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done' | 'in_review';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  hierarchy_level: 'initiative' | 'epic' | 'story' | 'task' | 'subtask';
  task_type: 'bug' | 'feature_request' | 'design';
  parent_id?: string;
  assignee_id?: string;
  reporter_id: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  project_id: string;
  // Additional properties required by TaskDialog
  tags: string[];
  comments: number;
  attachments: number;
  // We'll join these from other tables
  assignee?: {
    full_name?: string;
    avatar_url?: string;
  } | null;
  assignees?: Array<{
    id: string;
    name: string;
    avatar?: string;
    initials: string;
  }>;
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

const hierarchyColors = {
  initiative: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  epic: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  story: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  task: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  subtask: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const typeIcons = {
  bug: "🐛",
  feature_request: "✨",
  design: "🎨",
};

export default function Tasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [hierarchyFilter, setHierarchyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskType | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);

  const fetchTasks = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          projects(name, code)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch assignees for all tasks
      const taskIds = data?.map(t => t.id) || [];
      let assigneesData: any[] = [];
      
      if (taskIds.length > 0) {
        const { data: assignees, error: assigneesError } = await supabase
          .from('task_assignees_with_profiles')
          .select('*')
          .in('task_id', taskIds);
        
        if (!assigneesError) {
          assigneesData = assignees || [];
        }
      }

      // Transform tasks with assignees
      const tasksWithAssignees = data?.map(task => {
        const taskAssignees = assigneesData
          .filter(a => a.task_id === task.id)
          .map(assignee => ({
            id: assignee.user_id,
            name: assignee.full_name || 'Unknown User',
            avatar: assignee.avatar_url,
            initials: (assignee.full_name || 'U')
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
          }));

        return {
          ...task,
          assignees: taskAssignees,
          tags: [],
          comments: 0,
          attachments: 0
        };
      }) || [];

      setTasks((tasksWithAssignees as TaskType[]) || []);
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

  const handleTaskClick = (task: any) => {
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleEditTask = (e: React.MouseEvent, task: any) => {
    e.stopPropagation();
    setSelectedTask(task);
    setIsTaskDialogOpen(true);
  };

  const handleDeleteTask = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    setTaskToDelete(taskId);
  };

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskToDelete);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task deleted successfully",
      });

      setTaskToDelete(null);
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const handleSaveTask = async (taskData: any) => {
    try {
      if (selectedTask) {
        const updateData = {
          title: taskData.title,
          description: taskData.description,
          priority: taskData.priority,
          status: taskData.status,
          hierarchy_level: (taskData as any).hierarchy_level,
          task_type: (taskData as any).task_type,
          due_date: (taskData as any).due_date,
          parent_id: (taskData as any).parent_id,
          blocked: (taskData as any).blocked || false,
          blocking_reason: (taskData as any).blocking_reason,
          story_points: (taskData as any).story_points,
        };

        console.log("[Tasks] Updating task", selectedTask.id, updateData);
        const { error } = await supabase.from("tasks").update(updateData).eq("id", selectedTask.id);
        if (error) {
          console.error("[Tasks] Task update error:", error);
          throw error;
        }

        if (taskData.assignees) {
          console.log("[Tasks] Updating assignees for task", selectedTask.id, taskData.assignees);
          const { error: delErr } = await supabase.from("task_assignees").delete().eq("task_id", selectedTask.id);
          if (delErr) {
            console.error("[Tasks] Failed to remove existing assignees:", delErr);
            throw delErr;
          }

          if (taskData.assignees.length > 0) {
            const assigneeInserts = taskData.assignees.map((assignee: any) => ({
              task_id: selectedTask.id,
              user_id: assignee.id,
              assigned_by: user?.id,
            }));
            const { error: insErr } = await supabase.from("task_assignees").insert(assigneeInserts);
            if (insErr) {
              console.error("[Tasks] Failed to add assignees:", insErr);
              throw insErr;
            }
          }
        }

        toast({
          title: "Success",
          description: "Task updated successfully",
        });

        fetchTasks();
        setIsTaskDialogOpen(false);
        setSelectedTask(null);
      } else {
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

        const { data: newTask, error } = await supabase
          .from('tasks')
          .insert({
            title: taskData.title,
            description: taskData.description,
            priority: taskData.priority || 'medium',
            hierarchy_level: (taskData as any).hierarchy_level || 'task',
            task_type: (taskData as any).task_type || 'feature_request',
            parent_id: (taskData as any).parent_id || null,
            status: 'todo',
            project_id: projects[0].id,
            reporter_id: user?.id,
            due_date: (taskData as any).due_date || null,
          })
          .select()
          .single();

        if (error) throw error;

        // Add assignees for new task
        if (taskData.assignees && taskData.assignees.length > 0 && newTask) {
          const assigneeInserts = taskData.assignees.map(assignee => ({
            task_id: newTask.id,
            user_id: assignee.id,
            assigned_by: user?.id
          }));

          const { error: assigneeError } = await supabase
            .from('task_assignees')
            .insert(assigneeInserts);

          if (assigneeError) {
            console.error('Error adding assignees:', assigneeError);
            toast({
              title: "Warning",
              description: "Task created but failed to add assignees",
              variant: "destructive",
            });
          }
        }

        toast({
          title: "Success",
          description: "Task created successfully",
        });
      }

      setIsTaskDialogOpen(false);
      setSelectedTask(null);
      fetchTasks();
    } catch (error: any) {
      console.error("[Tasks] Error saving task:", error);
      toast({
        title: "Error",
        description: `Failed to ${selectedTask ? "update" : "create"} task: ${error?.message || "Unknown error"}`,
        variant: "destructive",
      });
    }
  };

  const handleCreateSubTask = (parentTask: any) => {
    setSelectedTask({
      ...parentTask,
      id: '', // Clear ID to indicate this is a new task
      title: '',
      description: '',
      parent_id: parentTask.id,
      hierarchy_level: getSubTaskHierarchy(parentTask.hierarchy_level),
    } as TaskType);
    setIsTaskDialogOpen(true);
  };

  const getSubTaskHierarchy = (parentLevel: string) => {
    switch (parentLevel) {
      case 'initiative':
        return 'epic';
      case 'epic':
        return 'story';
      case 'story':
        return 'task';
      case 'task':
        return 'subtask';
      default:
        return 'subtask';
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || task.status === statusFilter;
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
    const matchesHierarchy = hierarchyFilter === "all" || task.hierarchy_level === hierarchyFilter;
    const matchesType = typeFilter === "all" || task.task_type === typeFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesHierarchy && matchesType;
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
          onClick={() => {
            setSelectedTask(null);
            setIsTaskDialogOpen(true);
          }}
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

        <Select value={hierarchyFilter} onValueChange={setHierarchyFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Hierarchy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="initiative">🎯 Initiative</SelectItem>
            <SelectItem value="epic">🚀 Epic</SelectItem>
            <SelectItem value="story">📖 Story</SelectItem>
            <SelectItem value="task">✅ Task</SelectItem>
            <SelectItem value="subtask">🔸 Sub-task</SelectItem>
          </SelectContent>
        </Select>

        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="bug">🐛 Bug</SelectItem>
            <SelectItem value="feature_request">✨ Feature Request</SelectItem>
            <SelectItem value="design">🎨 Design</SelectItem>
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
            <StandardizedTaskCard
              key={task.id}
              task={task as StandardizedTask}
              onClick={handleTaskClick}
              onEdit={(task) => handleEditTask({} as React.MouseEvent, task as TaskType)}
              onDelete={(taskId) => handleDeleteTask({} as React.MouseEvent, taskId)}
              onCreateSubTask={(task) => handleCreateSubTask(task as TaskType)}
              showProject={true}
              interactive={false}
            />
          ))}
        </div>
      )}

      {/* Task Dialog */}
      <TaskDialog
        task={selectedTask}
        isOpen={isTaskDialogOpen}
        onClose={() => {
          setIsTaskDialogOpen(false);
          setSelectedTask(null);
        }}
        onSave={handleSaveTask}
        columnId="todo"
        projectId={selectedTask?.project_id ?? tasks[0]?.project_id}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
