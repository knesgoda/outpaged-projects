import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Target,
  Calendar,
  TrendingDown,
  CheckCircle,
  Clock,
  Trophy,
  Zap,
  AlertTriangle,
  Plus,
} from "lucide-react";
import { listBacklogItems } from "@/services/backlog";
import {
  assignBacklogItemToSprint,
  completeSprint,
  createSprint,
  listSprints,
  removeBacklogItemFromSprint,
  startSprint,
  updateSprint,
  type SprintWithItems,
} from "@/services/sprints";
import type { BacklogItem } from "@/types/backlog";

interface CreateSprintForm {
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  capacity: number;
}

const defaultForm: CreateSprintForm = {
  name: "",
  goal: "",
  startDate: "",
  endDate: "",
  capacity: 45,
};

const capacityVariant: Record<SprintWithItems["status"], string> = {
  planning: "bg-warning/20 text-warning",
  active: "bg-success/20 text-success",
  completed: "bg-muted text-muted-foreground",
};

const memberKeys = (sprint: SprintWithItems | undefined): string[] =>
  sprint ? Object.keys(sprint.memberCapacity) : [];

const calculateVelocity = (history: number[]): { average: number; lower: number; upper: number } => {
  if (!history.length) {
    return { average: 0, lower: 0, upper: 0 };
  }
  const recent = history.slice(-3);
  const average = Math.round(
    recent.reduce((sum, value) => sum + value, 0) / (recent.length || 1)
  );
  return {
    average,
    lower: Math.max(0, average - 5),
    upper: average + 5,
  };
};

const sumStoryPoints = (items: BacklogItem[]): number =>
  items.reduce((sum, item) => sum + (item.storyPoints ?? 0), 0);

