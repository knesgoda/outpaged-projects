import { useState } from "react";
import { ChevronDown, ChevronRight, AlertCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { SwimlaneDefinition } from "@/services/boards/swimlaneService";

interface SwimlaneRowProps {
  lane: SwimlaneDefinition;
  isCollapsed?: boolean;
  onToggleCollapse?: (laneId: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function SwimlaneRow({
  lane,
  isCollapsed = false,
  onToggleCollapse,
  children,
  className,
}: SwimlaneRowProps) {
  const handleToggle = () => {
    onToggleCollapse?.(lane.id);
  };

  const hasBlockedTasks = (lane.blockedCount || 0) > 0;

  return (
    <div className={cn("swimlane-row border-b", className)}>
      {/* Lane Header */}
      <div
        className={cn(
          "sticky left-0 z-10 flex items-center gap-2 px-4 py-3 bg-muted/50 border-r min-w-[200px] max-w-[200px]",
          lane.isExpedite && "bg-red-500/10 border-red-500/30"
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={handleToggle}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>

        {lane.color && (
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: lane.color }}
          />
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {lane.name}
            </span>
            {lane.isExpedite && (
              <Badge variant="destructive" className="text-xs px-1 py-0">
                Expedite
              </Badge>
            )}
          </div>

          {/* Lane Metrics */}
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="font-medium">{lane.count || 0}</span>
              <span>tasks</span>
            </span>

            {lane.storyPoints !== undefined && lane.storyPoints > 0 && (
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                <span className="font-medium">{lane.storyPoints}</span>
                <span>pts</span>
              </span>
            )}

            {hasBlockedTasks && (
              <Badge variant="destructive" className="text-xs px-1 py-0 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {lane.blockedCount}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Lane Content (columns with tasks) */}
      {!isCollapsed && (
        <div className="swimlane-content flex">
          {children}
        </div>
      )}

      {isCollapsed && (
        <div className="px-4 py-2 text-sm text-muted-foreground bg-muted/20">
          {lane.count || 0} tasks collapsed
        </div>
      )}
    </div>
  );
}
