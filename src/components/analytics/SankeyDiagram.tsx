import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

interface SankeyDiagramProps {
  projectId?: string;
}

interface FlowData {
  from: string;
  to: string;
  value: number;
  avgLatency: number;
}

export function SankeyDiagram({ projectId }: SankeyDiagramProps) {
  // Mock handoff flow data
  const flows: FlowData[] = [
    { from: 'Design', to: 'Engineering', value: 45, avgLatency: 2.3 },
    { from: 'Engineering', to: 'QA', value: 42, avgLatency: 1.8 },
    { from: 'QA', to: 'Product', value: 38, avgLatency: 3.2 },
    { from: 'Product', to: 'Marketing', value: 35, avgLatency: 1.5 },
    { from: 'Engineering', to: 'DevOps', value: 28, avgLatency: 0.9 },
    { from: 'Design', to: 'Marketing', value: 12, avgLatency: 4.1 },
  ];

  const nodes = Array.from(new Set([...flows.map(f => f.from), ...flows.map(f => f.to)]));
  const maxValue = Math.max(...flows.map(f => f.value));

  const getNodeColor = (index: number) => {
    const colors = [
      'hsl(var(--chart-1))',
      'hsl(var(--chart-2))',
      'hsl(var(--chart-3))',
      'hsl(var(--chart-4))',
      'hsl(var(--chart-5))',
    ];
    return colors[index % colors.length];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Handoff Flow Analysis</CardTitle>
        <CardDescription>
          Team handoff patterns and average latency (days)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Node legend */}
          <div className="flex flex-wrap gap-4">
            {nodes.map((node, index) => (
              <div key={node} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: getNodeColor(index) }}
                />
                <span className="text-sm font-medium">{node}</span>
              </div>
            ))}
          </div>

          {/* Flow visualization */}
          <div className="space-y-3">
            {flows.map((flow, index) => {
              const widthPercent = (flow.value / maxValue) * 100;
              const fromIndex = nodes.indexOf(flow.from);
              const toIndex = nodes.indexOf(flow.to);
              
              return (
                <div key={index} className="relative">
                  <div className="flex items-center gap-3">
                    <div className="w-24 text-sm font-medium text-right">{flow.from}</div>
                    <div className="flex-1 relative h-12 flex items-center">
                      <div 
                        className="h-full rounded-lg transition-all hover:opacity-80 cursor-pointer relative overflow-hidden"
                        style={{ 
                          width: `${widthPercent}%`,
                          background: `linear-gradient(90deg, ${getNodeColor(fromIndex)} 0%, ${getNodeColor(toIndex)} 100%)`,
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="flex items-center gap-2 text-primary-foreground text-xs font-semibold">
                            <span>{flow.value}</span>
                            <ArrowRight className="h-3 w-3" />
                            <span>{flow.avgLatency}d</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="w-24 text-sm font-medium">{flow.to}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold">{flows.reduce((sum, f) => sum + f.value, 0)}</div>
              <div className="text-xs text-muted-foreground">Total Handoffs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {(flows.reduce((sum, f) => sum + f.avgLatency, 0) / flows.length).toFixed(1)}d
              </div>
              <div className="text-xs text-muted-foreground">Avg Latency</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{nodes.length}</div>
              <div className="text-xs text-muted-foreground">Teams</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
