import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, Loader2, Calendar as CalendarIcon, User, Tag, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { InlineEditField } from '@/components/tasks/InlineEditField';
import { RichTextEditor } from '@/components/rich-text/RichTextEditor';
import { useTaskFieldUpdate } from '@/hooks/useTaskFieldUpdate';
import { useIsMobile } from '@/hooks/useDevice';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { TaskPriority, TaskStatus } from '@/types/tasks';
import { getPriorityLabel, mapLegacyPriority } from '@/lib/priorityMapping';
import { CommentsSystemWithMentions } from '@/components/comments/CommentsSystemWithMentions';
import { LinkedResourcesPanel } from '@/components/linked/LinkedResourcesPanel';

const PRIORITY_OPTIONS: TaskPriority[] = ["P0", "P1", "P2", "P3", "P4"];
const STATUS_OPTIONS: TaskStatus[] = ["todo", "in_progress", "in_review", "done", "blocked", "waiting"];

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  P0: "bg-red-500 text-white",
  P1: "bg-orange-500 text-white",
  P2: "bg-yellow-600 text-white",
  P3: "bg-blue-500 text-white",
  P4: "bg-gray-500 text-white",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "bg-slate-500 text-white",
  in_progress: "bg-blue-500 text-white",
  in_review: "bg-purple-500 text-white",
  done: "bg-green-500 text-white",
  blocked: "bg-red-500 text-white",
  waiting: "bg-amber-500 text-white",
};

