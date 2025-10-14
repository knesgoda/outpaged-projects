
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, FileText, FolderPlus, Users, Calendar } from "lucide-react";
import { CreateTaskDialog } from "@/components/tasks/CreateTaskDialog";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCreateTask } from "@/hooks/useCreateTask";

export function GlobalCreateButton() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [defaultProjectId, setDefaultProjectId] = useState<string | null>(null);
  const { openCreateTask, dialogProps } = useCreateTask({ projectId: defaultProjectId });

  useEffect(() => {
    // Fetch the user's first available project as default
    const fetchDefaultProject = async () => {
      if (!user) return;
      
      try {
        // First, try to get projects owned by the user
        const { data: ownedProjects } = await supabase
          .from('projects')
          .select('id')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (ownedProjects && ownedProjects.length > 0) {
          setDefaultProjectId(ownedProjects[0].id);
          return;
        }

        // If no owned projects, get projects where user is a member
        const { data: memberProjects } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', user.id)
          .limit(1);

        if (memberProjects && memberProjects.length > 0) {
          setDefaultProjectId(memberProjects[0].project_id);
        }
      } catch (error) {
        // If no projects found, we'll handle this in the task creation
        console.log('No default project found');
      }
    };

    fetchDefaultProject();
  }, [user]);

  const handleCreateTask = () => {
    if (!defaultProjectId) {
      toast({
        title: "No Project Available",
        description: "Please create a project first before creating tasks.",
        variant: "destructive",
      });
      return;
    }
    openCreateTask({
      projectId: defaultProjectId,
      defaults: { assigneeIds: user ? [user.id] : [] },
      onTaskCreated: (_, meta) => {
        if (!meta?.pending) {
          toast({
            title: "Success",
            description: "Task created successfully!",
          });
          window.location.reload();
        }
      },
    });
  };

  if (!user) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            size="sm" 
            className="bg-gradient-primary hover:opacity-90 shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem 
            onClick={handleCreateTask}
            className="cursor-pointer"
          >
            <FileText className="w-4 h-4 mr-2" />
            New Task
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => setShowProjectDialog(true)}
            className="cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            New Project
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer">
            <Users className="w-4 h-4 mr-2" />
            Invite Team Member
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Calendar className="w-4 h-4 mr-2" />
            Schedule Meeting
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {dialogProps && <CreateTaskDialog {...dialogProps} />}

      <ProjectDialog
        open={showProjectDialog}
        onOpenChange={setShowProjectDialog}
      />
    </>
  );
}
