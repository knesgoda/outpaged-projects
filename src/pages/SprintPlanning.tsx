import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, 
  Play, 
  Square, 
  Target, 
  Calendar, 
  TrendingDown,
  CheckCircle,
  Clock,
  BarChart3,
  Users,
  Trophy,
  Zap
} from "lucide-react";
import { BacklogItem } from "./Backlog";

interface Sprint {
  id: string;
  name: string;
  goal: string;
  status: "planning" | "active" | "completed";
  startDate: Date;
  endDate: Date;
  capacity: number;
  items: BacklogItem[];
  burndownData: { day: number; remaining: number }[];
}

const mockSprints: Sprint[] = [];
const mockAvailableItems: BacklogItem[] = [];

const statusColors = {
  planning: "bg-warning/20 text-warning",
  active: "bg-success/20 text-success", 
  completed: "bg-muted text-muted-foreground",
};

export default function SprintPlanning() {
  const [sprints, setSprints] = useState<Sprint[]>(mockSprints);
  const [availableItems, setAvailableItems] = useState<BacklogItem[]>(mockAvailableItems);
  const [selectedSprint, setSelectedSprint] = useState<Sprint | null>(sprints[0]);

  const activeSprint = sprints.find(sprint => sprint.status === "active");
  const currentSprintPoints = activeSprint?.items.reduce((sum, item) => sum + (item.storyPoints || 0), 0) || 0;
  const sprintProgress = activeSprint ? (currentSprintPoints / activeSprint.capacity) * 100 : 0;

  const handleStartSprint = (sprintId: string) => {
    setSprints(prev => prev.map(sprint => 
      sprint.id === sprintId 
        ? { ...sprint, status: "active" as const, startDate: new Date() }
        : sprint
    ));
  };

  const handleCompleteSprint = (sprintId: string) => {
    setSprints(prev => prev.map(sprint => 
      sprint.id === sprintId 
        ? { ...sprint, status: "completed" as const, endDate: new Date() }
        : sprint
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sprint Planning</h1>
          <p className="text-muted-foreground">Plan and manage your development sprints</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Create Sprint
        </Button>
      </div>

      {/* Active Sprint Stats */}
      {activeSprint && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/10 rounded-lg">
                  <Zap className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active Sprint</p>
                  <p className="text-lg font-bold truncate">{activeSprint.name}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Story Points</p>
                  <p className="text-2xl font-bold">{currentSprintPoints}/{activeSprint.capacity}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Calendar className="w-5 h-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Days Remaining</p>
                  <p className="text-2xl font-bold">
                    {Math.ceil((activeSprint.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-accent/10 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Completion</p>
                  <p className="text-2xl font-bold">{Math.round(sprintProgress)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sprint Tabs */}
      <Tabs defaultValue="current" className="space-y-4">
        <TabsList>
          <TabsTrigger value="current">Current Sprint</TabsTrigger>
          <TabsTrigger value="planning">Sprint Planning</TabsTrigger>
          <TabsTrigger value="burndown">Burndown Chart</TabsTrigger>
          <TabsTrigger value="history">Sprint History</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {activeSprint ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sprint Details */}
              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{activeSprint.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={statusColors[activeSprint.status]} variant="secondary">
                            {activeSprint.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {activeSprint.startDate.toLocaleDateString()} - {activeSprint.endDate.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Button 
                        variant="outline"
                        onClick={() => handleCompleteSprint(activeSprint.id)}
                      >
                        <Square className="w-4 h-4 mr-2" />
                        Complete Sprint
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium text-foreground mb-2">Sprint Goal</h4>
                      <p className="text-muted-foreground">{activeSprint.goal}</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Capacity Usage</span>
                        <span className="text-sm text-muted-foreground">
                          {currentSprintPoints}/{activeSprint.capacity} points
                        </span>
                      </div>
                      <Progress value={sprintProgress} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                {/* Sprint Items */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sprint Backlog ({activeSprint.items.length} items)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {activeSprint.items.map((item) => (
                        <div key={item.id} className="p-4 border border-border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <h4 className="font-medium text-foreground">{item.title}</h4>
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{item.storyPoints} pts</Badge>
                                <Badge variant="outline">{item.priority}</Badge>
                              </div>
                            </div>
                            {item.assignee && (
                              <div className="text-right">
                                <div className="text-sm font-medium">{item.assignee.name}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Team Velocity */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5" />
                    Team Velocity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Last Sprint</span>
                      <span className="font-medium">45 pts</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average (3 sprints)</span>
                      <span className="font-medium">42 pts</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Current Commitment</span>
                      <span className="font-medium">{currentSprintPoints} pts</span>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3">Team Members</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-success rounded-full"></div>
                        <span className="text-sm">Alice Johnson - 18 pts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-sm">Bob Smith - 15 pts</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-32">
                <div className="text-center space-y-2">
                  <Clock className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">No active sprint</p>
                  <p className="text-sm text-muted-foreground">Start a new sprint to begin tracking progress</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="planning">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Available Items */}
            <Card>
              <CardHeader>
                <CardTitle>Available Backlog Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {availableItems.map((item) => (
                    <div key={item.id} className="p-3 border border-border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-medium text-foreground">{item.title}</h4>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{item.storyPoints} pts</Badge>
                            <Badge variant="outline" className="text-xs">{item.priority}</Badge>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          Add to Sprint
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Sprint Planning */}
            <Card>
              <CardHeader>
                <CardTitle>New Sprint</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Sprint Name</label>
                  <input 
                    className="w-full mt-1 px-3 py-2 border border-border rounded-md"
                    placeholder="Sprint 24 - Feature Name"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Sprint Goal</label>
                  <textarea 
                    className="w-full mt-1 px-3 py-2 border border-border rounded-md"
                    rows={3}
                    placeholder="What do you want to achieve in this sprint?"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Capacity (Story Points)</label>
                    <input 
                      type="number"
                      className="w-full mt-1 px-3 py-2 border border-border rounded-md"
                      placeholder="45"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Duration (Days)</label>
                    <input 
                      type="number"
                      className="w-full mt-1 px-3 py-2 border border-border rounded-md"
                      placeholder="14"
                    />
                  </div>
                </div>
                <Button className="w-full">
                  <Play className="w-4 h-4 mr-2" />
                  Start Sprint
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="burndown">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Sprint Burndown Chart
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeSprint ? (
                <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg">
                  <div className="text-center space-y-2">
                    <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">Burndown chart visualization</p>
                    <p className="text-sm text-muted-foreground">
                      Current: {activeSprint.burndownData[activeSprint.burndownData.length - 1]?.remaining || 0} points remaining
                    </p>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <p className="text-muted-foreground">No active sprint to display burndown chart</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Sprint History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sprints.filter(sprint => sprint.status === "completed").map((sprint) => (
                  <div key={sprint.id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-foreground">{sprint.name}</h4>
                        <p className="text-sm text-muted-foreground">{sprint.goal}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{sprint.startDate.toLocaleDateString()} - {sprint.endDate.toLocaleDateString()}</span>
                          <span>{sprint.capacity} points capacity</span>
                        </div>
                      </div>
                      <Badge className={statusColors[sprint.status]} variant="secondary">
                        {sprint.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}