import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TaskDialog } from '@/components/kanban/TaskDialog';
import { LinkedResourcesPanel } from '@/components/linked/LinkedResourcesPanel';
import { useState } from 'react';
import { toast } from 'sonner';
import { enableOutpagedBrand } from '@/lib/featureFlags';
import { StatusChip } from '@/components/outpaged/StatusChip';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

export default function TaskView() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch task by ID
  const { data: task, isLoading, error } = useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!taskId) throw new Error('Task ID is required');

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
      if (task.project_id) {
        navigate(`/dashboard/projects/${task.project_id}`);
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

  const mapStatusChip = (status?: string): { label: string; variant: StatusTone } => {
    switch (status) {
      case 'done':
      case 'packaged':
        return { label: 'Packaged', variant: 'success' };
      case 'in_progress':
        return { label: 'In Progress', variant: 'accent' };
      case 'in_review':
        return { label: 'In Review', variant: 'success' };
      case 'todo':
      default:
        return { label: 'To Do', variant: 'neutral' };
    }
  };

  const formatDueDate = (due?: string) => {
    if (!due) {
      return 'April 16, 2024';
    }

    try {
      return new Date(due).toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (err) {
      console.error('Failed to format due date', err);
      return 'April 16, 2024';
    }
  };

  const brandChecklist = [
    { label: 'Design QA complete', required: true, checked: true },
    { label: 'Specifications attached', required: true, checked: false },
    { label: 'Accessibility review logged', checked: false },
    { label: 'Add final assets to bundle', checked: false },
  ];

  const brandApprovals = [
    { name: 'Satoshi', status: 'Awaiting review' },
  ];

  const brandTask = {
    id: task.ticket_number ? `OP-${task.ticket_number}` : 'OP-1289',
    title: task.title || 'Library UI polish',
    description: task.description || 'Library screen of the new UI needs a final review',
    dueDate: formatDueDate(task.due_date),
    owner: (task as any)?.handoff_owner || 'Monica Lee',
    projectName: project?.name || 'Design Systems',
    status: mapStatusChip(task.status),
  };

  if (enableOutpagedBrand) {
    return (
      <>
        <OutpagedTaskDetail
          task={brandTask}
          checklist={brandChecklist}
          approvals={brandApprovals}
          onBack={handleBackClick}
          onEdit={handleEditTask}
        />
        <TaskDialog
          task={{
            ...task,
            tags: [],
            comments: 0,
            attachments: 0
          }}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSave={() => toast.success('Task updated')}
        />
      </>
    );
  }

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
                  className={`text-primary-foreground ${getStatusColor(task.status)}`}
                >
                  {task.status?.replace('_', ' ')}
                </Badge>
                <Badge 
                  variant="secondary" 
                  className={`text-primary-foreground ${getPriorityColor(task.priority)}`}
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

      <LinkedResourcesPanel
        entityType="task"
        entityId={task.id}
        projectId={task.project_id}
        className="mb-6"
      />

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

interface BrandChecklistItem {
  label: string;
  required?: boolean;
  checked?: boolean;
}

interface BrandApprovalItem {
  name: string;
  status: string;
}

interface OutpagedTaskDetailProps {
  task: {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    owner: string;
    projectName: string;
    status: { label: string; variant: StatusTone };
  };
  checklist: BrandChecklistItem[];
  approvals: BrandApprovalItem[];
  onBack: () => void;
  onEdit: () => void;
}

function OutpagedTaskDetail({ task, checklist, approvals, onBack, onEdit }: OutpagedTaskDetailProps) {
  const [items, setItems] = useState(checklist);

  const handleToggle = (index: number) => {
    setItems((prev) =>
      prev.map((item, idx) =>
        idx === index
          ? {
              ...item,
              checked: !item.checked,
            }
          : item
      )
    );
  };

  const ctaLabel = task.status.label === "Packaged" ? "Create Software bundle" : "Send for approval";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="flex items-center gap-2 px-0 text-sm font-semibold">
          <ChevronLeft className="h-4 w-4" />
          Back to handoff
        </Button>
        <StatusChip variant={task.status.variant}>{task.status.label}</StatusChip>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="rounded-3xl border-none shadow-soft">
          <CardContent className="space-y-6 p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[hsl(var(--muted-foreground))]">
                  {task.projectName}
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">{task.title}</h1>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{task.id}</p>
              </div>
              <Button
                className="rounded-full bg-accent px-6 py-2 text-sm font-semibold text-accent-foreground shadow-soft hover:bg-accent/90"
                onClick={onEdit}
              >
                {ctaLabel}
              </Button>
            </div>

            <p className="text-sm leading-6 text-[hsl(var(--muted-foreground))] whitespace-pre-wrap">{task.description}</p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl border-none shadow-soft">
            <CardContent className="space-y-4 p-6">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[hsl(var(--muted-foreground))]">Handoff</p>
                <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Due {task.dueDate}</h2>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-[hsl(var(--chip-neutral))] bg-[hsl(var(--chip-neutral))]/30 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{task.owner}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Handoff owner</p>
                </div>
                <StatusChip variant="warning">Handoff pending</StatusChip>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <label
                    key={item.label}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-[hsl(var(--chip-neutral))] bg-[hsl(var(--card))] px-4 py-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => handleToggle(index)}
                        className="h-4 w-4"
                      />
                      <span className="font-semibold text-[hsl(var(--foreground))]">{item.label}</span>
                    </div>
                    {item.required && (
                      <span className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--accent))]">Required</span>
                    )}
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-soft">
            <CardContent className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Approvals</h2>
                <StatusChip variant="neutral">{approvals.length} pending</StatusChip>
              </div>

              <div className="space-y-3">
                {approvals.map((approval) => (
                  <div
                    key={approval.name}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-[hsl(var(--chip-neutral))] bg-[hsl(var(--card))] px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src="" alt={approval.name} />
                        <AvatarFallback>{approval.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{approval.name}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{approval.status}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-full border border-[hsl(var(--chip-neutral))] px-3 py-1 text-xs font-semibold"
                    >
                      Remind
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}