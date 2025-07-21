import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Link, GitBranch, Copy, ArrowRight, ArrowLeft } from 'lucide-react';
import { TaskRelationship } from '@/hooks/useTaskRelationships';

interface TaskRelationshipIndicatorProps {
  relationships: TaskRelationship[];
  taskId: string;
  compact?: boolean;
}

const relationshipTypeConfig = {
  blocks: {
    icon: ArrowRight,
    label: 'Blocks',
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  depends_on: {
    icon: ArrowLeft,
    label: 'Depends on',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  duplicates: {
    icon: Copy,
    label: 'Duplicates',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  relates_to: {
    icon: Link,
    label: 'Relates to',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
  },
};

export function TaskRelationshipIndicator({
  relationships,
  taskId,
  compact = false,
}: TaskRelationshipIndicatorProps) {
  if (!relationships.length) return null;

  // Group relationships by type
  const relationshipGroups = relationships.reduce((acc, rel) => {
    const key = rel.relationship_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(rel);
    return acc;
  }, {} as Record<string, TaskRelationship[]>);

  if (compact) {
    // Show just a count badge for compact mode
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="text-xs">
              <GitBranch className="w-3 h-3 mr-1" />
              {relationships.length}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">Task Relationships:</p>
              {Object.entries(relationshipGroups).map(([type, rels]) => {
                const config = relationshipTypeConfig[type as keyof typeof relationshipTypeConfig];
                return (
                  <div key={type} className="flex items-center gap-2">
                    <config.icon className="w-3 h-3" />
                    <span className="text-sm">{config.label}: {rels.length}</span>
                  </div>
                );
              })}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Show detailed relationship indicators
  return (
    <div className="flex flex-wrap gap-1">
      {Object.entries(relationshipGroups).map(([type, rels]) => {
        const config = relationshipTypeConfig[type as keyof typeof relationshipTypeConfig];
        const Icon = config.icon;
        
        return (
          <TooltipProvider key={type}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={`text-xs ${config.color}`}>
                  <Icon className="w-3 h-3 mr-1" />
                  {rels.length}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-medium">{config.label}:</p>
                  {rels.map((rel) => {
                    const isSource = rel.source_task_id === taskId;
                    const otherTaskTitle = isSource ? rel.target_task_title : rel.source_task_title;
                    return (
                      <div key={rel.id} className="text-sm">
                        {otherTaskTitle}
                      </div>
                    );
                  })}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}