import { Link } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CalendarTask } from "@/types/calendar";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

function formatDate(value?: string | null) {
  if (!value) return "Unscheduled";
  try {
    return format(parseISO(value), "MMM d, yyyy");
  } catch (error) {
    return value;
  }
}

interface TaskPreviewDrawerProps {
  task: CalendarTask | null;
  open: boolean;
  onClose: () => void;
  projectName?: string;
}

export function TaskPreviewDrawer({ task, open, onClose, projectName }: TaskPreviewDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{task?.title ?? "Task"}</SheetTitle>
          <SheetDescription>
            <span className="block text-sm text-muted-foreground">
              {projectName ?? task?.project_id ?? "Unknown project"}
            </span>
          </SheetDescription>
        </SheetHeader>
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
              <Badge variant="secondary" className="capitalize">
                {task?.status ?? "Unknown"}
              </Badge>
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-muted-foreground">Assignee</h3>
              <p className="text-sm">
                {task?.assignee ?? "Unassigned"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Start</p>
                <p className="font-medium">{formatDate(task?.start_date)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Due</p>
                <p className={cn("font-medium", !task?.due_date && "text-muted-foreground")}>{formatDate(task?.due_date)}</p>
              </div>
            </div>
            <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              TODO: Quick date edits
            </div>
          </div>
        </ScrollArea>
        <div className="flex items-center justify-between gap-2">
          <Button asChild className="flex-1" variant="default">
            <Link to={task ? `/projects/${task.project_id}/tasks/${task.id}` : "#"}>
              Open task
            </Link>
          </Button>
          <Button variant="outline" onClick={onClose} className="flex-1">
            Close
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
