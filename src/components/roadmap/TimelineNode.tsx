import { memo } from 'react';
import { Badge } from "@/components/ui/badge";

interface TimelineNodeData {
  quarter: string;
  year: string;
  milestones: number;
}

function TimelineNode({ data }: { data: TimelineNodeData }) {
  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 min-w-[140px] text-center">
      <div className="space-y-1">
        <h4 className="font-bold text-primary text-lg">{data.quarter}</h4>
        <p className="text-sm text-muted-foreground">{data.year}</p>
        <Badge variant="outline" className="text-xs">
          {data.milestones} milestones
        </Badge>
      </div>
    </div>
  );
}

export default memo(TimelineNode);