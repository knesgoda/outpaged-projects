import { useState, useEffect } from "react";
import { useRealtime } from "@/hooks/useRealtime";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useOptionalAuth } from "@/hooks/useOptionalAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
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
import { arrayMove, horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KanbanColumn, Column } from "@/components/kanban/KanbanColumn";
import { TaskCard, Task } from "@/components/kanban/TaskCard";
import { TaskDialog } from "@/components/kanban/TaskDialog";
import { Plus, Filter, Search, Settings, Eye } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface KanbanColumnData {
  id: string;
  name: string;
  position: number;
  color?: string;
  wip_limit?: number;
  is_default: boolean;
  project_id: string;
}

export function KanbanBoard() {
  const { user } = useOptionalAuth();
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();
  
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [hierarchyFilter, setHierarchyFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [taskDialog, setTaskDialog] = useState<{
    isOpen: boolean;
    task?: Task | null;
    columnId?: string;
  }>({ isOpen: false });
  const [detailViewTask, setDetailViewTask] = useState<Task | null>(null);

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
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      // First get available projects
      let projectQuery = supabase.from('projects').select('id, name');
      
      if (user) {
        // For authenticated users, get their projects
        projectQuery = projectQuery.or(`owner_id.eq.${user.id},id.in.(${await getUserProjectMemberships()})`);
      } else {
        // For anonymous users, we'll create a demo project later if needed
        setCurrentProjectId('demo-project');
      }
      
      const { data: projects, error: projectError } = await projectQuery.limit(1);
      
      if (projectError && user) {
        console.error('Project fetch error:', projectError);
        throw projectError;
      }

      let projectId = currentProjectId;
      if (!projectId && projects && projects.length > 0) {
        projectId = projects[0].id;
        setCurrentProjectId(projectId);
      } else if (!projectId && !user) {
        // For demo mode, use fake data
        setColumns(getDemoColumns());
        setLoading(false);
        return;
      }

      if (!projectId) {
        setColumns([]);
        setLoading(false);
        return;
      }

      // Fetch custom columns for the project
      const { data: kanbanColumns, error: columnsError } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('project_id', projectId)
        .order('position');

      if (columnsError) throw columnsError;

      // If no custom columns exist, create default ones
      if (!kanbanColumns || kanbanColumns.length === 0) {
        await createDefaultColumns(projectId);
        return fetchTasks(); // Retry after creating defaults
      }

      // Fetch tasks for the project
      const { data: tasks, error: tasksError } = await supabase
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
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Transform tasks
      const tasksWithDetails = tasks?.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        hierarchy_level: task.hierarchy_level || 'task',
        task_type: task.task_type || 'feature_request',
        parent_id: task.parent_id,
        project_id: task.project_id,
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
        children: [],
        projectName: task.projects?.name,
        story_points: task.story_points
      })) || [];

  // Get status mappings for all columns
  const { data: statusMappings } = await supabase
    .from('task_status_mappings')
    .select('*')
    .eq('project_id', projectId);

  // Map tasks to columns based on status and custom column mappings
  const newColumns = kanbanColumns.map(col => {
    // Find the status mapping for this column
    const mapping = statusMappings?.find(m => m.column_id === col.id);
    const targetStatus = mapping?.status_value || col.name.toLowerCase().replace(' ', '_');
    
    const columnTasks = tasksWithDetails.filter(task => {
      return task.status === targetStatus;
    });

        return {
          id: col.id,
          title: col.name,
          tasks: columnTasks,
          color: col.color || '#6b7280',
          limit: col.wip_limit || undefined
        };
      });

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

  const getUserProjectMemberships = async (): Promise<string> => {
    if (!user) return '';
    
    const { data } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);
    
    return data?.map(pm => pm.project_id).join(',') || '';
  };

  const createDefaultColumns = async (projectId: string) => {
    const defaultColumns = [
      { name: 'To Do', position: 1, color: '#6b7280' },
      { name: 'In Progress', position: 2, color: '#3b82f6' },
      { name: 'Review', position: 3, color: '#f59e0b' },
      { name: 'Done', position: 4, color: '#10b981' }
    ];

    const { error } = await supabase
      .from('kanban_columns')
      .insert(
        defaultColumns.map(col => ({
          project_id: projectId,
          name: col.name,
          position: col.position,
          color: col.color,
          is_default: true
        }))
      );

    if (error) {
      console.error('Error creating default columns:', error);
      throw error;
    }
  };

  const getDemoColumns = (): Column[] => {
    return [
      {
        id: 'todo',
        title: 'To Do',
        tasks: [
          {
            id: 'demo-1',
            title: 'Implement user authentication',
            description: 'Add login and signup functionality',
            status: 'todo',
            priority: 'high',
            hierarchy_level: 'story',
            task_type: 'feature_request',
            tags: ['auth', 'security'],
            comments: 0,
            attachments: 0,
            children: []
          }
        ]
      },
      {
        id: 'in_progress', 
        title: 'In Progress',
        tasks: [
          {
            id: 'demo-2',
            title: 'Design dashboard mockups',
            description: 'Create wireframes and visual designs',
            status: 'in_progress',
            priority: 'medium',
            hierarchy_level: 'task',
            task_type: 'design',
            tags: ['design', 'ui'],
            comments: 2,
            attachments: 1,
            children: []
          }
        ]
      },
      {
        id: 'review',
        title: 'Review',
        tasks: []
      },
      {
        id: 'done',
        title: 'Done',
        tasks: [
          {
            id: 'demo-3',
            title: 'Setup project structure',
            description: 'Initialize React project with TypeScript',
            status: 'done',
            priority: 'low',
            hierarchy_level: 'task',
            task_type: 'task',
            tags: ['setup'],
            comments: 1,
            attachments: 0,
            children: []
          }
        ]
      }
    ];
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
    const activeData = active.data.current;
    
    if (activeData?.type === 'column') {
      // Column drag started - don't set activeTask
      return;
    }
    
    const task = findTask(active.id as string);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const activeData = active.data.current;
    const overData = over.data.current;

    // Handle column reordering (admin only)
    if (activeData?.type === 'column' && overData?.type === 'column' && isAdmin) {
      const activeColumnId = activeData.column.id;
      const overColumnId = overData.column.id;
      
      const activeColumnIndex = columns.findIndex(col => col.id === activeColumnId);
      const overColumnIndex = columns.findIndex(col => col.id === overColumnId);
      
      if (activeColumnIndex !== overColumnIndex) {
        const newColumns = arrayMove(columns, activeColumnIndex, overColumnIndex);
        setColumns(newColumns);
        
        // Update positions in database
        try {
          const updates = newColumns.map((col, index) => ({
            id: col.id,
            position: index + 1
          }));
          
          for (const update of updates) {
            await supabase
              .from('kanban_columns')
              .update({ position: update.position })
              .eq('id', update.id);
          }
          
          toast({
            title: "Success",
            description: "Column order updated successfully",
          });
        } catch (error) {
          console.error('Error updating column positions:', error);
          toast({
            title: "Error",
            description: "Failed to update column order",
            variant: "destructive",
          });
          // Revert the change
          await fetchTasks();
        }
      }
      return;
    }

    // Handle column reordering when dragging over another column (not having specific overData.type)
    if (activeData?.type === 'column' && !overData?.type && isAdmin) {
      const activeColumnId = activeData.column.id;
      const overColumnId = overId.replace('column-', '');
      
      const activeColumnIndex = columns.findIndex(col => col.id === activeColumnId);
      const overColumnIndex = columns.findIndex(col => col.id === overColumnId);
      
      if (activeColumnIndex !== overColumnIndex && overColumnIndex !== -1) {
        const newColumns = arrayMove(columns, activeColumnIndex, overColumnIndex);
        setColumns(newColumns);
        
        // Update positions in database
        try {
          const updates = newColumns.map((col, index) => ({
            id: col.id,
            position: index + 1
          }));
          
          for (const update of updates) {
            await supabase
              .from('kanban_columns')
              .update({ position: update.position })
              .eq('id', update.id);
          }
          
          toast({
            title: "Success",
            description: "Column order updated successfully",
          });
        } catch (error) {
          console.error('Error updating column positions:', error);
          toast({
            title: "Error",
            description: "Failed to update column order",
            variant: "destructive",
          });
          // Revert the change
          await fetchTasks();
        }
      }
      return;
    }

    // Handle task movement between columns
    const activeTask = findTask(activeId);
    const overColumn = findColumn(overId);

    if (!activeTask || !user) return;

    // Moving to a different column
    if (overColumn && activeTask.status !== await getStatusFromColumn(overColumn)) {
      try {
        const newStatus = await getStatusFromColumn(overColumn);
        const { error } = await supabase
          .from('tasks')
          .update({ status: newStatus as "todo" | "in_progress" | "in_review" | "done" })
          .eq('id', activeId);

        if (error) throw error;

        // Update local state
        setColumns((columns) => {
          const activeColumn = columns.find((col) =>
            col.tasks.some((task) => task.id === activeId)
          );

          if (!activeColumn) return columns;

          const updatedTask = { ...activeTask, status: newStatus };

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
  };

  const getStatusFromColumn = async (column: Column): Promise<string> => {
    if (!currentProjectId) return 'todo';
    
    // Check if we have a status mapping for this column
    const { data: mapping } = await supabase
      .from('task_status_mappings')
      .select('status_value')
      .eq('project_id', currentProjectId)
      .eq('column_id', column.id)
      .maybeSingle();
    
    return mapping?.status_value || column.title.toLowerCase().replace(' ', '_');
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

  const handleViewTask = (task: Task) => {
    setDetailViewTask(task);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user) return;
    
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
    if (!currentProjectId) {
      toast({
        title: "Error",
        description: "No project selected",
        variant: "destructive",
      });
      return;
    }

    try {
      if (taskDialog.task) {
        // Update existing task
        const { error } = await supabase
          .from('tasks')
          .update({
            title: taskData.title,
            description: taskData.description,
            priority: taskData.priority,
            hierarchy_level: (taskData as any).hierarchy_level,
            task_type: (taskData as any).task_type,
            assignee_id: (taskData as any).assignee_id || null,
            due_date: (taskData as any).due_date || null,
            story_points: (taskData as any).story_points || null,
            status: (taskData as any).status,
          })
          .eq('id', taskDialog.task.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Task updated successfully",
        });
      } else {
        // Create new task
        const statusFromColumn = taskDialog.columnId ? await getStatusFromColumnId(taskDialog.columnId) : 'todo';
        
        const { error } = await supabase
          .from('tasks')
          .insert({
            title: taskData.title!,
            description: taskData.description,
            priority: taskData.priority!,
            hierarchy_level: (taskData as any).hierarchy_level || 'task',
            task_type: (taskData as any).task_type || 'feature_request',
            parent_id: (taskData as any).parent_id || null,
            status: statusFromColumn as "todo" | "in_progress" | "in_review" | "done",
            project_id: currentProjectId,
            reporter_id: user?.id,
            assignee_id: (taskData as any).assignee_id || null,
            due_date: (taskData as any).due_date || null,
            story_points: (taskData as any).story_points || null,
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

  const getStatusFromColumnId = async (columnId: string): Promise<string> => {
    const column = columns.find(col => col.id === columnId);
    return column ? await getStatusFromColumn(column) : 'todo';
  };

  const addNewColumn = async () => {
    if (!user || !currentProjectId) {
      toast({
        title: "Error",
        description: "You must be logged in to add columns",
        variant: "destructive",
      });
      return;
    }

    const newColumnName = prompt("Enter column name:");
    if (!newColumnName?.trim()) return;

    try {
      // Get the next position
      const maxPosition = Math.max(...columns.map(col => parseInt(col.id) || 0), 0);
      
      const { error } = await supabase
        .from('kanban_columns')
        .insert({
          project_id: currentProjectId,
          name: newColumnName.trim(),
          position: maxPosition + 1,
          color: '#6b7280',
          is_default: false
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Column added successfully",
      });

      // Refresh the board
      await fetchTasks();
    } catch (error) {
      console.error('Error adding column:', error);
      toast({
        title: "Error", 
        description: "Failed to add column",
        variant: "destructive",
      });
    }
  };

  // Apply filters
  const filteredColumns = columns.map((column) => ({
    ...column,
    tasks: column.tasks.filter((task) => {
      const matchesSearch = task.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
        (task.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesHierarchy = hierarchyFilter === "all" || task.hierarchy_level === hierarchyFilter;
      const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter;
      
      return matchesSearch && matchesHierarchy && matchesPriority;
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
            onClick={() => setTaskDialog({ isOpen: true, columnId: columns[0]?.id })}
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
        
        <Select value={hierarchyFilter} onValueChange={setHierarchyFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="initiative">Initiatives</SelectItem>
            <SelectItem value="epic">Epics</SelectItem>
            <SelectItem value="story">Stories</SelectItem>
            <SelectItem value="task">Tasks</SelectItem>
            <SelectItem value="subtask">Sub-tasks</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
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
          <SortableContext 
            items={columns.map(col => `column-${col.id}`)}
            strategy={horizontalListSortingStrategy}
            disabled={!isAdmin}
          >
            <div className="flex gap-6 min-w-fit">
              {filteredColumns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  onAddTask={handleAddTask}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onViewTask={handleViewTask}
                  isDraggable={isAdmin}
                />
              ))}
            </div>
          </SortableContext>
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
        projectId={currentProjectId || undefined}
      />

      {/* Task Detail View Dialog */}
      {detailViewTask && (
        <TaskDialog
          task={detailViewTask}
          isOpen={true}
          onClose={() => setDetailViewTask(null)}
          onSave={handleSaveTask}
          projectId={currentProjectId || undefined}
        />
      )}
    </div>
  );
}

export default KanbanBoard;