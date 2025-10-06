import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { WorkloadTask } from "@/services/workload";
import { format } from "date-fns";

const MINUTES_PER_HOUR = 60;

function formatHours(minutes: number) {
  if (!minutes) return "0";
  const hours = minutes / MINUTES_PER_HOUR;
  return hours.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

type WorkloadTaskDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assigneeName: string;
  tasks: WorkloadTask[];
};

export function WorkloadTaskDrawer({ open, onOpenChange, assigneeName, tasks }: WorkloadTaskDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-lg sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{assigneeName}</SheetTitle>
          <SheetDescription>Tasks in the selected range</SheetDescription>
        </SheetHeader>
        <div className="mt-6 flex h-[80vh] flex-col">
          {tasks.length === 0 ? (
            <div className="mt-12 text-center text-sm text-muted-foreground">
              No tasks match the current filters.
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <ul className="space-y-4 pr-4">
                {tasks.map((task) => {
                  const dueDateValue = task.due_date ? new Date(task.due_date) : null;
                  const dueDate =
                    dueDateValue && !Number.isNaN(dueDateValue.getTime())
                      ? format(dueDateValue, "MMM d, yyyy")
                      : "No due date";
                  const isClosed = task.status ? ["done", "archived", "completed", "cancelled", "resolved"].includes(task.status.toLowerCase()) : false;

                  return (
                    <li key={task.id} className="rounded-lg border p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium leading-tight">{task.title}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>{dueDate}</span>
                            <span>Estimate {formatHours(task.estimate_minutes)}h</span>
                          </div>
                        </div>
                        <Badge variant={isClosed ? "secondary" : "outline"}>{task.status ?? "Unknown"}</Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ScrollArea>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
