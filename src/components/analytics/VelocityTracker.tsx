import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";

interface Sprint {
  name: string;
  committed: number;
  completed: number;
  carryover: number;
}

const mockSprintData: Sprint[] = [
  { name: "Sprint 1", committed: 45, completed: 42, carryover: 3 },
  { name: "Sprint 2", committed: 50, completed: 48, carryover: 2 },
  { name: "Sprint 3", committed: 55, completed: 52, carryover: 3 },
  { name: "Sprint 4", committed: 50, completed: 55, carryover: 0 },
  { name: "Sprint 5", committed: 60, completed: 58, carryover: 2 },
  { name: "Sprint 6", committed: 55, completed: 57, carryover: 0 },
];

export function VelocityTracker() {
  const recentSprints = mockSprintData.slice(-3);
  const avgVelocity = recentSprints.reduce((sum, s) => sum + s.completed, 0) / recentSprints.length;
  const avgCommitment = recentSprints.reduce((sum, s) => sum + s.committed, 0) / recentSprints.length;
  const commitmentAccuracy = (avgVelocity / avgCommitment) * 100;

  const latestSprint = mockSprintData[mockSprintData.length - 1];
  const previousSprint = mockSprintData[mockSprintData.length - 2];
  const velocityChange = latestSprint.completed - previousSprint.completed;
  const velocityTrend = velocityChange > 0 ? "up" : velocityChange < 0 ? "down" : "stable";

  // Forecast for next 3 sprints using average velocity
  const forecastData = [
    { name: latestSprint.name, actual: latestSprint.completed, forecast: null },
    { name: "Next Sprint", actual: null, forecast: Math.round(avgVelocity) },
    { name: "Sprint +2", actual: null, forecast: Math.round(avgVelocity * 0.95) },
    { name: "Sprint +3", actual: null, forecast: Math.round(avgVelocity * 1.05) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Velocity Tracking</h2>
        <p className="text-muted-foreground">Monitor team velocity and forecast capacity</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Velocity</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgVelocity)}</div>
            <p className="text-xs text-muted-foreground">
              Story points per sprint
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Sprint</CardTitle>
            {velocityTrend === "up" && <TrendingUp className="h-4 w-4 text-green-500" />}
            {velocityTrend === "down" && <TrendingDown className="h-4 w-4 text-red-500" />}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestSprint.completed}</div>
            <p className="text-xs text-muted-foreground">
              {velocityChange > 0 && `+${velocityChange}`}
              {velocityChange < 0 && velocityChange}
              {velocityChange === 0 && "No change"} vs last sprint
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Commitment Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(commitmentAccuracy)}%</div>
            <p className="text-xs text-muted-foreground">
              Completed vs committed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Carryover</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestSprint.carryover}</div>
            <p className="text-xs text-muted-foreground">
              Points not completed
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sprint Velocity Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockSprintData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="committed" fill="#94a3b8" name="Committed" />
                <Bar dataKey="completed" fill="hsl(var(--primary))" name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Velocity Forecast</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2} 
                  name="Actual"
                  connectNulls={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="forecast" 
                  stroke="#94a3b8" 
                  strokeWidth={2} 
                  strokeDasharray="5 5" 
                  name="Forecast"
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Based on the last 3 sprints, your team's average velocity is{" "}
                <span className="font-semibold text-foreground">{Math.round(avgVelocity)} points</span>.
                You can expect to complete approximately{" "}
                <span className="font-semibold text-foreground">
                  {Math.round(avgVelocity * 3)}
                </span>{" "}
                points over the next 3 sprints.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