export default function SprintPlanning() {
  const queryClient = useQueryClient();
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateSprintForm>(defaultForm);

  const backlogQuery = useQuery({
    queryKey: ["backlog", "items"],
    queryFn: listBacklogItems,
  });

  const sprintsQuery = useQuery({
    queryKey: ["sprints", "list"],
    queryFn: listSprints,
  });

  useEffect(() => {
    if (!selectedSprintId && sprintsQuery.data?.length) {
      setSelectedSprintId(sprintsQuery.data[0].id);
    }
  }, [selectedSprintId, sprintsQuery.data]);

  const selectedSprint = useMemo(() => {
    return sprintsQuery.data?.find((sprint) => sprint.id === selectedSprintId) ?? null;
  }, [selectedSprintId, sprintsQuery.data]);

  const availableItems = useMemo(() => {
    const items = backlogQuery.data ?? [];
    const assignedIds = new Set<string>();
    sprintsQuery.data?.forEach((sprint) => {
      sprint.items.forEach((item) => assignedIds.add(item.id));
    });
    return items.filter((item) => !assignedIds.has(item.id));
  }, [backlogQuery.data, sprintsQuery.data]);

  const assignMutation = useMutation({
    mutationFn: async ({ itemId, sprintId }: { itemId: string; sprintId: string }) =>
      assignBacklogItemToSprint(itemId, sprintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backlog", "items"] });
      queryClient.invalidateQueries({ queryKey: ["sprints", "list"] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async ({ itemId, sprintId }: { itemId: string; sprintId: string }) =>
      removeBacklogItemFromSprint(itemId, sprintId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backlog", "items"] });
      queryClient.invalidateQueries({ queryKey: ["sprints", "list"] });
    },
  });

  const updateSprintMutation = useMutation({
    mutationFn: async ({
      sprintId,
      updates,
    }: {
      sprintId: string;
      updates: Parameters<typeof updateSprint>[1];
    }) => updateSprint(sprintId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprints", "list"] });
    },
  });

  const startSprintMutation = useMutation({
    mutationFn: startSprint,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sprints", "list"] }),
  });

  const completeSprintMutation = useMutation({
    mutationFn: completeSprint,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sprints", "list"] }),
  });

  const createSprintMutation = useMutation({
    mutationFn: createSprint,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["sprints", "list"] });
      setForm(defaultForm);
      setSelectedSprintId(created.id);
    },
  });

  const handleCreateSprint = () => {
    if (!form.name.trim()) {
      return;
    }
    createSprintMutation.mutate({
      name: form.name,
      goal: form.goal,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
      capacity: Number.isFinite(form.capacity) ? form.capacity : undefined,
      memberCapacity: {},
    });
  };

  const handleCapacityChange = (sprint: SprintWithItems, member: string, capacity: number) => {
    updateSprintMutation.mutate({
      sprintId: sprint.id,
      updates: {
        memberCapacity: {
          ...sprint.memberCapacity,
          [member]: Math.max(0, capacity),
        },
      },
    });
  };

  const handleSprintCapacityUpdate = (sprint: SprintWithItems, capacity: number) => {
    updateSprintMutation.mutate({
      sprintId: sprint.id,
      updates: { capacity: Math.max(0, capacity) },
    });
  };

  const metrics = useMemo(() => {
    if (!selectedSprint) {
      return { points: 0, capacityUsage: 0, percentage: 0, velocity: { average: 0, lower: 0, upper: 0 } };
    }
    const points = sumStoryPoints(selectedSprint.items);
    const capacity = selectedSprint.capacity ?? 0;
    const percentage = capacity > 0 ? Math.min(100, Math.round((points / capacity) * 100)) : 0;
    return {
      points,
      capacityUsage: capacity,
      percentage,
      velocity: calculateVelocity(selectedSprint.velocityHistory),
    };
  }, [selectedSprint]);

  if (backlogQuery.isLoading || sprintsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading sprint planning data…</p>
      </div>
    );
  }

  if (backlogQuery.isError || sprintsQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-2">
        <p className="text-destructive font-medium">Unable to load sprint planning data.</p>
        <Button onClick={() => {
          backlogQuery.refetch();
          sprintsQuery.refetch();
        }}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sprint Planning</h1>
          <p className="text-muted-foreground">Plan and manage your development sprints</p>
        </div>
        <div className="flex gap-2">
          {selectedSprint && selectedSprint.status === "planning" && (
            <Button
              variant="outline"
              onClick={() => startSprintMutation.mutate(selectedSprint.id)}
              disabled={startSprintMutation.isPending}
            >
              <Zap className="w-4 h-4 mr-2" />
              Start Sprint
            </Button>
          )}
          {selectedSprint && selectedSprint.status === "active" && (
            <Button
              variant="outline"
              onClick={() => completeSprintMutation.mutate(selectedSprint.id)}
              disabled={completeSprintMutation.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Complete Sprint
            </Button>
          )}
        </div>
      </div>

      <Tabs value={selectedSprint?.id ?? "none"} onValueChange={setSelectedSprintId} className="space-y-4">
        <TabsList className="flex flex-wrap gap-2">
          {sprintsQuery.data?.map((sprint) => (
            <TabsTrigger key={sprint.id} value={sprint.id} className="flex items-center gap-2">
              <span>{sprint.name}</span>
              <Badge variant="secondary" className={capacityVariant[sprint.status]}>
                {sprint.status}
              </Badge>
            </TabsTrigger>
          ))}
          <TabsTrigger value="none" disabled>
            {sprintsQuery.data?.length ? "" : "No sprints"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedSprint?.id ?? "none"} className="space-y-6">
          {selectedSprint ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Target className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Story Points</p>
                        <p className="text-2xl font-bold">{metrics.points}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-success/10 rounded-lg">
                        <Calendar className="w-5 h-5 text-success" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Capacity</p>
                        <p className="text-2xl font-bold">{metrics.capacityUsage ?? 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-warning/10 rounded-lg">
                        <TrendingDown className="w-5 h-5 text-warning" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Forecast</p>
                        <p className="text-2xl font-bold">
                          {metrics.velocity.lower} - {metrics.velocity.upper}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted/70 rounded-lg">
                        <Clock className="w-5 h-5 text-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Timeline</p>
                        <p className="text-2xl font-bold">
                          {selectedSprint.startDate ?? "TBD"} → {selectedSprint.endDate ?? "TBD"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{selectedSprint.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className={capacityVariant[selectedSprint.status]}>
                            {selectedSprint.status}
                          </Badge>
                          {selectedSprint.goal && (
                            <span className="text-sm text-muted-foreground">{selectedSprint.goal}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          defaultValue={selectedSprint.capacity ?? 0}
                          onBlur={(event) => handleSprintCapacityUpdate(
                            selectedSprint,
                            Number.parseFloat(event.target.value) || 0
                          )}
                          className="w-24 h-9 text-sm"
                        />
                        <span className="text-sm text-muted-foreground">Capacity</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Capacity Usage</span>
                        <span className="text-sm text-muted-foreground">{metrics.percentage}%</span>
                      </div>
                      <Progress value={metrics.percentage} />
                    </div>

                    <div className="space-y-3">
                      {selectedSprint.items.length === 0 ? (
                        <p className="text-muted-foreground text-sm">No backlog items committed yet.</p>
                      ) : (
                        selectedSprint.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between border border-border rounded-lg px-3 py-2"
                          >
                            <div>
                              <p className="font-medium text-foreground">{item.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {item.storyPoints ?? 0} pts • {item.priority}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMutation.mutate({ itemId: item.id, sprintId: selectedSprint.id })}
                              disabled={removeMutation.isPending}
                            >
                              Remove
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Member Capacity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {memberKeys(selectedSprint).length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        Add capacity allocations to improve forecasts.
                      </p>
                    )}
                    {memberKeys(selectedSprint).map((member) => (
                      <div key={member} className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{member}</p>
                          <p className="text-xs text-muted-foreground">Committed capacity (pts)</p>
                        </div>
                        <Input
                          type="number"
                          min={0}
                          defaultValue={selectedSprint?.memberCapacity[member] ?? 0}
                          onBlur={(event) =>
                            handleCapacityChange(
                              selectedSprint,
                              member,
                              Number.parseFloat(event.target.value) || 0
                            )
                          }
                          className="w-24 h-9 text-sm"
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-muted-foreground">
                <p>Select a sprint to view details.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Available Backlog Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {availableItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">All backlog items are committed.</p>
            ) : (
              availableItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border border-border rounded-lg px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.storyPoints ?? 0} pts • {item.priority}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={!selectedSprint || assignMutation.isPending}
                    onClick={() =>
                      selectedSprint &&
                      assignMutation.mutate({ itemId: item.id, sprintId: selectedSprint.id })
                    }
                  >
                    Add to Sprint
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Velocity History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedSprint && selectedSprint.velocityHistory.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedSprint.velocityHistory.map((value, index) => (
                  <Badge key={`${value}-${index}`} variant="outline">
                    Sprint {index + 1}: {value} pts
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Velocity data will appear after sprints complete.</p>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="w-4 h-4" />
              Use recent velocity to guide commitments and highlight risk.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Create Sprint
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Input
            placeholder="Sprint name"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <Input
            placeholder="Sprint goal"
            value={form.goal}
            onChange={(event) => setForm((prev) => ({ ...prev, goal: event.target.value }))}
          />
          <Input
            type="date"
            value={form.startDate}
            onChange={(event) => setForm((prev) => ({ ...prev, startDate: event.target.value }))}
          />
          <Input
            type="date"
            value={form.endDate}
            onChange={(event) => setForm((prev) => ({ ...prev, endDate: event.target.value }))}
          />
          <Input
            type="number"
            min={0}
            value={form.capacity}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, capacity: Number.parseInt(event.target.value, 10) || 0 }))
            }
          />
          <Button
            className="md:col-span-2 lg:col-span-5"
            onClick={handleCreateSprint}
            disabled={createSprintMutation.isPending}
          >
            Create Sprint
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
