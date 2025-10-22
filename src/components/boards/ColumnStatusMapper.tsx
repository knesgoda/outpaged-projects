import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { statusService, type TaskStatus } from "@/services/boards/statusService";
import { useToast } from "@/hooks/use-toast";
import { X, Plus } from "lucide-react";

interface ColumnStatusMapperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columnId: string;
  columnName: string;
  projectId: string;
  currentStatusKeys: string[];
  onUpdate?: () => void;
}

export function ColumnStatusMapper({
  open,
  onOpenChange,
  columnId,
  columnName,
  projectId,
  currentStatusKeys,
  onUpdate,
}: ColumnStatusMapperProps) {
  const [allStatuses, setAllStatuses] = useState<TaskStatus[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>(currentStatusKeys);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadStatuses();
      setSelectedKeys(currentStatusKeys);
    }
  }, [open, projectId, currentStatusKeys]);

  const loadStatuses = async () => {
    try {
      const data = await statusService.getProjectStatuses(projectId);
      setAllStatuses(data);
    } catch (error) {
      console.error('Error loading statuses:', error);
      toast({
        title: "Error",
        description: "Failed to load statuses",
        variant: "destructive",
      });
    }
  };

  const handleToggleStatus = (key: string) => {
    setSelectedKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    if (selectedKeys.length === 0) {
      toast({
        title: "Validation Error",
        description: "Column must have at least one status mapped",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await statusService.updateColumnStatusMapping(columnId, selectedKeys);
      toast({
        title: "Success",
        description: "Column status mapping updated",
      });
      onUpdate?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating column status mapping:', error);
      toast({
        title: "Error",
        description: "Failed to update status mapping",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedStatuses = allStatuses.filter((s) => selectedKeys.includes(s.key));
  const availableStatuses = allStatuses.filter((s) => !selectedKeys.includes(s.key));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Map Statuses to Column</DialogTitle>
          <DialogDescription>
            Configure which statuses belong to the "{columnName}" column. Tasks with any of these
            statuses will appear in this column.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium mb-2">
              Selected Statuses ({selectedKeys.length})
            </h3>
            {selectedStatuses.length === 0 ? (
              <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground text-sm">
                No statuses selected. Click on statuses below to add them.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedStatuses.map((status) => (
                  <Badge
                    key={status.id}
                    variant="secondary"
                    className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-destructive/10"
                    onClick={() => handleToggleStatus(status.key)}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    {status.name}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium mb-2">
              Available Statuses ({availableStatuses.length})
            </h3>
            {availableStatuses.length === 0 ? (
              <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground text-sm">
                All statuses are mapped to this column.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availableStatuses.map((status) => (
                  <Badge
                    key={status.id}
                    variant="outline"
                    className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-accent"
                    onClick={() => handleToggleStatus(status.key)}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    {status.name}
                    <Plus className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || selectedKeys.length === 0}>
              {isSaving ? "Saving..." : "Save Mapping"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
