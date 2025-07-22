
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
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove, horizontalListSortingStrategy, SortableContext } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EnhancedKanbanColumn, Column } from "@/components/kanban/EnhancedKanbanColumn";
import { TaskCard, Task } from "@/components/kanban/TaskCard";
import { EnhancedTaskDialog } from "@/components/kanban/EnhancedTaskDialog";
import { BulkOperations } from "@/components/kanban/BulkOperations";
import { TaskTemplates } from "@/components/kanban/TaskTemplates";
import { ProjectSelector } from "@/components/kanban/ProjectSelector";
import { KanbanFiltersComponent, KanbanFilters } from "@/components/kanban/KanbanFilters";
import { BoardSettings } from "@/components/kanban/BoardSettings";
import { StatsPanel } from "@/components/kanban/StatsPanel";
import { Plus, ArrowLeft, Settings, Layers, BarChart3 } from "lucide-react";

interface KanbanColumnData {
  id: string;
  name: string;
  position: number;
  color?: string;
  wip_limit?: number;
  is_default: boolean;
  project_id: string;
}

interface Swimlane {
  id: string;
  name: string;
  position: number;
  color: string;
  is_default: boolean;
  project_id: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
}

export function KanbanBoard() {
  const { user } = useOptionalAuth();
  const { isAdmin } = useIsAdmin();
  const { toast } = useToast();
  
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [columns, setColumns] = useState<Column[]>([]);
  const [swimlanes, setSwimlanes] = useState<Swimlane[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [taskDialog, setTaskDialog] = useState<{
    isOpen: boolean;
    task?: Task | null;
    columnId?: string;
    swimlaneId?: string;
  }>({ isOpen: false });
  const [detailViewTask, setDetailViewTask] = useState<Task | null>(null);
  const [availableAssignees, setAvailableAssignees] = useState<Array<{ id: string; name: string }>>([]);
  const [showSwimlanes, setShowSwimlanes] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [showQuickAdd, setShowQuickAdd] = useState<{ columnId: string; swimlaneId?: string } | null>(null);
  const [viewMode, setViewMode] = useState<'standard' | 'compact' | 'list'>('standard');
  
  // Enhanced filters state
  const [filters, setFilters] = useState<KanbanFilters>({
    search: '',
    assignee: 'all',
    priority: 'all',
    hierarchy: 'all',
    taskType: 'all',
    dueDate: 'all',
    tags: []
  });

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
    if (currentProjectId) {
      fetchTasks();
      fetchProjectMembers();
      fetchSwimlanes();
    }
  }, [currentProjectId]);

  const handleProjectSelect = (projectId: string, project: Project) => {
    setSelectedProject(project);
    setCurrentProjectId(projectId);
    setLoading(true);
  };

  const fetchProjectMembers = async () => {
    if (!currentProjectId) return;

    try {
      const { data: members, error } = await supabase
        .from('project_members')
        .select(`
          user_id,
          profiles!project_members_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', currentProjectId);

      if (error) throw error;

      const assignees = members?.map(member => ({
        id: member.user_id,
        name: (member as any).profiles?.full_name || 'Unknown User'
      })) || [];

      setAvailableAssignees(assignees);
    } catch (error) {
      console.error('Error fetching project members:', error);
    }
  };

  const fetchSwimlanes = async () => {
    if (!currentProjectId) return;

    try {
      const { data: swimlanesData, error } = await supabase
        .from('swimlanes')
        .select('*')
        .eq('project_id', currentProjectId)
        .order('position');

      if (error) throw error;
      setSwimlanes(swimlanesData || []);
    } catch (error) {
      console.error('Error fetching swimlanes:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      setLoading(true);
      
      if (!currentProjectId) {
        setColumns([]);
        setLoading(false);
        return;
      }

      // Fetch custom columns for the project
      const { data: kanbanColumns, error: columnsError } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('project_id', currentProjectId)
        .order('position');

      if (columnsError) throw columnsError;

      // If no custom columns exist, create default ones
      if (!kanbanColumns || kanbanColumns.length === 0) {
        await createDefaultColumns(currentProjectId);
        return fetchTasks(); // Retry after creating defaults
      }

      // Fetch tasks for the project
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          projects (
            name
          )
        `)
        .eq('project_id', currentProjectId)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;

      // Fetch assignees for all tasks
      const taskIds = tasks?.map(t => t.id) || [];
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
      const tasksWithDetails = tasks?.map(task => {
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
          id: task.id,
          title: task.title,
          description: task.description || '',
          status: task.status,
          priority: task.priority,
          hierarchy_level: task.hierarchy_level || 'task',
          task_type: task.task_type || 'feature_request',
          parent_id: task.parent_id,
          project_id: task.project_id,
          swimlane_id: task.swimlane_id,
          assignees: taskAssignees,
          dueDate: task.due_date ? new Date(task.due_date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }) : undefined,
          tags: [], // TODO: Implement tags system
          comments: 0, // TODO: Get actual comment count  
          attachments: 0, // TODO: Get actual attachment count
          children: [],
          projectName: task.projects?.name,
          story_points: task.story_points,
          blocked: task.blocked || false,
          blocking_reason: task.blocking_reason
        };
      }) || [];

      // Get status mappings for all columns
      const { data: statusMappings } = await supabase
        .from('task_status_mappings')
        .select('*')
        .eq('project_id', currentProjectId);

      // Map tasks to columns based on status and custom column mappings
      const newColumns = kanbanColumns.map(col => {
        // Find the status mapping for this column
        const mapping = statusMappings?.find(m => m.column_id === col.id);
        
        const columnTasks = tasksWithDetails.filter(task => {
          // Handle both custom status mappings and standard statuses
          if (mapping) {
            const targetStatus = mapping.status_value;
            // Create a comprehensive mapping for status matching
            const statusMappings = {
              'to_do': ['todo', 'to_do'],
              'todo': ['todo', 'to_do'],
              'in_progress': ['in_progress', 'doing'],
              'blocked': ['blocked'],
              'review': ['in_review', 'review', 'testing'],
              'in_review': ['in_review', 'review', 'testing'],
              'done': ['done', 'complete', 'completed']
            };
            
            const validStatuses = statusMappings[targetStatus] || [targetStatus];
            return validStatuses.includes(task.status);
          } else {
            // Fallback to standard status mapping if no custom mapping exists
            const standardMapping = {
              'to do': ['todo', 'to_do'],
              'todo': ['todo', 'to_do'],
              'in progress': ['in_progress', 'doing'],
              'blocked': ['blocked'],
              'review': ['in_review', 'review', 'testing'],
              'in review': ['in_review', 'review', 'testing'],
              'done': ['done', 'complete', 'completed']
            };
            const validStatuses = standardMapping[col.name.toLowerCase()] || [col.name.toLowerCase().replace(/ /g, '_')];
            return validStatuses.includes(task.status);
          }
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
        
        // Check if task is blocked before allowing status change
        if (activeTask.blocked && newStatus !== 'todo') {
          toast({
            title: "Task is blocked",
            description: `Cannot move blocked task to ${newStatus}. Please unblock the task first.`,
            variant: "destructive",
          });
          return;
        }

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

  const getTasksBySwimlane = (swimlaneId: string) => {
    return columns.map(column => ({
      ...column,
      tasks: column.tasks.filter(task => task.swimlane_id === swimlaneId)
    }));
  };

  const getTasksWithoutSwimlane = () => {
    return columns.map(column => ({
      ...column,
      tasks: column.tasks.filter(task => !task.swimlane_id)
    }));
  };

  const handleAddTask = (columnId: string, swimlaneId?: string) => {
    setTaskDialog({ isOpen: true, columnId, swimlaneId });
  };

  const handleEditTask = (task: Task) => {
    setTaskDialog({ isOpen: true, task });
  };

  const handleViewTask = (task: Task) => {
    setTaskDialog({ isOpen: true, task });
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
        // Handle assignees for existing tasks
        if (taskData.assignees) {
          // Remove all existing assignees
          await supabase
            .from('task_assignees')
            .delete()
            .eq('task_id', taskDialog.task.id);

          // Add new assignees
          if (taskData.assignees.length > 0) {
            const assigneeInserts = taskData.assignees.map(assignee => ({
              task_id: taskDialog.task.id,
              user_id: assignee.id,
              assigned_by: user?.id
            }));

            await supabase
              .from('task_assignees')
              .insert(assigneeInserts);
          }
        }

        const { error } = await supabase
          .from('tasks')
          .update({
            title: taskData.title,
            description: taskData.description,
            priority: taskData.priority,
            hierarchy_level: (taskData as any).hierarchy_level,
            task_type: (taskData as any).task_type,
            due_date: (taskData as any).due_date || null,
            story_points: (taskData as any).story_points || null,
            status: (taskData as any).status,
            swimlane_id: taskDialog.swimlaneId || null,
            blocked: (taskData as any).blocked || false,
            blocking_reason: (taskData as any).blocking_reason || null,
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
        
        const { data: newTask, error } = await supabase
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
            due_date: (taskData as any).due_date || null,
            story_points: (taskData as any).story_points || null,
            swimlane_id: taskDialog.swimlaneId || null,
            blocked: false,
            blocking_reason: null,
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

  // Apply enhanced filters
  const filteredColumns = columns.map((column) => ({
    ...column,
    tasks: column.tasks.filter((task) => {
      // Search filter
      const matchesSearch = !filters.search || 
        task.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        (task.description || '').toLowerCase().includes(filters.search.toLowerCase());
      
      // Assignee filter
      const matchesAssignee = filters.assignee === 'all' || 
        (filters.assignee === 'unassigned' && (!task.assignees || task.assignees.length === 0)) ||
        (task.assignees && task.assignees.some(a => a.id === filters.assignee));
      
      // Priority filter
      const matchesPriority = filters.priority === 'all' || task.priority === filters.priority;
      
      // Hierarchy filter
      const matchesHierarchy = filters.hierarchy === 'all' || task.hierarchy_level === filters.hierarchy;
      
      // Task type filter
      const matchesTaskType = filters.taskType === 'all' || task.task_type === filters.taskType;
      
      // Due date filter
      const matchesDueDate = filters.dueDate === 'all' || (() => {
        if (!task.dueDate && filters.dueDate === 'no_due_date') return true;
        if (!task.dueDate) return false;
        
        const today = new Date();
        const dueDate = new Date(task.dueDate);
        const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        
        switch (filters.dueDate) {
          case 'overdue': return daysDiff < 0;
          case 'today': return daysDiff === 0;
          case 'tomorrow': return daysDiff === 1;
          case 'this_week': return daysDiff >= 0 && daysDiff <= 7;
          case 'next_week': return daysDiff > 7 && daysDiff <= 14;
          default: return true;
        }
      })();
      
      // Tags filter (when implemented)
      const matchesTags = filters.tags.length === 0 || 
        filters.tags.every(tag => task.tags.includes(tag));
      
      return matchesSearch && matchesAssignee && matchesPriority && 
             matchesHierarchy && matchesTaskType && matchesDueDate && matchesTags;
    }),
  }));

  // Show project selector if no project is selected
  if (!selectedProject) {
    return (
      <div className="space-y-6">
        <ProjectSelector
          selectedProjectId={currentProjectId || undefined}
          onProjectSelect={handleProjectSelect}
          onCreateProject={() => {
            // TODO: Implement project creation dialog
            toast({
              title: "Coming Soon",
              description: "Project creation from Kanban board will be available soon",
            });
          }}
        />
      </div>
    );
  }

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
      {/* Project Title Header - Move to top */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedProject(null)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Projects
          </Button>
        </div>
        <div className="mt-4">
          <h1 className="text-3xl font-bold text-foreground">
            {selectedProject.name}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kanban Board - Drag and drop tasks to manage your workflow
          </p>
        </div>
      </div>

      {/* Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">{/* This div content continues below */}
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button 
              variant={viewMode === 'standard' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('standard')}
            >
              Standard
            </Button>
            <Button 
              variant={viewMode === 'compact' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('compact')}
            >
              Compact
            </Button>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowSwimlanes(!showSwimlanes)}
          >
            <Layers className="w-4 h-4 mr-2" />
            {showSwimlanes ? 'Hide' : 'Show'} Swimlanes
          </Button>
          <TaskTemplates projectId={currentProjectId!} onTaskCreated={fetchTasks} />
          <BoardSettings projectId={currentProjectId!} onUpdate={fetchTasks} />
          <StatsPanel tasks={filteredColumns.flatMap(col => col.tasks)}>
            <Button variant="outline" className="w-full sm:w-auto">
              <BarChart3 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Statistics</span>
              <span className="sm:hidden">Stats</span>
            </Button>
          </StatsPanel>
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


      {/* Enhanced Filters */}
      <KanbanFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        availableAssignees={availableAssignees}
        availableTags={[]} // TODO: Implement tags system
      />

      {/* Bulk Operations */}
      <BulkOperations
        selectedTasks={selectedTasks}
        onSelectionChange={setSelectedTasks}
        tasks={filteredColumns.flatMap(col => col.tasks)}
        onOperationComplete={fetchTasks}
        availableAssignees={availableAssignees}
        availableColumns={columns}
      />

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {showSwimlanes && swimlanes.length > 0 ? (
            // Swimlanes view
            <div className="space-y-8">
              {swimlanes.map((swimlane) => (
                <div key={swimlane.id} className="space-y-4">
                  <div className="flex items-center gap-3 px-4">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: swimlane.color }}
                    />
                    <h3 className="text-lg font-semibold">{swimlane.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      {getTasksBySwimlane(swimlane.id).reduce((acc, col) => acc + col.tasks.length, 0)} tasks
                    </Badge>
                  </div>
                  <div className="flex gap-6 min-w-fit">
                    {getTasksBySwimlane(swimlane.id).map((column) => (
                      <EnhancedKanbanColumn
                        key={column.id}
                        column={column}
                        onAddTask={(columnId) => handleAddTask(columnId, swimlane.id)}
                        onEditTask={handleEditTask}
                        onDeleteTask={handleDeleteTask}
                        onViewTask={handleViewTask}
                        isDraggable={isAdmin}
                        viewMode={viewMode}
                        selectedTasks={selectedTasks}
                        onTaskSelectionChange={setSelectedTasks}
                        showQuickAdd={showQuickAdd}
                        onShowQuickAdd={setShowQuickAdd}
                        onQuickTaskCreated={fetchTasks}
                        swimlaneId={swimlane.id}
                        projectId={currentProjectId || ""}
                        availableAssignees={availableAssignees}
                      />
                    ))}
                  </div>
                </div>
              ))}
              
              {/* Tasks without swimlane */}
              <div className="space-y-4">
                <div className="flex items-center gap-3 px-4">
                  <div className="w-4 h-4 rounded border-2 border-muted-foreground bg-muted" />
                  <h3 className="text-lg font-semibold">No Swimlane</h3>
                  <Badge variant="secondary" className="text-xs">
                    {getTasksWithoutSwimlane().reduce((acc, col) => acc + col.tasks.length, 0)} tasks
                  </Badge>
                </div>
                <div className="flex gap-6 min-w-fit">
                  {getTasksWithoutSwimlane().map((column) => (
                    <EnhancedKanbanColumn
                      key={column.id}
                      column={column}
                      onAddTask={handleAddTask}
                      onEditTask={handleEditTask}
                      onDeleteTask={handleDeleteTask}
                      onViewTask={handleViewTask}
                      isDraggable={isAdmin}
                      viewMode={viewMode}
                      selectedTasks={selectedTasks}
                      onTaskSelectionChange={setSelectedTasks}
                      showQuickAdd={showQuickAdd}
                      onShowQuickAdd={setShowQuickAdd}
                      onQuickTaskCreated={fetchTasks}
                      projectId={currentProjectId || ""}
                      availableAssignees={availableAssignees}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Standard view
            <SortableContext 
              items={columns.map(col => `column-${col.id}`)}
              strategy={horizontalListSortingStrategy}
              disabled={!isAdmin}
            >
              <div className="flex gap-6 min-w-fit">
                {filteredColumns.map((column) => (
                  <EnhancedKanbanColumn
                    key={column.id}
                    column={column}
                    onAddTask={handleAddTask}
                    onEditTask={handleEditTask}
                    onDeleteTask={handleDeleteTask}
                    onViewTask={handleViewTask}
                    isDraggable={isAdmin}
                    viewMode={viewMode}
                    selectedTasks={selectedTasks}
                    onTaskSelectionChange={setSelectedTasks}
                    showQuickAdd={showQuickAdd}
                    onShowQuickAdd={setShowQuickAdd}
                    onQuickTaskCreated={fetchTasks}
                    projectId={currentProjectId || ""}
                    availableAssignees={availableAssignees}
                  />
                ))}
              </div>
            </SortableContext>
          )}
          <DragOverlay>
            {activeTask ? (
              <div className="rotate-2 opacity-90">
                <TaskCard task={activeTask} compact={viewMode === 'compact'} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Enhanced Task Dialog */}
      <EnhancedTaskDialog
        open={taskDialog.isOpen}
        onOpenChange={(open) => setTaskDialog({ isOpen: open })}
        task={taskDialog.task}
        projectId={currentProjectId || ""}
        columnId={taskDialog.columnId}
        swimlaneId={taskDialog.swimlaneId}
        onTaskSaved={fetchTasks}
        availableAssignees={availableAssignees}
        availableTags={[]}
      />

      {/* Task Detail View Dialog */}
      {detailViewTask && (
        <EnhancedTaskDialog
          open={true}
          onOpenChange={(open) => !open && setDetailViewTask(null)}
          task={detailViewTask}
          projectId={currentProjectId || ""}
          onTaskSaved={fetchTasks}
          availableAssignees={availableAssignees}
          availableTags={[]}
        />
      )}
    </div>
  );
}

export default KanbanBoard;
