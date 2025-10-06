import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, Users, CheckSquare2, Settings, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProjectNavigation } from "@/hooks/useProjectNavigation";
import { format } from "date-fns";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { InviteMemberDialog } from "@/components/team/InviteMemberDialog";
import { enableOutpagedBrand } from "@/lib/featureFlags";
import { StatusChip } from "@/components/outpaged/StatusChip";
import { useProjectId } from "@/hooks/useProjectId";

interface ProjectRecord {
  id: string;
  name: string;
  description?: string | null;
  status?: string | null;
  code?: string | null;
  end_date?: string | null;
  created_at?: string;
}

function LegacyProjectDetails({ overrideProjectId }: { overrideProjectId?: string }) {
  const paramsProjectId = useProjectId();
  const projectId = overrideProjectId || paramsProjectId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { navigateToProjectSettings } = useProjectNavigation();
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);

  const {
    data: project,
    error: projectError,
    isLoading: projectLoading,
  } = useQuery<ProjectRecord | null>({
    queryKey: ['project', projectId],
    enabled: Boolean(projectId && user),
    queryFn: async () => {
      if (!projectId) {
        throw new Error('Missing project identifier');
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data as ProjectRecord | null;
    },
  });

  const fetchTasks = useCallback(async () => {
    if (!projectId) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }, [projectId]);

  const fetchMembers = useCallback(async () => {
    if (!projectId) return;

    try {
      const { data, error } = await supabase
        .from('project_members')
        .select(`
          *,
          profiles!project_members_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('project_id', projectId);

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !user) {
      setTasks([]);
      setMembers([]);
      return;
    }

    fetchTasks();
    fetchMembers();
  }, [projectId, user, fetchTasks, fetchMembers]);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'completed':
        return 'secondary';
      case 'on_hold':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'completed':
        return 'Completed';
      case 'on_hold':
        return 'On Hold';
      case 'planning':
        return 'Planning';
      default:
        return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'review':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300';
      case 'todo':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Project Not Specified</h2>
          <p className="text-muted-foreground">Select a project from the list to view its details.</p>
          <Button
            onClick={() => navigate('/dashboard/projects')}
            className="mt-4"
          >
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground">Please log in to view project details</p>
        </div>
      </div>
    );
  }

  if (projectLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-muted-foreground">Loading project details...</div>
      </div>
    );
  }

  if (projectError) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Error Loading Project</h2>
          <p className="text-muted-foreground">We couldn't load this project. Please try again.</p>
          <Button
            onClick={() => navigate('/dashboard/projects')}
            className="mt-4"
          >
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
          <p className="text-muted-foreground">The project you're looking for doesn't exist or you don't have access to it.</p>
          <Button 
            onClick={() => navigate('/dashboard/projects')}
            className="mt-4"
          >
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/dashboard/projects')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Projects
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">{project.description}</p>
          <div className="flex items-center gap-4">
            <Badge variant={getStatusVariant(project.status)}>
              {formatStatus(project.status)}
            </Badge>
            {project.end_date && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Due {format(new Date(project.end_date), "MMM dd, yyyy")}
              </div>
            )}
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigateToProjectSettings(project)}
        >
          <Settings className="w-4 h-4 mr-2" />
          Settings
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Project Overview</h3>
            <Button size="sm" onClick={() => setShowCreateTask(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Task
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tasks.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tasks.filter(t => t.status === 'done').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{members.length}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              {tasks.length === 0 && (
                <Button variant="outline" size="sm" onClick={() => setShowCreateTask(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Task
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Created {format(new Date(task.created_at), "MMM dd, yyyy")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
                {tasks.length === 0 && (
                  <div className="text-center py-8">
                    <CheckSquare2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No tasks yet. Create your first task to get started!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Project Tasks</h3>
            <Button size="sm" onClick={() => setShowCreateTask(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
          <div className="space-y-3">
            {tasks.length === 0 ? (
              <Card className="p-8">
                <div className="text-center space-y-4">
                  <CheckSquare2 className="w-12 h-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="text-lg font-medium">No tasks yet</p>
                    <p className="text-muted-foreground">Create your first task to get started</p>
                  </div>
                  <Button onClick={() => setShowCreateTask(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Task
                  </Button>
                </div>
              </Card>
            ) : (
              tasks.map((task) => (
                <Card key={task.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium">{task.title}</h4>
                        <Badge className={getPriorityColor(task.priority)}>
                          {task.priority}
                        </Badge>
                        <Badge className={getStatusColor(task.status)}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Created {format(new Date(task.created_at), "MMM dd, yyyy")}</span>
                        {task.due_date && (
                          <span>Due {format(new Date(task.due_date), "MMM dd, yyyy")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Team Members</h3>
            <Button size="sm" onClick={() => setShowInviteMember(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Invite Member
            </Button>
          </div>
          <div className="space-y-3">
            {members.length === 0 ? (
              <Card className="p-8">
                <div className="text-center space-y-4">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="text-lg font-medium">No team members yet</p>
                    <p className="text-muted-foreground">Invite team members to collaborate</p>
                  </div>
                  <Button onClick={() => setShowInviteMember(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Invite Member
                  </Button>
                </div>
              </Card>
            ) : (
              members.map((member) => (
                <Card key={member.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium">{member.profiles?.full_name || 'Unknown'}</h4>
                        <p className="text-sm text-muted-foreground capitalize">{member.role}</p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Joined {format(new Date(member.joined_at), "MMM dd, yyyy")}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      <CreateTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        projectId={projectId!}
        onTaskCreated={fetchTasks}
      />

      <InviteMemberDialog
        open={showInviteMember}
        onOpenChange={setShowInviteMember}
        projectId={projectId!}
        onMemberAdded={fetchMembers}
      />
    </div>
  );
}

function OutpagedProjectDetails() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="space-y-1">
        <StatusChip variant="accent">Campaign</StatusChip>
        <h1 className="text-3xl font-semibold tracking-tight text-[hsl(var(--foreground))]">Marketing</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))]">Sloliday campaign</p>
      </div>

      <Card className="rounded-3xl border-none shadow-soft">
        <CardContent className="space-y-6 p-8">
          <div className="rounded-2xl border border-[hsl(var(--chip-neutral))] bg-[hsl(var(--chip-neutral))]/40 px-4 py-3 text-sm font-semibold text-[hsl(var(--muted-foreground))]">
            Blocked until release cleared
          </div>

          <div className="grid gap-6 text-sm text-[hsl(var(--foreground))] sm:grid-cols-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">Start Date</p>
              <p className="text-base font-semibold">Holiday promotion</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">Owner</p>
              <p className="text-base font-semibold">Megan Lee</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">Status</p>
              <StatusChip variant="warning">Blocked</StatusChip>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">Next review</p>
              <p className="text-base font-semibold">December 1, 2024</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ProjectDetails({ overrideProjectId }: { overrideProjectId?: string }) {
  if (enableOutpagedBrand) {
    return <OutpagedProjectDetails />;
  }

  return <LegacyProjectDetails overrideProjectId={overrideProjectId} />;
}
