import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  CheckCircle2, 
  AlertTriangle,
  BarChart3 
} from "lucide-react";

interface Sprint {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  committedPoints: number;
  completedPoints: number;
  addedMidSprint: number;
  removedMidSprint: number;
  carryoverPoints: number;
  velocity: number;
  defectsFound: number;
  defectsFixed: number;
}

export function SprintMetrics() {
  const currentSprint: Sprint = {
    id: "1",
    name: "Sprint 23",
    startDate: "2025-01-27",
    endDate: "2025-02-10",
    committedPoints: 45,
    completedPoints: 38,
    addedMidSprint: 8,
    removedMidSprint: 3,
    carryoverPoints: 7,
    velocity: 38,
    defectsFound: 2,
    defectsFixed: 2,
  };

  const historicalSprints: Sprint[] = [
    {
      id: "2",
      name: "Sprint 22",
      startDate: "2025-01-13",
      endDate: "2025-01-26",
      committedPoints: 42,
      completedPoints: 43,
      addedMidSprint: 5,
      removedMidSprint: 2,
      carryoverPoints: 1,
      velocity: 43,
      defectsFound: 1,
      defectsFixed: 1,
    },
    {
      id: "3",
      name: "Sprint 21",
      startDate: "2024-12-30",
      endDate: "2025-01-12",
      committedPoints: 40,
      completedPoints: 38,
      addedMidSprint: 6,
      removedMidSprint: 4,
      carryoverPoints: 2,
      velocity: 38,
      defectsFound: 3,
      defectsFixed: 2,
    },
  ];

  const calculateCommitmentAccuracy = (sprint: Sprint) => {
    return ((sprint.completedPoints / sprint.committedPoints) * 100).toFixed(0);
  };

  const calculateScopeChange = (sprint: Sprint) => {
    const totalChange = sprint.addedMidSprint + sprint.removedMidSprint;
    return ((totalChange / sprint.committedPoints) * 100).toFixed(0);
  };

  const averageVelocity = historicalSprints.reduce((sum, s) => sum + s.velocity, 0) / historicalSprints.length;
  const velocityTrend = currentSprint.velocity > averageVelocity ? "up" : "down";

  return (
    <div className="space-y-6">
      {/* Current Sprint Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{currentSprint.name}</CardTitle>
              <CardDescription>
                {currentSprint.startDate} - {currentSprint.endDate}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {currentSprint.velocity} points
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Committed</span>
                </div>
                <div className="text-2xl font-bold mt-2">{currentSprint.committedPoints}</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">Completed</span>
                </div>
                <div className="text-2xl font-bold mt-2 text-green-600">
                  {currentSprint.completedPoints}
                </div>
                <Progress 
                  value={(currentSprint.completedPoints / currentSprint.committedPoints) * 100} 
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-muted-foreground">Carryover</span>
                </div>
                <div className="text-2xl font-bold mt-2 text-orange-600">
                  {currentSprint.carryoverPoints}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  {velocityTrend === "up" ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className="text-sm text-muted-foreground">Velocity</span>
                </div>
                <div className={`text-2xl font-bold mt-2 ${velocityTrend === "up" ? "text-green-600" : "text-red-600"}`}>
                  {currentSprint.velocity}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg: {averageVelocity.toFixed(1)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics */}
          <div className="grid gap-4 md:grid-cols-3 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Commitment Accuracy</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {calculateCommitmentAccuracy(currentSprint)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Completed vs. committed points
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Scope Change</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {calculateScopeChange(currentSprint)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Added: {currentSprint.addedMidSprint}, Removed: {currentSprint.removedMidSprint}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quality</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {currentSprint.defectsFixed}/{currentSprint.defectsFound}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Defects fixed / found
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Historical Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Sprint History
          </CardTitle>
          <CardDescription>Last 3 sprints performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {historicalSprints.map((sprint) => (
              <div key={sprint.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{sprint.name}</span>
                    <Badge variant="secondary">{sprint.velocity} points</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Committed:</span> {sprint.committedPoints}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Completed:</span> {sprint.completedPoints}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Accuracy:</span> {calculateCommitmentAccuracy(sprint)}%
                    </div>
                  </div>
                  <Progress 
                    value={(sprint.completedPoints / sprint.committedPoints) * 100} 
                    className="mt-2"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card className="border-blue-500/50 bg-blue-500/10">
        <CardHeader>
          <CardTitle className="text-base">Sprint Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
              <span>
                Commitment accuracy is {calculateCommitmentAccuracy(currentSprint)}% - 
                {Number(calculateCommitmentAccuracy(currentSprint)) > 90 ? " excellent consistency" : " room for improvement"}
              </span>
            </li>
            <li className="flex items-start gap-2">
              {currentSprint.carryoverPoints > 5 ? (
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
              )}
              <span>
                {currentSprint.carryoverPoints} points carried over - 
                {currentSprint.carryoverPoints > 5 ? " consider reducing scope" : " healthy sprint completion"}
              </span>
            </li>
            <li className="flex items-start gap-2">
              {Number(calculateScopeChange(currentSprint)) > 20 ? (
                <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
              )}
              <span>
                {calculateScopeChange(currentSprint)}% scope change mid-sprint - 
                {Number(calculateScopeChange(currentSprint)) > 20 ? " high volatility detected" : " stable sprint scope"}
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
