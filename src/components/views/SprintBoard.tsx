import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Calendar, TrendingUp, Target, Zap } from "lucide-react";

interface Sprint {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  goal?: string;
  status: "planning" | "active" | "completed";
}

interface Task {
  id: string;
  title: string;
  status?: string;
  story_points?: number;
  sprint_id?: string;
}

interface SprintBoardProps {
  sprints: Sprint[];
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
}

export function SprintBoard({ sprints, tasks, onTaskClick }: SprintBoardProps) {
  const [selectedSprint, setSelectedSprint] = useState(sprints[0]?.id);

  const currentSprint = sprints.find(s => s.id === selectedSprint);
  const sprintTasks = tasks.filter(t => t.sprint_id === selectedSprint);

  const totalPoints = sprintTasks.reduce((sum, task) => sum + (task.story_points || 0), 0);
  const completedPoints = sprintTasks
    .filter(t => t.status === "done")
    .reduce((sum, task) => sum + (task.story_points || 0), 0);
  const inProgressPoints = sprintTasks
    .filter(t => t.status === "in_progress")
    .reduce((sum, task) => sum + (task.story_points || 0), 0);

  const completionPercentage = totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0;

  // Mock burndown data
  const burndownData = [
    { day: "Day 1", ideal: 100, actual: 100 },
    { day: "Day 2", ideal: 90, actual: 95 },
    { day: "Day 3", ideal: 80, actual: 85 },
    { day: "Day 4", ideal: 70, actual: 75 },
    { day: "Day 5", ideal: 60, actual: 60 },
    { day: "Day 6", ideal: 50, actual: 50 },
    { day: "Day 7", ideal: 40, actual: 40 },
    { day: "Day 8", ideal: 30, actual: 35 },
    { day: "Day 9", ideal: 20, actual: 25 },
    { day: "Day 10", ideal: 10, actual: 15 },
  ];

  // Mock velocity data
  const velocityData = [
    { sprint: "Sprint 1", committed: 45, completed: 42 },
    { sprint: "Sprint 2", committed: 50, completed: 48 },
    { sprint: "Sprint 3", committed: 55, completed: 52 },
    { sprint: "Sprint 4", committed: 50, completed: 55 },
    { sprint: "Sprint 5", committed: 60, completed: 58 },
  ];

  const avgVelocity = velocityData.reduce((sum, s) => sum + s.completed, 0) / velocityData.length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{currentSprint?.name}</h2>
          <p className="text-muted-foreground">{currentSprint?.goal}</p>
        </div>
        <div className="flex gap-2">
          {sprints.map(sprint => (
            <Badge
              key={sprint.id}
              variant={sprint.id === selectedSprint ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedSprint(sprint.id)}
            >
              {sprint.name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPoints}</div>
            <p className="text-xs text-muted-foreground">
              {sprintTasks.length} tasks in sprint
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedPoints}</div>
            <Progress value={completionPercentage} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inProgressPoints}</div>
            <p className="text-xs text-muted-foreground">
              Story points active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Velocity</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(avgVelocity)}</div>
            <p className="text-xs text-muted-foreground">
              Points per sprint
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="burndown" className="space-y-4">
        <TabsList>
          <TabsTrigger value="burndown">Burndown Chart</TabsTrigger>
          <TabsTrigger value="velocity">Velocity Tracking</TabsTrigger>
        </TabsList>

        <TabsContent value="burndown">
          <Card>
            <CardHeader>
              <CardTitle>Sprint Burndown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={burndownData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="ideal" stroke="#94a3b8" strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="actual" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="velocity">
          <Card>
            <CardHeader>
              <CardTitle>Team Velocity</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={velocityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="sprint" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="committed" stroke="#94a3b8" strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="completed" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
