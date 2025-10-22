import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface BacklogCardProps {
  task: any;
  onRefresh?: () => void;
  className?: string;
}

const priorityColors = {
  urgent: "border-destructive bg-destructive/5 text-destructive",
  high: "border-orange-500 bg-orange-500/5 text-orange-700",
  medium: "border-blue-500 bg-blue-500/5 text-blue-700",
  low: "border-muted bg-muted/5 text-muted-foreground",
};

export function BacklogCard({ task, onRefresh, className }: BacklogCardProps) {
  const priorityColor = priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.medium;

  return (
    <Card 
      className={cn(
        "p-3 cursor-move hover:shadow-md transition-shadow",
        task.blocked && "opacity-60",
        className
      )}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
        
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              "font-medium text-sm line-clamp-2",
              task.blocked && "line-through"
            )}>
              {task.title}
            </h4>
            
            {task.blocked && (
              <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge 
              variant="outline" 
              className={cn("text-xs", priorityColor)}
            >
              {task.priority}
            </Badge>

            {task.story_points && (
              <Badge variant="secondary" className="text-xs">
                {task.story_points} pts
              </Badge>
            )}

            {task.estimate_hours && (
              <Badge variant="secondary" className="text-xs">
                {task.estimate_hours}h
              </Badge>
            )}

            {task.labels && task.labels.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {task.labels[0]}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
