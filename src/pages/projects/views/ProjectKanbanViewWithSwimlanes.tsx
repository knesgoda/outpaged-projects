import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { SwimlaneKanbanBoard } from "@/components/boards/SwimlaneKanbanBoard";
import { LoadingState } from "@/components/boards/LoadingState";
import { ErrorBoundary } from "@/components/boards/ErrorBoundary";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { SwimlaneMode } from "@/types/kanban";

export function ProjectKanbanViewWithSwimlanes() {
  const { projectId } = useParams<{ projectId: string }>();
  const [tasks, setTasks] = useState<any[]>([]);
  const [columns, setColumns] = useState<any[]>([]);
  const [swimlaneMode, setSwimlaneMode] = useState<SwimlaneMode>('none');
  const [customField, setCustomField] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (projectId) {
      loadBoardData();
    }
  }, [projectId]);

  const loadBoardData = async () => {
    if (!projectId) return;

    try {
      setIsLoading(true);

      // Load columns
      const { data: columnsData, error: columnsError } = await supabase
        .from('kanban_columns')
        .select('*')
        .eq('project_id', projectId)
        .order('position');

      if (columnsError) throw columnsError;

      // Load tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:profiles!tasks_assignee_id_fkey(
            id,
            full_name,
            avatar_url
          ),
          epic:tasks!tasks_parent_id_fkey(
            id,
            title
          ),
          project:projects(
            id,
            name,
            color
          )
        `)
        .eq('project_id', projectId)
        .not('status', 'eq', 'archived')
        .order('position');

      if (tasksError) throw tasksError;

      setColumns(columnsData || []);
      setTasks(tasksData || []);

      // Load saved swimlane preference from boards settings
      const { data: board } = await supabase
        .from('boards')
        .select('settings')
        .eq('project_id', projectId)
        .single();

      if (board?.settings) {
        const settings = board.settings as any;
        setSwimlaneMode(settings.swimlane_mode || 'none');
        setCustomField(settings.customField);
      }
    } catch (error) {
      console.error('Error loading board data:', error);
      toast({
        title: "Error",
        description: "Failed to load board data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskMove = async (taskId: string, toColumnId: string, toLaneValue: any) => {
    try {
      // Update task status and lane field if needed
      const updates: any = {
        column_id: toColumnId,
        status: toColumnId, // Assuming column_id matches status
      };

      // Update lane-specific field if swimlanes are active
      if (swimlaneMode !== 'none' && toLaneValue !== undefined) {
        switch (swimlaneMode) {
          case 'assignee':
            updates.assignee_id = toLaneValue;
            break;
          case 'priority':
            updates.priority = toLaneValue;
            break;
          case 'epic':
            updates.parent_id = toLaneValue;
            break;
          case 'project':
            updates.project_id = toLaneValue;
            break;
          case 'custom_field':
            if (customField) {
              updates[customField] = toLaneValue;
            }
            break;
        }
      }

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      // Optimistically update local state
      setTasks(prev =>
        prev.map(task =>
          task.id === taskId ? { ...task, ...updates } : task
        )
      );

      toast({
        title: "Task moved",
        description: "Task updated successfully",
      });
    } catch (error) {
      console.error('Error moving task:', error);
      toast({
        title: "Error",
        description: "Failed to move task",
        variant: "destructive",
      });
      // Reload to sync state
      loadBoardData();
    }
  };

  const handleSwimlaneConfigChange = async (mode: SwimlaneMode, field?: string) => {
    setSwimlaneMode(mode);
    setCustomField(field);

    // Persist to database
    try {
      const { error } = await supabase
        .from('boards')
        .update({
          settings: {
            swimlane_mode: mode,
            customField: field,
          },
        })
        .eq('project_id', projectId);

      if (error) throw error;

      toast({
        title: "Swimlane configuration saved",
        description: `Grouping by: ${mode}`,
      });
    } catch (error) {
      console.error('Error saving swimlane config:', error);
    }
  };

  if (isLoading) {
    return <LoadingState type="spinner" />;
  }

  return (
    <ErrorBoundary>
      <div className="h-full">
        <SwimlaneKanbanBoard
          tasks={tasks}
          columns={columns}
          swimlaneMode={swimlaneMode}
          customField={customField}
          onTaskMove={handleTaskMove}
          onSwimlaneConfigChange={handleSwimlaneConfigChange}
        />
      </div>
    </ErrorBoundary>
  );
}
