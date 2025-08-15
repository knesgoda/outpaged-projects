import React from "react";
import { Badge } from "@/components/ui/badge";
import { GitBranch, AlertTriangle, Link } from "lucide-react";
import { useTaskRelationships } from "@/hooks/useTaskRelationships";

interface TaskRelationshipIndicatorProps {
  taskId: string;
  showCount?: boolean;
}

export const TaskRelationshipIndicator = ({ taskId, showCount = true }: TaskRelationshipIndicatorProps) => {
  const { relationships, loading } = useTaskRelationships(taskId);

  if (loading || relationships.length === 0) {
    return null;
  }

  const blockedBy = relationships.filter(
    (r) => r.relationship_type === "depends_on" && r.source_task_id === taskId
  );
  
  const blocking = relationships.filter(
    (r) => r.relationship_type === "blocks" && r.source_task_id === taskId
  );

  const hasBlockers = blockedBy.length > 0;
  const hasBlocking = blocking.length > 0;
  const totalRelationships = relationships.length;

  return (
    <div className="flex items-center gap-1">
      {hasBlockers && (
        <Badge variant="destructive" className="text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Blocked
        </Badge>
      )}
      
      {hasBlocking && (
        <Badge variant="outline" className="text-xs">
          <GitBranch className="h-3 w-3 mr-1" />
          Blocking
        </Badge>
      )}
      
      {showCount && totalRelationships > 0 && (
        <Badge variant="secondary" className="text-xs">
          <Link className="h-3 w-3 mr-1" />
          {totalRelationships}
        </Badge>
      )}
    </div>
  );
};