
import { useState, useEffect } from "react";
import { useRealtime } from "@/hooks/useRealtime";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KanbanColumn, Column } from "@/components/kanban/KanbanColumn";
import { TaskCard, Task } from "@/components/kanban/TaskCard";
import { TaskDialog } from "@/components/kanban/TaskDialog";
import { Plus, Filter, Search, Settings } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define the column structure
const columnDefinitions = [
  { id: "todo", title: "To Do" },
  { id: "in_progress", title: "In Progress" },
  { id: "in_review", title: "Review" },
  { id: "done", title: "Done" },
];

export default function KanbanBoard() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBy, setFilterBy] = useState("all");
  const [taskDialog, setTaskDialog] = useState<{
    isOpen: boolean;
    task?: Task | null;
    columnId?: string;
  }>({ isOpen: false });
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Real-time updates for tasks
  useRealtime({
    table: 'tasks',
    onInsert: (payload) => {
      toast({
        title: "New Task Created",
        description: `"${payload.new.title}" was added to the board`,
      });
      fetchTasks();
    },
    onUpdate: (payload) => {
      toast({
        title: "Task Updated",
        description: `"${payload.new.title}" was modified`,
      });
      fetchTasks();
    },
    onDelete: (payload) => {
      toast({
        title: "Task Deleted",
        description: "A task was removed from the board",
        variant: "destructive",
      });
      fetchTasks();
    },
  });

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey (
            full_name,
            avatar_url
          ),
          projects (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match the expected format
      const tasksWithDetails = data?.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        assignee: task.assignee ? {
          name: task.assignee.full_name || 'Unknown',
          initials: (task.assignee.full_name || 'U')
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2),
          avatar: task.assignee.avatar_url || ''
        } : null,
        dueDate: task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric' 
        }) : undefined,
        tags: [], // TODO: Implement tags system
        comments: 0, // TODO: Get actual comment count
        attachments: 0, // TODO: Get actual attachment count
        projectName: task.projects?.name
      })) || [];

      // Group tasks by status into columns
      const newColumns = columnDefinitions.map(colDef => ({
        id: colDef.id,
        title: colDef.title,
        tasks: tasksWithDetails.filter(task => task.status === colDef.id)
      }));

      setColumns(newColumns);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast({
        title: "Error",
        description: "Failed to load tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = findTask(active.id as string);
    setActiveTask(task);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = findTask(activeId);
    const overColumn = findColumn(overId);

    if (!activeTask) return;

    // Moving to a different column
    if (overColumn && activeTask.status !== overColumn.id) {
      try {
        const { error } = await supabase
          .from('tasks')
          .update({ status: overColumn.id as "todo" | "in_progress" | "in_review" | "done" })
          .eq('id', activeId);

        if (error) throw error;

        // Update local state
        setColumns((columns) => {
          const activeColumn = columns.find((col) =>
            col.tasks.some((task) => task.id === activeId)
          );

          if (!activeColumn) return columns;

          const updatedTask = { ...activeTask, status: overColumn.id };

          return columns.map((col) => {
            if (col.id === activeColumn.id) {
              return {
                ...col,
                tasks: col.tasks.filter((task) => task.id !== activeId),
              };
            }
            if (col.id === overColumn.id) {
              return {
                ...col,
                tasks: [...col.tasks, updatedTask],
              };
            }
            return col;
          });
        });

        toast({
          title: "Success",
          description: "Task moved successfully",
        });
      } catch (error) {
        console.error('Error updating task status:', error);
        toast({
          title: "Error",
          description: "Failed to move task",
          variant: "destructive",
        });
      }
    }

    // TODO: Implement reordering within the same column if needed
  };

  const findTask = (id: string): Task | undefined => {
    for (const column of columns) {
      const task = column.tasks.find((task) => task.id === id);
      if (task) return task;
    }
  };

  const findColumn = (id: string): Column | undefined => {
    return columns.find((col) => col.id === id);
  };

  const handleAddTask = (columnId: string) => {
    setTaskDialog({ isOpen: true, columnId });
  };

  const handleEditTask = (task: Task) => {
    setTaskDialog({ isOpen: true, task });
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      setColumns((columns) =>
        columns.map((col) => ({
          ...col,
          tasks: col.tasks.filter((task) => task.id !== taskId),
        }))
      );

      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Error",
        description: "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const handleSaveTask = async (taskData: Partial<Task>) => {
    try {
      if (taskDialog.task) {
        // Update existing task
        const { error } = await supabase
          .from('tasks')
          .update({
            title: taskData.title,
            description: taskData.description,
            priority: taskData.priority,
            assignee_id: (taskData as any).assignee_id || null,
            due_date: (taskData as any).due_date || null,
          })
          .eq('id', taskDialog.task.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Task updated successfully",
        });
      } else {
        // Create new task - need project_id
        // For now, we'll use the first project the user has access to
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
            priority: taskData.priority,
            status: (taskDialog.columnId || 'todo') as "todo" | "in_progress" | "in_review" | "done",
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
      }

      // Refresh tasks
      await fetchTasks();
      setTaskDialog({ isOpen: false });
    } catch (error) {
      console.error('Error saving task:', error);
      toast({
        title: "Error",
        description: "Failed to save task",
        variant: "destructive",
      });
    }
  };

  const addNewColumn = () => {
    // TODO: Implement custom column creation
    toast({
      title: "Info",
      description: "Custom columns coming soon!",
    });
  };

  const filteredColumns = columns.map((column) => ({
    ...column,
    tasks: column.tasks.filter((task) => {
      const matchesSearch = task.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesFilter =
        filterBy === "all" ||
        task.priority === filterBy ||
        task.assignee?.name.toLowerCase().includes(filterBy.toLowerCase());
      return matchesSearch && matchesFilter;
    }),
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-muted-foreground">Loading tasks...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
            <p className="text-muted-foreground">Please log in to view your Kanban board</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Kanban Board</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Drag and drop tasks to manage your workflow
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={addNewColumn} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Add Column</span>
            <span className="sm:hidden">Column</span>
          </Button>
          <Button 
            className="bg-gradient-primary hover:opacity-90 w-full sm:w-auto"
            onClick={() => setTaskDialog({ isOpen: true, columnId: 'todo' })}
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Add Task</span>
            <span className="sm:hidden">Task</span>
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/30 border-muted focus:bg-background"
          />
        </div>
        <Select value={filterBy} onValueChange={setFilterBy}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="urgent">Urgent Priority</SelectItem>
            <SelectItem value="high">High Priority</SelectItem>
            <SelectItem value="medium">Medium Priority</SelectItem>
            <SelectItem value="low">Low Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 min-w-fit">
            {filteredColumns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? (
              <div className="rotate-2 opacity-90">
                <TaskCard task={activeTask} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task Dialog */}
      <TaskDialog
        task={taskDialog.task}
        isOpen={taskDialog.isOpen}
        onClose={() => setTaskDialog({ isOpen: false })}
        onSave={handleSaveTask}
        columnId={taskDialog.columnId}
      />
    </div>
  );
}
