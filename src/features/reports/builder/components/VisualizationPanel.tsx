import { useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { BarChart2, PieChart, Table } from "lucide-react";
import type { ReportQuery, MetricDefinition } from "@/server/analytics/types";

const VISUALIZATIONS = [
  { id: "table", label: "Table", icon: Table },
  { id: "bar", label: "Bar", icon: BarChart2 },
  { id: "pie", label: "Pie", icon: PieChart },
];

type VisualizationQuery = ReportQuery & { visualization?: string };

interface VisualizationPanelProps {
  query: VisualizationQuery;
  onQueryChange: (query: VisualizationQuery) => void;
  onAddMetric: (metric: MetricDefinition) => void;
}

export function VisualizationPanel({ query, onQueryChange, onAddMetric }: VisualizationPanelProps) {
  const options = useMemo(() => VISUALIZATIONS, []);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Visualization</h3>
        <Select
          value={query.visualization ?? "table"}
          onValueChange={(value) => onQueryChange({ ...query, visualization: value })}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                <span className="flex items-center gap-2">
                  <option.icon className="h-4 w-4" />
                  {option.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Calculated Metrics</h3>
        <Button
          variant="outline"
          onClick={() =>
            onAddMetric({
              id: `metric_${Date.now()}`,
              label: "New Metric",
              column: "events",
              aggregation: "sum",
            })
          }
        >
          Add Quick Metric
        </Button>
      </div>
    </div>
  );
}
