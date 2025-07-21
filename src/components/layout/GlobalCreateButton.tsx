
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, FileText, FolderPlus, Users, Calendar } from "lucide-react";
import { TaskDialog } from "@/components/kanban/TaskDialog";
import { ProjectDialog } from "@/components/projects/ProjectDialog";
import { useAuth } from "@/hooks/useAuth";

export function GlobalCreateButton() {
  const { user } = useAuth();
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);

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
            onClick={() => setShowTaskDialog(true)}
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

      <TaskDialog
        isOpen={showTaskDialog}
        onClose={() => setShowTaskDialog(false)}
        onSave={async () => {
          setShowTaskDialog(false);
          // Refresh current page data if needed
          window.location.reload();
        }}
      />

      <ProjectDialog
        open={showProjectDialog}
        onOpenChange={setShowProjectDialog}
        onProjectCreated={() => {
          setShowProjectDialog(false);
          // Refresh current page data if needed
          window.location.reload();
        }}
      />
    </>
  );
}
