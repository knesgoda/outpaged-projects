
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StandardizedTaskCard, StandardizedTask } from "@/components/ui/standardized-task-card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface TaskCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: StandardizedTask;
  onEdit?: (task: StandardizedTask) => void;
  onDelete?: (taskId: string) => void;
  onCreateSubTask?: (task: StandardizedTask) => void;
}

export function TaskCardDialog({ 
  open, 
  onOpenChange, 
  task, 
  onEdit, 
  onDelete, 
  onCreateSubTask 
}: TaskCardDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">Task Details</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="mt-4">
          <StandardizedTaskCard
            task={task}
            onEdit={onEdit}
            onDelete={onDelete}
            onCreateSubTask={onCreateSubTask}
            compact={false}
            showProject={true}
            interactive={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
