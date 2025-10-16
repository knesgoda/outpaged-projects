import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Search,
  GripVertical,
  MoreHorizontal,
  Flag,
  Users,
  Calendar,
  Clock,
  ArrowRight,
  Target,
  Tag,
  Star,
  Archive,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type {
  BacklogHistoryInput,
  UpdateBacklogItemInput,
} from "@/services/backlog";
import {
  archiveBacklogItem,
  createBacklogItem,
  listBacklogItems,
  reorderBacklogItems,
  updateBacklogItem,
} from "@/services/backlog";
import type { BacklogItem } from "@/types/backlog";

const statusColors = {
  new: "bg-muted text-muted-foreground",
  refined: "bg-warning/20 text-warning",
  estimated: "bg-primary/20 text-primary",
  ready: "bg-success/20 text-success",
  in_sprint: "bg-accent/20 text-accent",
};

const priorityColors = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/20 text-warning",
  high: "bg-destructive/20 text-destructive",
  urgent: "bg-destructive text-destructive-foreground",
};

interface BacklogItemCardProps {
  item: BacklogItem;
  onMoveToSprint?: (itemId: string) => void;
  onStoryPointsChange?: (itemId: string, storyPoints: number) => void;
  onTimeEstimateChange?: (itemId: string, time: number) => void;
  onArchive?: (itemId: string) => void;
}