export default function TaskView() {
  const { taskId, taskKey: taskKeyParam } = useParams();
  const navigate = useNavigate();
  const { mutateAsync: updateField } = useTaskFieldUpdate();
  const isMobile = useIsMobile();

  // Dev-only: Log component mount
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log(`[TaskView] mounted for taskId=${taskId}, taskKey=${taskKeyParam}`);
    }
  }, [taskId, taskKeyParam]);

  const { data: task, isLoading, error } = useQuery({
    queryKey: ['task', taskId, taskKeyParam],
    queryFn: async () => {
      // Support both UUID (taskId) and project code format (taskKey)
      if (taskKeyParam) {
        // Parse taskKey like "IRP-1" into project code and ticket number
        const match = taskKeyParam.match(/^([A-Z0-9]+)-(\d+)$/);
        if (!match) throw new Error('Invalid task key format');
        
        const [, projectCode, ticketNumberStr] = match;
        const ticketNumber = parseInt(ticketNumberStr, 10);

        const { data, error } = await supabase
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
          .eq('projects.code', projectCode)
          .eq('ticket_number', ticketNumber)
          .single();
        
        if (error) throw error;
        return data;
      } else if (taskId) {
        // Fallback to UUID lookup
        const { data, error } = await supabase
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
          .eq('id', taskId)
          .single();
        
        if (error) throw error;
        return data;
      }
      
      throw new Error('No task identifier provided');
    },
    retry: 1
  });

  const handleBackClick = () => {
    if (task?.project_id) {
      navigate(`/projects/${task.project_id}`);
    } else {
      navigate('/board');
    }
  };

  const handleFieldUpdate = async (field: string, value: any) => {
    if (!taskId) return;
    await updateField({ taskId, field, value });
  };

  const handleDescriptionUpdate = async (html: string) => {
    await handleFieldUpdate('description', html);
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
  const taskKey = task.ticket_number && project?.code ? `${project.code}-${task.ticket_number}` : null;

  return (
    <div className={cn(
      "container mx-auto p-3 max-w-7xl",
      "lg:p-6"
    )}>
      {/* Header */}
      <div className={cn(
        "mb-4 flex items-center gap-2",
        "lg:mb-6 lg:gap-4"
      )}>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleBackClick}
          className={cn(
            "p-1",
            "lg:p-2"
          )}
        >
          <ChevronLeft className={cn(
            "h-4 w-4",
            "lg:h-5 lg:w-5"
          )} />
        </Button>
        
        <div className={cn(
          "flex items-center gap-1 text-xs text-muted-foreground",
          "lg:gap-2 lg:text-sm"
        )}>
          <span>{project?.name || 'Project'}</span>
          <span>/</span>
          <span>{taskKey || 'Task'}</span>
        </div>
      </div>

      {/* Two-Column Layout */}
      <div className={cn(
        "flex flex-col gap-4",
        "lg:grid lg:grid-cols-[2fr_1fr] lg:gap-6"
      )}>
        {/* Left Column - Main Content */}
        <div className={cn(
          "space-y-4",
          "lg:space-y-6"
        )}>
          {/* Title */}
          <Card>
            <CardContent className={cn(
              "pt-4 px-3",
              "lg:pt-6 lg:px-6"
            )}>
              <InlineEditField
                value={task.title}
                onSave={(value) => handleFieldUpdate('title', value)}
                placeholder="Task title"
                displayAs="heading"
              />
              {taskKey && (
                <div className="mt-2 text-sm text-muted-foreground">{taskKey}</div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader className={cn(
              "px-3 py-3",
              "lg:px-6 lg:py-4"
            )}>
              <h3 className={cn(
                "text-base font-semibold",
                "lg:text-lg"
              )}>Description</h3>
            </CardHeader>
            <CardContent className={cn(
              "px-3 pb-3",
              "lg:px-6 lg:pb-6"
            )}>
              <RichTextEditor
                value={task.description || ''}
                onChange={handleDescriptionUpdate}
                placeholder="Add a description..."
                autosaveEnabled
                autosaveKey={`task-${taskId}-description`}
                minHeight={200}
              />
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader className={cn(
              "px-3 py-3",
              "lg:px-6 lg:py-4"
            )}>
              <h3 className={cn(
                "text-base font-semibold",
                "lg:text-lg"
              )}>Comments</h3>
            </CardHeader>
            <CardContent className={cn(
              "px-3 pb-3",
              "lg:px-6 lg:pb-6"
            )}>
              <CommentsSystemWithMentions
                entityType="task"
                entityId={taskId || ''}
                projectId={task.project_id}
              />
            </CardContent>
          </Card>

          {/* Linked Resources */}
          <LinkedResourcesPanel
            entityType="task"
            entityId={taskId || ''}
            projectId={task.project_id}
            title="Linked resources"
            allowManualLink={true}
          />
        </div>

        {/* Right Column - Metadata */}
        <div className={cn(
          "space-y-4",
          "lg:space-y-6"
        )}>
          {/* Status */}
          <Card>
            <CardContent className={cn(
              "pt-4 px-3 pb-3",
              "lg:pt-6 lg:px-6 lg:pb-6"
            )}>
              <div className={cn(
                "space-y-3",
                "lg:space-y-4"
              )}>
                <div className={cn(
                  "space-y-1.5",
                  "lg:space-y-2"
                )}>
                  <label className={cn(
                    "text-xs font-medium text-muted-foreground",
                    "lg:text-sm"
                  )}>Status</label>
                  <Select
                    value={task.status}
                    onValueChange={(value) => handleFieldUpdate('status', value)}
                  >
                    <SelectTrigger className={cn(
                      "h-10",
                      "lg:h-auto"
                    )}>
                      <SelectValue>
                        <Badge className={cn("rounded-md", STATUS_COLORS[task.status as TaskStatus])}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>
                          <Badge className={cn("rounded-md", STATUS_COLORS[status])}>
                            {status.replace('_', ' ')}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className={cn(
                  "space-y-1.5",
                  "lg:space-y-2"
                )}>
                  <label className={cn(
                    "text-xs font-medium text-muted-foreground",
                    "lg:text-sm"
                  )}>Priority</label>
                  <Select
                    value={task.priority}
                    onValueChange={(value) => handleFieldUpdate('priority', value)}
                  >
                    <SelectTrigger className={cn(
                      "h-10",
                      "lg:h-auto"
                    )}>
                      <SelectValue>
                        <Badge className={cn("rounded-md", PRIORITY_COLORS[task.priority as TaskPriority])}>
                          {getPriorityLabel(task.priority as TaskPriority)}
                        </Badge>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITY_OPTIONS.map((priority) => (
                        <SelectItem key={priority} value={priority}>
                          <Badge className={cn("rounded-md", PRIORITY_COLORS[priority])}>
                            {getPriorityLabel(priority)}
                          </Badge>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dates */}
          <Card>
            <CardContent className={cn(
              "pt-4 px-3 pb-3",
              "lg:pt-6 lg:px-6 lg:pb-6"
            )}>
              <div className={cn(
                "space-y-3",
                "lg:space-y-4"
              )}>
                <div className={cn(
                  "space-y-1.5",
                  "lg:space-y-2"
                )}>
                  <label className={cn(
                    "text-xs font-medium text-muted-foreground",
                    "lg:text-sm"
                  )}>Due Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal text-sm h-10",
                          "lg:text-base lg:h-auto",
                          !task.due_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {task.due_date ? format(new Date(task.due_date), "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={task.due_date ? new Date(task.due_date) : undefined}
                        onSelect={(date) => handleFieldUpdate('due_date', date?.toISOString())}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Effort */}
          <Card>
            <CardContent className={cn(
              "pt-4 px-3 pb-3",
              "lg:pt-6 lg:px-6 lg:pb-6"
            )}>
              <div className={cn(
                "space-y-3",
                "lg:space-y-4"
              )}>
                <div className={cn(
                  "space-y-1.5",
                  "lg:space-y-2"
                )}>
                  <label className={cn(
                    "text-xs font-medium text-muted-foreground",
                    "lg:text-sm"
                  )}>Story Points</label>
                  <InlineEditField
                    value={task.story_points?.toString() || ''}
                    onSave={async (value) => handleFieldUpdate('story_points', value ? parseInt(value) : null)}
                    placeholder="0"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardContent className={cn(
              "pt-4 px-3 pb-3",
              "lg:pt-6 lg:px-6 lg:pb-6"
            )}>
              <div className={cn(
                "space-y-2 text-xs",
                "lg:text-sm"
              )}>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{format(new Date(task.created_at), "PPP")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated</span>
                  <span>{format(new Date(task.updated_at), "PPP")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
