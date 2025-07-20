import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Badge } from "@/components/ui/badge";
import { Calendar, Flag, Users } from 'lucide-react';

interface MilestoneNodeData {
  title: string;
  description: string;
  status: 'planned' | 'in_progress' | 'completed' | 'at_risk';
  startDate: string;
  endDate: string;
  progress: number;
  team: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

const statusColors = {
  planned: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/20 text-primary',
  completed: 'bg-success/20 text-success',
  at_risk: 'bg-destructive/20 text-destructive',
};

const priorityColors = {
  low: 'bg-muted text-muted-foreground',
  medium: 'bg-warning/20 text-warning',
  high: 'bg-destructive/20 text-destructive',
  critical: 'bg-destructive text-destructive-foreground',
};

function MilestoneNode({ data }: { data: MilestoneNodeData }) {
  return (
    <div className="bg-card border border-border rounded-lg shadow-medium p-4 min-w-[280px] max-w-[320px]">
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-primary border-2 border-background" />
      
      <div className="space-y-3">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-foreground leading-tight text-sm">{data.title}</h3>
            <div className="flex gap-1">
              <Badge className={statusColors[data.status]} variant="secondary">
                {data.status.replace('_', ' ')}
              </Badge>
              <Badge className={priorityColors[data.priority]} variant="secondary">
                <Flag className="w-2 h-2 mr-1" />
                {data.priority}
              </Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">{data.description}</p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Progress</span>
            <span className="text-xs font-medium">{data.progress}%</span>
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full">
            <div 
              className={`h-1.5 rounded-full transition-all ${
                data.status === 'completed' ? 'bg-success' :
                data.status === 'in_progress' ? 'bg-primary' :
                data.status === 'at_risk' ? 'bg-destructive' :
                'bg-muted-foreground'
              }`}
              style={{ width: `${data.progress}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{data.startDate} - {data.endDate}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{data.team}</span>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-primary border-2 border-background" />
    </div>
  );
}

export default memo(MilestoneNode);