import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GitBranch } from "lucide-react";

export function ScenarioManager() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          Scenarios
        </CardTitle>
        <CardDescription>
          Create what-if scenarios to test capacity planning strategies
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-96 items-center justify-center rounded-lg border border-dashed">
          <div className="text-center space-y-2">
            <GitBranch className="h-12 w-12 mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Scenario management coming soon</p>
            <p className="text-sm text-muted-foreground">
              Branch, compare, and merge capacity planning scenarios
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
