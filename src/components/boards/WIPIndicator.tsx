import { AlertTriangle, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WIPStatus, ColumnMetadata } from "@/types/kanban";

interface WIPIndicatorProps {
  currentCount: number;
  metadata?: ColumnMetadata;
  className?: string;
}

export function WIPIndicator({ currentCount, metadata, className }: WIPIndicatorProps) {
  const wipLimit = metadata?.wip || {};
  const { soft, hard } = wipLimit;

  // Determine WIP status
  let status: WIPStatus = 'ok';
  let limit = soft || hard;

  if (hard && currentCount >= hard) {
    status = 'hard';
    limit = hard;
  } else if (soft && currentCount >= soft) {
    status = 'soft';
    limit = soft;
  }

  // No limits configured
  if (!soft && !hard) {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>
        {currentCount}
      </span>
    );
  }

  // OK status
  if (status === 'ok') {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>
        {currentCount}/{limit}
      </span>
    );
  }

  // Soft limit exceeded (warning)
  if (status === 'soft') {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "gap-1 border-warning bg-warning/10 text-warning",
          className
        )}
      >
        <AlertTriangle className="h-3 w-3" />
        {currentCount}/{limit}
      </Badge>
    );
  }

  // Hard limit exceeded (blocked)
  return (
    <Badge 
      variant="destructive" 
      className={cn("gap-1", className)}
    >
      <Ban className="h-3 w-3" />
      {currentCount}/{limit} BLOCKED
    </Badge>
  );
}
