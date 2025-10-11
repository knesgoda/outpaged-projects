
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Task } from "./TaskCard";
import {
  bulkAddTasksToSprint,
  bulkAssignAssignee,
  bulkAssignLabels,
  bulkDeleteTasks,
  bulkLinkDependency,
  bulkMoveTasksToGroup,
  bulkUpdatePriority,
  bulkUpdateStatus,
  bulkUpdateWatchers,
} from "@/services/bulkTaskOperations";
import type { TaskDependencyType } from "@/types/tasks";
import Papa from "papaparse";
import { Trash2, Move, Calendar, Eye, GitBranch, Download } from "lucide-react";

interface BulkOperationsProps {
  selectedTasks: string[];
  onSelectionChange: (taskIds: string[]) => void;
  tasks: Task[];
  onOperationComplete: () => void;
  availableAssignees?: Array<{ id: string; name: string; avatar?: string }>;
  availableColumns?: Array<{ id: string; title: string }>;
  availableSwimlanes?: Array<{ id: string; name: string }>;
  availableSprints?: Array<{ id: string; name: string }>;
  availableLabels?: Array<{ id: string; label: string; color?: string | null }>;
  availableWatchers?: Array<{ id: string; name: string; avatar?: string }>;
}

export function BulkOperations({
  selectedTasks,
  onSelectionChange,
  tasks,
  onOperationComplete,
  availableAssignees = [],
  availableColumns = [],
  availableSwimlanes = [],
  availableSprints = [],
  availableLabels = [],
  availableWatchers = [],
}: BulkOperationsProps) {
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [dependencyDialogOpen, setDependencyDialogOpen] = useState(false);
  const [selectedDependencyTarget, setSelectedDependencyTarget] = useState<string>("");
  const [selectedDependencyType, setSelectedDependencyType] = useState<TaskDependencyType>("blocks");
  const { toast } = useToast();

  const isAllSelected = selectedTasks.length === tasks.length && tasks.length > 0;
  const isPartiallySelected = selectedTasks.length > 0 && selectedTasks.length < tasks.length;

  const selectedTaskDetails = useMemo(
    () => tasks.filter(task => selectedTasks.includes(task.id)),
    [tasks, selectedTasks]
  );

  const toggleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(tasks.map(task => task.id));
    }
  };

  const runBulkAction = async (
    action: () => Promise<unknown>,
    {
      success,
      error,
    }: { success: string; error: string }
  ) => {
    if (selectedTasks.length === 0) return false;

    const previousSelection = [...selectedTasks];

    setLoading(true);
    onSelectionChange([]);

    try {
      await action();
      toast({
        title: "Success",
        description: success,
      });
      onOperationComplete();
      return true;
    } catch (err) {
      console.error("Bulk operation failed", err);
      onSelectionChange(previousSelection);
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = (status: "todo" | "in_progress" | "in_review" | "done") =>
    runBulkAction(
      () => bulkUpdateStatus(selectedTasks, status),
      {
        success: `Moved ${selectedTasks.length} tasks to ${status.replace(/_/g, " ")}`,
        error: "Failed to update task status",
      }
    );

  const handlePriorityUpdate = (priority: "low" | "medium" | "high" | "urgent") =>
    runBulkAction(
      () => bulkUpdatePriority(selectedTasks, priority),
      {
        success: `Set ${selectedTasks.length} tasks to ${priority} priority`,
        error: "Failed to update priority",
      }
    );

  const handleAssign = (assigneeId: string) =>
    runBulkAction(
      () => bulkAssignAssignee(selectedTasks, assigneeId),
      {
        success: `Assigned ${selectedTasks.length} tasks`,
        error: "Failed to assign tasks",
      }
    );

  const handleMoveToGroup = (swimlaneId: string) =>
    runBulkAction(
      () => bulkMoveTasksToGroup(selectedTasks, swimlaneId),
      {
        success: `Moved ${selectedTasks.length} tasks to the selected group`,
        error: "Failed to move tasks to the group",
      }
    );

  const handleAddToSprint = (sprintId: string) =>
    runBulkAction(
      () => bulkAddTasksToSprint(selectedTasks, sprintId),
      {
        success: `Added ${selectedTasks.length} tasks to the sprint`,
        error: "Failed to add tasks to sprint",
      }
    );

  const handleLabelAssign = (labelId: string) =>
    runBulkAction(
      () => bulkAssignLabels(selectedTasks, labelId),
      {
        success: `Applied label to ${selectedTasks.length} tasks`,
        error: "Failed to assign label",
      }
    );

  const handleWatcherUpdate = (watcherId: string) =>
    runBulkAction(
      () => bulkUpdateWatchers(selectedTasks, [watcherId]),
      {
        success: `Added watcher to ${selectedTasks.length} tasks`,
        error: "Failed to update watchers",
      }
    );

  const handleLinkDependency = async () => {
    if (!selectedDependencyTarget) return;

    const success = await runBulkAction(
      () => bulkLinkDependency(selectedTasks, selectedDependencyTarget, selectedDependencyType),
      {
        success: `Linked dependency for ${selectedTasks.length} tasks`,
        error: "Failed to link dependency",
      }
    );

    if (success) {
      setDependencyDialogOpen(false);
      setSelectedDependencyTarget("");
      setSelectedDependencyType("blocks");
    }
  };

  const handleDelete = async () => {
    const success = await runBulkAction(
      () => bulkDeleteTasks(selectedTasks),
      {
        success: `Deleted ${selectedTasks.length} tasks`,
        error: "Failed to delete tasks",
      }
    );

    if (success) {
      setDeleteDialogOpen(false);
    }
  };

  const exportTasks = (format: "csv" | "json") => {
    if (selectedTaskDetails.length === 0) return;

    const fileName = `tasks-${format}-${new Date().toISOString().slice(0, 19)}.${format}`;

    if (format === "json") {
      const blob = new Blob([JSON.stringify(selectedTaskDetails, null, 2)], {
        type: "application/json",
      });
      triggerDownload(blob, fileName);
    } else {
      const csv = Papa.unparse(
        selectedTaskDetails.map(({ id, title, status, priority, assignees, due_date, swimlane_id }) => ({
          id,
          title,
          status,
          priority,
          swimlane: swimlane_id ?? "",
          assignees: assignees?.map((assignee) => assignee.name).join(", ") ?? "",
          due_date: due_date ?? "",
        }))
      );
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      triggerDownload(blob, fileName);
    }

    toast({
      title: "Export ready",
      description: `Downloaded ${selectedTaskDetails.length} tasks as ${format.toUpperCase()}`,
    });
  };

  const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (selectedTasks.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={toggleSelectAll}
              className={isPartiallySelected ? "data-[state=checked]:bg-primary/50" : ""}
            />
            <span>{selectedTasks.length} task{selectedTasks.length > 1 ? 's' : ''} selected</span>
          </div>
          <Badge variant="secondary">{selectedTasks.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {/* Status Updates */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusUpdate('todo')}
              disabled={loading}
            >
              → Todo
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusUpdate('in_progress')}
              disabled={loading}
            >
              → In Progress
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusUpdate('done')}
              disabled={loading}
            >
              → Done
            </Button>
          </div>

          {/* Priority Updates */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePriorityUpdate('low')}
              disabled={loading}
            >
              Low Priority
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePriorityUpdate('high')}
              disabled={loading}
            >
              High Priority
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePriorityUpdate('urgent')}
              disabled={loading}
            >
              Urgent
            </Button>
          </div>

          {/* Assignee Selection */}
          {availableAssignees.length > 0 && (
            <Select onValueChange={handleAssign}>
              <SelectTrigger className="w-[200px]" aria-label="Assign selected tasks">
                <SelectValue placeholder="Assign to..." />
              </SelectTrigger>
              <SelectContent>
                {availableAssignees.map((assignee) => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={assignee.avatar} />
                        <AvatarFallback className="text-xs">
                          {assignee.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {assignee.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Move to group */}
          {availableSwimlanes.length > 0 && (
            <Select onValueChange={handleMoveToGroup}>
              <SelectTrigger className="w-[200px]" aria-label="Move to group">
                <SelectValue placeholder="Move to group" />
              </SelectTrigger>
              <SelectContent>
                {availableSwimlanes.map((swimlane) => (
                  <SelectItem
                    key={swimlane.id}
                    value={swimlane.id}
                    data-testid={`bulk-move-group-${swimlane.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <Move className="w-4 h-4 text-muted-foreground" />
                      {swimlane.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Add to sprint */}
          {availableSprints.length > 0 && (
            <Select onValueChange={handleAddToSprint}>
              <SelectTrigger className="w-[200px]" aria-label="Add to sprint">
                <SelectValue placeholder="Add to sprint" />
              </SelectTrigger>
              <SelectContent>
                {availableSprints.map((sprint) => (
                  <SelectItem
                    key={sprint.id}
                    value={sprint.id}
                    data-testid={`bulk-sprint-${sprint.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      {sprint.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Label assignment */}
          {availableLabels.length > 0 && (
            <Select onValueChange={handleLabelAssign}>
              <SelectTrigger className="w-[200px]" aria-label="Assign label">
                <SelectValue placeholder="Assign label" />
              </SelectTrigger>
              <SelectContent>
                {availableLabels.map((label) => (
                  <SelectItem
                    key={label.id}
                    value={label.id}
                    data-testid={`bulk-label-${label.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{
                          backgroundColor: label.color ?? "var(--accent)",
                        }}
                      />
                      <span>{label.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Watcher updates */}
          {availableWatchers.length > 0 && (
            <Select onValueChange={handleWatcherUpdate}>
              <SelectTrigger className="w-[200px]" aria-label="Add watcher">
                <SelectValue placeholder="Add watcher" />
              </SelectTrigger>
              <SelectContent>
                {availableWatchers.map((watcher) => (
                  <SelectItem
                    key={watcher.id}
                    value={watcher.id}
                    data-testid={`bulk-watcher-${watcher.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={watcher.avatar} />
                        <AvatarFallback className="text-xs">
                          {watcher.name
                            .split(" ")
                            .map((part) => part[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                        <span>{watcher.name}</span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Dependency linking */}
          <Dialog open={dependencyDialogOpen} onOpenChange={setDependencyDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" disabled={loading} className="flex items-center gap-1">
                <GitBranch className="w-4 h-4" />
                Link dependency
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Link dependency</DialogTitle>
                <DialogDescription>
                  Select a task and dependency relationship to apply to the selected items.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <Select value={selectedDependencyTarget} onValueChange={setSelectedDependencyTarget}>
                  <SelectTrigger aria-label="Dependency target">
                    <SelectValue placeholder="Choose related task" />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks
                      .filter((task) => !selectedTasks.includes(task.id))
                      .map((task) => (
                        <SelectItem
                          key={task.id}
                          value={task.id}
                          data-testid={`bulk-dependency-target-${task.id}`}
                        >
                          {task.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                <Select value={selectedDependencyType} onValueChange={(value) => setSelectedDependencyType(value as TaskDependencyType)}>
                  <SelectTrigger aria-label="Dependency type">
                    <SelectValue placeholder="Select dependency type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blocks">Blocks</SelectItem>
                    <SelectItem value="blocked_by">Blocked by</SelectItem>
                    <SelectItem value="relates_to">Relates to</SelectItem>
                    <SelectItem value="duplicates">Duplicates</SelectItem>
                    <SelectItem value="fixes">Fixes</SelectItem>
                    <SelectItem value="caused_by">Caused by</SelectItem>
                    <SelectItem value="follows">Follows</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleLinkDependency}
                  disabled={loading || !selectedDependencyTarget}
                >
                  Link dependency
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Export */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              disabled={selectedTaskDetails.length === 0}
              onClick={() => exportTasks("csv")}
              className="flex items-center gap-1"
            >
              <Download className="w-4 h-4" /> CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={selectedTaskDetails.length === 0}
              onClick={() => exportTasks("json")}
              className="flex items-center gap-1"
            >
              <Download className="w-4 h-4" /> JSON
            </Button>
          </div>

          {/* Destructive Actions */}
          <div className="flex gap-1 ml-auto">
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={loading}
                  className="flex items-center gap-1"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {selectedTasks.length} tasks?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. All selected tasks will be permanently removed along with their history.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={loading}>
                    Delete tasks
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Hold Ctrl/Cmd and click tasks to select multiple, or use the checkbox above to select all
        </div>
      </CardContent>
    </Card>
  );
}
