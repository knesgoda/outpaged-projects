import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar, Workflow } from "lucide-react";
import { boardConfigService, type BoardMode } from "@/services/boards/boardConfigService";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface BoardModeToggleProps {
  boardId: string;
  currentMode: BoardMode;
  onModeChange?: (mode: BoardMode) => void;
  disabled?: boolean;
}

export function BoardModeToggle({
  boardId,
  currentMode,
  onModeChange,
  disabled = false,
}: BoardModeToggleProps) {
  const [mode, setMode] = useState<BoardMode>(currentMode);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleToggle = async (checked: boolean) => {
    const newMode: BoardMode = checked ? 'scrum' : 'kanban';
    setIsUpdating(true);

    try {
      await boardConfigService.updateBoardMode(boardId, newMode);
      setMode(newMode);
      onModeChange?.(newMode);
      
      toast({
        title: "Board mode updated",
        description: `Switched to ${newMode === 'scrum' ? 'Scrum' : 'Kanban'} mode`,
      });
    } catch (error) {
      console.error('Error updating board mode:', error);
      toast({
        title: "Error",
        description: "Failed to update board mode",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-3 px-4 py-2 bg-muted/50 rounded-lg border">
        <Workflow className="h-4 w-4 text-muted-foreground" />
        <Label htmlFor="board-mode" className="text-sm font-medium cursor-pointer">
          Kanban
        </Label>
        <Tooltip>
          <TooltipTrigger asChild>
            <div>
              <Switch
                id="board-mode"
                checked={mode === 'scrum'}
                onCheckedChange={handleToggle}
                disabled={disabled || isUpdating}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="max-w-xs">
              {mode === 'kanban' 
                ? 'Switch to Scrum mode to use sprints and time-boxed iterations'
                : 'Switch to Kanban mode for continuous flow without sprints'
              }
            </p>
          </TooltipContent>
        </Tooltip>
        <Label htmlFor="board-mode" className="text-sm font-medium cursor-pointer">
          Scrum
        </Label>
        <Calendar className="h-4 w-4 text-muted-foreground" />
      </div>
    </TooltipProvider>
  );
}
