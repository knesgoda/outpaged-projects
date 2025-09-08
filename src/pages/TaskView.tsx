import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TaskDialog } from '@/components/kanban/TaskDialog';
import { useState } from 'react';
import { toast } from 'sonner';

export default function TaskView() {
  const { projectId, code, taskNumber } = useParams();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch task by project ID/code and task number
  const { data: task, isLoading, error } = useQuery({
    queryKey: ['task', projectId || code, taskNumber],
    queryFn: async () => {
      let query = supabase
        .from('tasks')
        .select(`
          *,
          project_id,
          projects!inner (
            id,
            name,
            code
          )
        `)
        .eq('ticket_number', parseInt(taskNumber || '0'));

      // Filter by project ID or code
      if (projectId) {
        query = query.eq('project_id', projectId);
      } else if (code) {
        query = query.eq('projects.code', code);
      }

      const { data, error } = await query.single();
      
      if (error) {
        console.error('Error fetching task:', error);
        throw error;
      }
      
      return data;
    },
    retry: 1
  });

  const handleBackClick = () => {
    if (task?.projects) {
      const project = Array.isArray(task.projects) ? task.projects[0] : task.projects;
      if (projectId) {
        navigate(`/dashboard/projects/${projectId}`);
      } else if (project?.code) {
        navigate(`/dashboard/projects/code/${project.code}`);
      } else {
        navigate('/dashboard/board');
      }
    } else {
      navigate('/dashboard/tasks');
    }
  };

  const handleEditTask = () => {
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Task Not Found</h2>
          <p className="text-muted-foreground mb-4">
            The task you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={handleBackClick}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const project = Array.isArray(task.projects) ? task.projects[0] : task.projects;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-slate-500';
      case 'in_progress': return 'bg-blue-500';
      case 'in_review': return 'bg-purple-500';
      case 'done': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header with breadcrumb */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleBackClick}
          className="p-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{project?.name || 'Project'}</span>
          <span>/</span>
          <span>Task #{task.ticket_number}</span>
        </div>
      </div>

      {/* Task Details Card */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">{task.title}</CardTitle>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge 
                  variant="secondary" 
                  className={`text-white ${getStatusColor(task.status)}`}
                >
                  {task.status?.replace('_', ' ')}
                </Badge>
                <Badge 
                  variant="secondary" 
                  className={`text-white ${getPriorityColor(task.priority)}`}
                >
                  {task.priority}
                </Badge>
                <Badge variant="outline">
                  {task.task_type?.replace('_', ' ')}
                </Badge>
                {task.story_points && (
                  <Badge variant="outline">
                    {task.story_points} pts
                  </Badge>
                )}
              </div>
            </div>
            <Button onClick={handleEditTask}>
              Edit Task
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {task.description && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Description</h3>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-wrap">{task.description}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Created:</span>{' '}
              {new Date(task.created_at).toLocaleDateString()}
            </div>
            <div>
              <span className="font-medium">Updated:</span>{' '}
              {new Date(task.updated_at).toLocaleDateString()}
            </div>
            {task.due_date && (
              <div>
                <span className="font-medium">Due Date:</span>{' '}
                {new Date(task.due_date).toLocaleDateString()}
              </div>
            )}
            {task.hierarchy_level && (
              <div>
                <span className="font-medium">Type:</span>{' '}
                {task.hierarchy_level}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Task Dialog for editing */}
      <TaskDialog
        task={task ? {
          ...task,
          tags: [],
          comments: 0,
          attachments: 0
        } : null}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={async (updatedTask) => {
          setIsDialogOpen(false);
          toast.success('Task updated successfully');
          // Refresh the page to show updated data
          window.location.reload();
        }}
        projectId={task?.project_id}
      />
    </div>
  );
}