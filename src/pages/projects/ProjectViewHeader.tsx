import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/features/boards/mobile";
import { Settings, Plus } from "lucide-react";
import type { BoardViewMode } from "@/types/boards";
import { useNavigate } from "react-router-dom";

interface ProjectViewHeaderProps {
  projectId: string;
  projectName: string;
  currentView: BoardViewMode;
  onViewChange: (view: BoardViewMode) => void;
  onAddTask?: () => void;
}

const VIEW_OPTIONS: { value: BoardViewMode; label: string }[] = [
  { value: "kanban", label: "Kanban" },
  { value: "table", label: "Table" },
  { value: "timeline", label: "Timeline" },
  { value: "calendar", label: "Calendar" },
];

export function ProjectViewHeader({
  projectId,
  projectName,
  currentView,
  onViewChange,
  onAddTask,
}: ProjectViewHeaderProps) {
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  return (
    <div className="border-b border-border bg-background">
      <div className="flex items-center justify-between p-4 lg:p-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl lg:text-2xl font-semibold truncate">
            {projectName}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop: Toggle Group */}
          {!isMobile && (
            <ToggleGroup
              type="single"
              value={currentView}
              onValueChange={(value) => {
                if (value) onViewChange(value as BoardViewMode);
              }}
              className="bg-muted p-1 rounded-lg"
            >
              {VIEW_OPTIONS.map((option) => (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  className="px-3 py-1.5 text-sm data-[state=on]:bg-background data-[state=on]:shadow-sm"
                >
                  {option.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}

          {/* Mobile: Dropdown */}
          {isMobile && (
            <Select value={currentView} onValueChange={(value) => onViewChange(value as BoardViewMode)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VIEW_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {onAddTask && (
            <Button onClick={onAddTask} size={isMobile ? "sm" : "default"}>
              <Plus className="h-4 w-4 mr-1" />
              {!isMobile && "Add Task"}
            </Button>
          )}

          <Button
            variant="ghost"
            size={isMobile ? "sm" : "default"}
            onClick={() => navigate(`/projects/${projectId}/settings`)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