function BacklogItemCard({
  item,
  onMoveToSprint,
  onStoryPointsChange,
  onTimeEstimateChange,
  onArchive,
}: BacklogItemCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`hover:shadow-medium transition-shadow ${isDragging ? "opacity-50 rotate-1 shadow-large" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab hover:cursor-grabbing text-muted-foreground mt-1"
          >
            <GripVertical className="w-4 h-4" />
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground leading-tight">{item.title}</h3>
                {typeof item.rank === "number" && (
                  <Badge variant="outline" className="text-xs font-normal">
                    Rank #{item.rank}
                  </Badge>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-6 h-6 opacity-50 hover:opacity-100">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="z-50" align="end">
                  <DropdownMenuItem onClick={() => onMoveToSprint?.(item.id)}>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Move to Sprint
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onArchive?.(item.id)}>
                    <Archive className="w-4 h-4 mr-2" />
                    Archive Item
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>

            <div className="flex items-center gap-2">
              <Badge className={statusColors[item.status]} variant="secondary">
                {item.status.replace("_", " ")}
              </Badge>
              <Badge className={priorityColors[item.priority]} variant="secondary">
                <Flag className="w-3 h-3 mr-1" />
                {item.priority}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Target className="w-3 h-3" />
                <Input
                  key={`story-${item.id}-${item.storyPoints ?? 0}`}
                  type="number"
                  min={0}
                  defaultValue={item.storyPoints ?? 0}
                  onBlur={(event) => {
                    const value = Number(event.target.value);
                    if (!Number.isNaN(value)) {
                      onStoryPointsChange?.(item.id, value);
                    }
                  }}
                  className="w-20 h-8 text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3 h-3" />
                <Input
                  key={`time-${item.id}-${item.timeEstimateHours ?? 0}`}
                  type="number"
                  min={0}
                  defaultValue={item.timeEstimateHours ?? 0}
                  onBlur={(event) => {
                    const value = Number(event.target.value);
                    if (!Number.isNaN(value)) {
                      onTimeEstimateChange?.(item.id, value);
                    }
                  }}
                  className="w-24 h-8 text-xs"
                />
              </div>
            </div>

            {item.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {item.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    <Tag className="w-2 h-2 mr-1" />
                    {tag}
                  </Badge>
                ))}
                {item.tags.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{item.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  <span>Value: {item.businessValue}/10</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Effort: {item.effort}/10</span>
                </div>
              </div>

              {item.assignee && (
                <Avatar className="w-6 h-6">
                  <AvatarImage src={item.assignee.avatar} alt={item.assignee.name} />
                  <AvatarFallback className="text-xs">{item.assignee.initials}</AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Backlog() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const backlogQuery = useQuery({
    queryKey: ["backlog", "items"],
    queryFn: listBacklogItems,
  });

  const createMutation = useMutation({
    mutationFn: createBacklogItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["backlog", "items"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
      history,
    }: {
      id: string;
      updates: UpdateBacklogItemInput;
      history?: BacklogHistoryInput;
    }) => updateBacklogItem(id, updates, history),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["backlog", "items"] }),
  });

  const reorderMutation = useMutation({
    mutationFn: reorderBacklogItems,
    onMutate: async (order: Array<{ id: string; rank: number }>) => {
      await queryClient.cancelQueries({ queryKey: ["backlog", "items"] });
      const previous = queryClient.getQueryData<BacklogItem[]>(["backlog", "items"]);
      if (previous) {
        const next = order
          .map(({ id, rank }) => {
            const match = previous.find((item) => item.id === id);
            return match ? { ...match, rank } : undefined;
          })
          .filter((item): item is BacklogItem => Boolean(item));
        queryClient.setQueryData(["backlog", "items"], next);
      }
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["backlog", "items"], context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["backlog", "items"] }),
  });

  const archiveMutation = useMutation({
    mutationFn: archiveBacklogItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["backlog", "items"] }),
  });

  const items = backlogQuery.data ?? [];

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          item.title.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.tags.some((tag) => tag.toLowerCase().includes(query));
        const matchesStatus = filterStatus === "all" || item.status === filterStatus;
        const matchesPriority = filterPriority === "all" || item.priority === filterPriority;
        return matchesSearch && matchesStatus && matchesPriority;
      })
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
  }, [items, searchQuery, filterPriority, filterStatus]);

  const totalStoryPoints = useMemo(
    () => filteredItems.reduce((sum, item) => sum + (item.storyPoints || 0), 0),
    [filteredItems]
  );
  const totalBusinessValue = useMemo(
    () => filteredItems.reduce((sum, item) => sum + item.businessValue, 0),
    [filteredItems]
  );
  const avgBusinessValue = filteredItems.length > 0 ? totalBusinessValue / filteredItems.length : 0;
  const totalTimeEstimate = useMemo(
    () => filteredItems.reduce((sum, item) => sum + (item.timeEstimateHours || 0), 0),
    [filteredItems]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const current = items;
    const oldIndex = current.findIndex((item) => item.id === active.id);
    const newIndex = current.findIndex((item) => item.id === over.id);
    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const reordered = arrayMove(current, oldIndex, newIndex);
    const payload = reordered.map((item, index) => ({ id: item.id, rank: index + 1 }));
    reorderMutation.mutate(payload);
  };

  const handleStoryPointsChange = (itemId: string, storyPoints: number) => {
    updateMutation.mutate({
      id: itemId,
      updates: { storyPoints },
      history: { type: "story_points_update", detail: `Story points set to ${storyPoints}` },
    });
  };

  const handleTimeEstimateChange = (itemId: string, time: number) => {
    updateMutation.mutate({
      id: itemId,
      updates: { timeEstimateHours: time },
      history: { type: "estimate_update", detail: `Time estimate set to ${time}h` },
    });
  };

  const handleMoveToSprint = (itemId: string) => {
    updateMutation.mutate({
      id: itemId,
      updates: { status: "in_sprint" },
      history: { type: "moved_to_sprint", detail: "Marked for sprint planning" },
    });
  };

  const handleArchive = (itemId: string) => {
    archiveMutation.mutate(itemId);
  };

  const handleQuickAdd = () => {
    createMutation.mutate({
      title: "New backlog item",
      description: "Draft backlog item created from backlog view.",
      status: "new",
      priority: "medium",
      storyPoints: 1,
      timeEstimateHours: 2,
      acceptanceCriteria: [],
      businessValue: 5,
      effort: 5,
      tags: [],
    });
  };

  if (backlogQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Loading backlog items…</p>
      </div>
    );
  }

  if (backlogQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-2">
        <p className="text-destructive font-medium">Unable to load backlog items.</p>
        <Button onClick={() => backlogQuery.refetch()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Product Backlog</h1>
          <p className="text-muted-foreground">Prioritize and manage your product backlog</p>
        </div>
        <Button
          className="bg-gradient-primary hover:opacity-90"
          onClick={handleQuickAdd}
          disabled={createMutation.isPending}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Backlog Item
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Items</p>
                <p className="text-2xl font-bold">{filteredItems.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Star className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Story Points</p>
                <p className="text-2xl font-bold">{totalStoryPoints}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <Users className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Value</p>
                <p className="text-2xl font-bold">{avgBusinessValue.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Flag className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ready Items</p>
                <p className="text-2xl font-bold">{filteredItems.filter((item) => item.status === "ready").length}</p>
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
                <p className="text-sm text-muted-foreground">Total Time (hrs)</p>
                <p className="text-2xl font-bold">{Math.round(totalTimeEstimate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search backlog items..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="refined">Refined</SelectItem>
            <SelectItem value="estimated">Estimated</SelectItem>
            <SelectItem value="ready">Ready</SelectItem>
            <SelectItem value="in_sprint">In Sprint</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Backlog Items ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filteredItems.map((item) => item.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <BacklogItemCard
                    key={item.id}
                    item={item}
                    onMoveToSprint={handleMoveToSprint}
                    onStoryPointsChange={handleStoryPointsChange}
                    onTimeEstimateChange={handleTimeEstimateChange}
                    onArchive={handleArchive}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {filteredItems.length === 0 && (
            <div className="text-center py-8">
              <Target className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No backlog items found</p>
              <p className="text-sm text-muted-foreground">Create your first backlog item to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
