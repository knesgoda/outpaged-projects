import { useMemo } from "react";
import { useProject } from "@/contexts/ProjectContext";
import { CumulativeFlowDiagram } from "./analytics/CumulativeFlowDiagram";
import { subDays, format } from "date-fns";

export function AnalyticsDashboard() {
  const { project } = useProject();

  // Generate mock CFD data for demonstration
  const cfdData = useMemo(() => {
    const days = 30;
    const data = [];
    const columns = [
      { name: "Backlog", color: "#6b7280" },
      { name: "Todo", color: "#3b82f6" },
      { name: "In Progress", color: "#f59e0b" },
      { name: "In Review", color: "#8b5cf6" },
      { name: "Done", color: "#10b981" },
    ];

    for (let i = days; i >= 0; i--) {
      const date = format(subDays(new Date(), i), "MMM d");
      const point: any = { date };
      
      // Generate cumulative counts
      point["Backlog"] = Math.max(0, 50 - i * 0.5);
      point["Todo"] = Math.max(0, 40 - i * 0.4);
      point["In Progress"] = Math.min(15, i * 0.3);
      point["In Review"] = Math.min(10, i * 0.2);
      point["Done"] = Math.min(50, i * 1.2);
      
      data.push(point);
    }

    return { data, columns };
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Board Analytics</h2>
        <p className="text-muted-foreground">
          Track flow metrics and performance for {project.name}
        </p>
      </div>

      <CumulativeFlowDiagram 
        data={cfdData.data} 
        columns={cfdData.columns}
      />
    </div>
  );
}
