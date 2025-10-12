import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export function WorkloadTimeline() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Timeline View
        </CardTitle>
        <CardDescription>
          Gantt-style view of assignments with drag-to-adjust capabilities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-96 items-center justify-center rounded-lg border border-dashed">
          <div className="text-center space-y-2">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Timeline view coming soon</p>
            <p className="text-sm text-muted-foreground">
              Drag assignments, view dependencies, adjust durations
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
