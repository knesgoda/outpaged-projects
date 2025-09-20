import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Trophy,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { BacklogItem } from "@/types/backlog";
import enterpriseBacklog from "@/data/enterpriseBacklog";

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
  memberCapacity: Record<string, number>;
  scopeChangeLog: ScopeChangeEntry[];
}

interface ScopeChangeEntry {
  id: string;
  timestamp: string;
  action: "added" | "removed";
  itemTitle: string;
  points: number;
}

const mockSprints: Sprint[] = [];
const TEAM_MEMBERS = ["Alice Johnson", "Bob Smith", "Carol Perez", "Dana Lee"];
const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const enrichItem = (item: BacklogItem): BacklogItem => ({
  ...item,
  createdAt: new Date(item.createdAt),
  timeEstimateHours: item.timeEstimateHours ?? Math.max(item.storyPoints ? item.storyPoints * 2 : 8, 1),
});

const statusColors = {
  planning: "bg-warning/20 text-warning",
  active: "bg-success/20 text-success", 
  completed: "bg-muted text-muted-foreground",
};

export default function SprintPlanning() {
  const [sprints, setSprints] = useState<Sprint[]>(mockSprints);
  const [availableItems, setAvailableItems] = useState<BacklogItem[]>(() =>
    enterpriseBacklog.slice(0, 25).map(enrichItem)
  );
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [velocityHistory, setVelocityHistory] = useState<number[]>([]);

  useEffect(() => {
    if (!selectedSprintId && sprints.length > 0) {
      setSelectedSprintId(sprints[0].id);
    }
  }, [selectedSprintId, sprints]);

  const selectedSprint = useMemo(
    () => sprints.find((sprint) => sprint.id === selectedSprintId) ?? sprints[0] ?? null,
    [selectedSprintId, sprints]
  );

  const activeSprint = sprints.find((sprint) => sprint.status === "active");
  const currentSprintPoints = activeSprint?.items.reduce((sum, item) => sum + (item.storyPoints || 0), 0) || 0;
  const sprintProgress = activeSprint ? (currentSprintPoints / activeSprint.capacity) * 100 : 0;
  const selectedSprintPoints = selectedSprint?.items.reduce((sum, item) => sum + (item.storyPoints || 0), 0) || 0;
  const selectedSprintCapacityUsage =
    selectedSprint && selectedSprint.capacity > 0
      ? Math.min(100, (selectedSprintPoints / selectedSprint.capacity) * 100)
      : 0;
  const selectedSprintDurationDays =
    selectedSprint && selectedSprint.endDate && selectedSprint.startDate
      ? Math.max(
          1,
          Math.round(
            (selectedSprint.endDate.getTime() - selectedSprint.startDate.getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;
  const [newSprintName, setNewSprintName] = useState("");
  const [newSprintGoal, setNewSprintGoal] = useState("");
  const [newSprintStart, setNewSprintStart] = useState("");
  const [newSprintEnd, setNewSprintEnd] = useState("");
  const [newSprintCapacity, setNewSprintCapacity] = useState<number>(45);
  const [newSprintDuration, setNewSprintDuration] = useState<number>(14);
  const [newMemberCapacity, setNewMemberCapacity] = useState<Record<string, number>>(() =>
    Object.fromEntries(TEAM_MEMBERS.map((member) => [member, 15]))
  );

  const lastVelocity = velocityHistory[velocityHistory.length - 1] ?? 0;
  const recentVelocities = velocityHistory.slice(-3);
  const averageVelocity = recentVelocities.length
    ? Math.round(recentVelocities.reduce((sum, value) => sum + value, 0) / recentVelocities.length)
    : 0;
  const forecastLower = Math.max(0, averageVelocity - 5);
  const forecastUpper = averageVelocity + 5;

  const memberLoads = useMemo(() => {
    if (!activeSprint) {
      return TEAM_MEMBERS.map((member) => ({ name: member, committed: 0, capacity: 0 }));
    }
    const loadMap = new Map<string, number>();
    activeSprint.items.forEach((item) => {
      if (item.assignee?.name) {
        loadMap.set(item.assignee.name, (loadMap.get(item.assignee.name) ?? 0) + (item.storyPoints ?? 0));
      }
    });
    return TEAM_MEMBERS.map((member) => ({
      name: member,
      committed: loadMap.get(member) ?? 0,
      capacity: activeSprint.memberCapacity[member] ?? 0,
    }));
  }, [activeSprint]);

  const capacityWarning = activeSprint ? currentSprintPoints > activeSprint.capacity : false;

  const handleCreateSprint = () => {
    if (!newSprintName || !newSprintStart) {
      return;
    }
    const startDate = new Date(newSprintStart);
    const endDate = newSprintEnd
      ? new Date(newSprintEnd)
      : new Date(startDate.getTime() + newSprintDuration * 24 * 60 * 60 * 1000);
    const sprint: Sprint = {
      id: createId(),
      name: newSprintName,
      goal: newSprintGoal,
      status: "planning",
      startDate,
      endDate,
      capacity: newSprintCapacity,
      items: [],
      burndownData: Array.from({ length: Math.max(1, newSprintDuration) }, (_, index) => ({
        day: index + 1,
        remaining: newSprintCapacity,
      })),
      memberCapacity: { ...newMemberCapacity },
      scopeChangeLog: [],
    };
    setSprints((prev) => [...prev, sprint]);
    setSelectedSprintId(sprint.id);
    setNewSprintName("");
    setNewSprintGoal("");
    setNewSprintStart("");
    setNewSprintEnd("");
    setNewSprintCapacity(45);
    setNewSprintDuration(14);
    setNewMemberCapacity(Object.fromEntries(TEAM_MEMBERS.map((member) => [member, 15])));
  };

  const handleStartSprint = (sprintId: string) => {
    const now = new Date();
    setSprints((prev) =>
      prev.map((sprint) =>
        sprint.id === sprintId
          ? {
              ...sprint,
              status: "active" as const,
              startDate: now,
              scopeChangeLog: [...sprint.scopeChangeLog],
            }
          : sprint
      )
    );
    setSelectedSprintId(sprintId);
  };

  const handleCompleteSprint = (sprintId: string) => {
    const sprint = sprints.find((item) => item.id === sprintId);
    const completedPoints = sprint?.items.reduce((sum, item) => sum + (item.storyPoints || 0), 0) ?? 0;
    setSprints((prev) =>
      prev.map((item) =>
        item.id === sprintId
          ? { ...item, status: "completed" as const, endDate: new Date() }
          : item
      )
    );
    setVelocityHistory((prev) => [...prev.slice(-5), completedPoints]);
  };

  const handleAddItemToSprint = (itemId: string, sprintId?: string) => {
    const targetSprintId = sprintId ?? selectedSprint?.id;
    if (!targetSprintId) return;
    const item = availableItems.find((entry) => entry.id === itemId);
    if (!item) return;
    setAvailableItems((prev) => prev.filter((entry) => entry.id !== itemId));
    setSprints((prev) =>
      prev.map((sprint) =>
        sprint.id === targetSprintId
          ? {
              ...sprint,
              items: [...sprint.items, item],
              scopeChangeLog:
                sprint.status === "active"
                  ? [
                      ...sprint.scopeChangeLog,
                      {
                        id: createId(),
                        timestamp: new Date().toISOString(),
                        action: "added" as const,
                        itemTitle: item.title,
                        points: item.storyPoints ?? 0,
                      },
                    ]
                  : sprint.scopeChangeLog,
            }
          : sprint
      )
    );
  };

  const handleRemoveFromSprint = (sprintId: string, itemId: string) => {
    const sprint = sprints.find((entry) => entry.id === sprintId);
    const item = sprint?.items.find((entry) => entry.id === itemId);
    if (!sprint || !item) return;
    setSprints((prev) =>
      prev.map((current) =>
        current.id === sprintId
          ? {
              ...current,
              items: current.items.filter((entry) => entry.id !== itemId),
              scopeChangeLog:
                current.status === "active"
                  ? [
                      ...current.scopeChangeLog,
                      {
                        id: createId(),
                        timestamp: new Date().toISOString(),
                        action: "removed" as const,
                        itemTitle: item.title,
                        points: item.storyPoints ?? 0,
                      },
                    ]
                  : current.scopeChangeLog,
            }
          : current
      )
    );
    setAvailableItems((prev) => [...prev, item]);
  };

  const handleMemberCapacityChange = (sprintId: string, member: string, capacity: number) => {
    setSprints((prev) =>
      prev.map((sprint) =>
        sprint.id === sprintId
          ? {
              ...sprint,
              memberCapacity: {
                ...sprint.memberCapacity,
                [member]: Math.max(0, capacity),
              },
            }
          : sprint
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sprint Planning</h1>
          <p className="text-muted-foreground">Plan and manage your development sprints</p>
        </div>
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
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-2">
                              <h4 className="font-medium text-foreground">{item.title}</h4>
                              <p className="text-sm text-muted-foreground">{item.description}</p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline">{item.storyPoints ?? 0} pts</Badge>
                                <Badge variant="outline">{item.priority}</Badge>
                                <span>{item.timeEstimateHours ?? 0} hrs</span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {item.assignee && (
                                <div className="text-sm font-medium">{item.assignee.name}</div>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveFromSprint(activeSprint.id, item.id)}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {activeSprint.items.length === 0 && (
                        <p className="text-sm text-muted-foreground">No items assigned yet.</p>
                      )}
                    </div>
                    {activeSprint.scopeChangeLog.length > 0 && (
                      <div className="mt-4 border-t pt-3 space-y-2">
                        <h4 className="text-sm font-medium text-foreground">Scope changes</h4>
                        {activeSprint.scopeChangeLog.map((entry) => (
                          <div key={entry.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <AlertTriangle className="w-3 h-3 text-warning" />
                            <span>
                              {new Date(entry.timestamp).toLocaleString()} — {entry.action === "added" ? "Added" : "Removed"} {entry.itemTitle} ({entry.points} pts)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
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
                      <span className="font-medium">{lastVelocity} pts</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Average (3 sprints)</span>
                      <span className="font-medium">{averageVelocity} pts</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Forecast Next Sprint</span>
                      <span className="font-medium">{forecastLower}–{forecastUpper} pts</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Current Commitment</span>
                      <span className="font-medium">{currentSprintPoints} pts</span>
                    </div>
                    {capacityWarning && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Commitment exceeds sprint capacity</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-3">Team Members</h4>
                    <div className="space-y-2">
                      {memberLoads.map((member) => {
                        const overCapacity = member.capacity > 0 && member.committed > member.capacity;
                        return (
                          <div
                            key={member.name}
                            className={`flex items-center justify-between text-sm ${
                              overCapacity ? "text-destructive" : "text-muted-foreground"
                            }`}
                          >
                            <span>{member.name}</span>
                            <div className="flex items-center gap-2">
                              {overCapacity && <AlertTriangle className="w-3 h-3" />}
                              <span>
                                {member.committed}/{member.capacity || "∞"} pts
                              </span>
                            </div>
                          </div>
                        );
                      })}
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

        <TabsContent value="planning" className="space-y-6">
          {sprints.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Selected sprint</p>
                  <h4 className="text-lg font-semibold text-foreground">{selectedSprint?.name ?? "None"}</h4>
                </div>
                <Select value={selectedSprint?.id ?? ""} onValueChange={setSelectedSprintId}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Choose sprint" />
                  </SelectTrigger>
                  <SelectContent>
                    {sprints.map((sprint) => (
                      <SelectItem key={sprint.id} value={sprint.id}>
                        {sprint.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedSprint && (
                <Card>
                  <CardHeader className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <CardTitle>{selectedSprint.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={statusColors[selectedSprint.status]} variant="secondary">
                          {selectedSprint.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {selectedSprint.startDate.toLocaleDateString()} – {selectedSprint.endDate.toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedSprint.status === "planning" && (
                        <Button
                          onClick={() => handleStartSprint(selectedSprint.id)}
                          disabled={selectedSprint.items.length === 0}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Sprint
                        </Button>
                      )}
                      {selectedSprint.status === "active" && (
                        <Button variant="outline" onClick={() => handleCompleteSprint(selectedSprint.id)}>
                          <Square className="w-4 h-4 mr-2" />
                          Complete Sprint
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Committed Points</p>
                        <p className="text-lg font-semibold text-foreground">{selectedSprintPoints}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Capacity</p>
                        <p className="text-lg font-semibold text-foreground">{selectedSprint.capacity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="text-lg font-semibold text-foreground">
                          {selectedSprintDurationDays} day{selectedSprintDurationDays === 1 ? "" : "s"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">Capacity Usage</span>
                        <span className="text-sm text-muted-foreground">
                          {selectedSprintPoints}/{selectedSprint.capacity} pts
                        </span>
                      </div>
                      <Progress value={selectedSprintCapacityUsage} className="h-2" />
                    </div>

                    {selectedSprint.status === "planning" && selectedSprint.items.length === 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <AlertTriangle className="w-4 h-4 text-warning" />
                        <span>Add items to start this sprint.</span>
                      </div>
                    )}

                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-foreground">Planned Items</h4>
                      {selectedSprint.items.length > 0 ? (
                        selectedSprint.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-start justify-between gap-3 p-3 border border-border rounded-md"
                          >
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">{item.title}</p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline">{item.storyPoints ?? 0} pts</Badge>
                                <Badge variant="outline">{item.priority}</Badge>
                                <span>{item.timeEstimateHours ?? 0} hrs</span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFromSprint(selectedSprint.id, item.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No items assigned yet.</p>
                      )}
                    </div>

                    {selectedSprint.scopeChangeLog.length > 0 && (
                      <div className="space-y-2 border-t pt-3">
                        <h4 className="text-sm font-medium text-foreground">Scope changes</h4>
                        {selectedSprint.scopeChangeLog.map((entry) => (
                          <div key={entry.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <AlertTriangle className="w-3 h-3 text-warning" />
                            <span>
                              {new Date(entry.timestamp).toLocaleString()} — {entry.action === "added" ? "Added" : "Removed"} {entry.itemTitle} ({entry.points} pts)
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Available Backlog Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {availableItems.map((item) => (
                    <div key={item.id} className="p-3 border border-border rounded-lg">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <h4 className="font-medium text-foreground">{item.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">{item.storyPoints ?? 0} pts</Badge>
                            <Badge variant="outline">{item.priority}</Badge>
                            <span>{item.timeEstimateHours ?? 0} hrs</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAddItemToSprint(item.id)}
                          disabled={!selectedSprint}
                        >
                          {selectedSprint ? `Add to ${selectedSprint.name}` : "Select sprint"}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {availableItems.length === 0 && (
                    <p className="text-sm text-muted-foreground">All backlog items are committed.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
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
                      value={newSprintName}
                      onChange={(event) => setNewSprintName(event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Sprint Goal</label>
                    <textarea
                      className="w-full mt-1 px-3 py-2 border border-border rounded-md"
                      rows={3}
                      placeholder="What do you want to achieve in this sprint?"
                      value={newSprintGoal}
                      onChange={(event) => setNewSprintGoal(event.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Start Date</label>
                      <input
                        type="date"
                        className="w-full mt-1 px-3 py-2 border border-border rounded-md"
                        value={newSprintStart}
                        onChange={(event) => setNewSprintStart(event.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">End Date</label>
                      <input
                        type="date"
                        className="w-full mt-1 px-3 py-2 border border-border rounded-md"
                        value={newSprintEnd}
                        onChange={(event) => setNewSprintEnd(event.target.value)}
                      />
                      <p className="text-xs text-muted-foreground mt-1">Leave blank to use duration</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Capacity (Story Points)</label>
                      <input
                        type="number"
                        className="w-full mt-1 px-3 py-2 border border-border rounded-md"
                        value={newSprintCapacity}
                        onChange={(event) => setNewSprintCapacity(Number(event.target.value))}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Duration (Days)</label>
                      <input
                        type="number"
                        className="w-full mt-1 px-3 py-2 border border-border rounded-md"
                        value={newSprintDuration}
                        onChange={(event) => setNewSprintDuration(Number(event.target.value))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Team capacity allocation</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {TEAM_MEMBERS.map((member) => (
                        <div key={member} className="space-y-1">
                          <label className="text-xs text-muted-foreground">{member}</label>
                          <input
                            type="number"
                            className="w-full px-3 py-2 border border-border rounded-md text-sm"
                            value={newMemberCapacity[member] ?? 0}
                            onChange={(event) =>
                              setNewMemberCapacity((prev) => ({
                                ...prev,
                                [member]: Number(event.target.value),
                              }))
                            }
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleCreateSprint}
                    type="button"
                    disabled={!newSprintName || !newSprintStart}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Sprint
                  </Button>
                </CardContent>
              </Card>

              {selectedSprint && (
                <Card>
                  <CardHeader>
                    <CardTitle>Adjust Capacity for {selectedSprint.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {TEAM_MEMBERS.map((member) => (
                      <div key={member} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted-foreground">{member}</span>
                        <input
                          type="number"
                          className="w-24 px-3 py-2 border border-border rounded-md"
                          value={selectedSprint.memberCapacity[member] ?? 0}
                          onChange={(event) =>
                            handleMemberCapacityChange(
                              selectedSprint.id,
                              member,
                              Number(event.target.value)
                            )
                          }
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
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
                {sprints.filter((sprint) => sprint.status === "completed").map((sprint) => (
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