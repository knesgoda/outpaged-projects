import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import enterpriseBacklog from "@/data/enterpriseBacklog";
import { BacklogItem, BacklogHistoryEntry } from "@/types/backlog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DndContext,
  DragEndEvent,
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
  Star
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

const initialBacklogItems: BacklogItem[] = enterpriseBacklog;

const STORAGE_KEY = "backlog_items_v2";
const createId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const enrichBacklogItems = (items: BacklogItem[]): BacklogItem[] =>
  items.map((item, index) => ({
    ...item,
    createdAt: new Date(item.createdAt),
    rank: item.rank ?? index + 1,
    timeEstimateHours:
      item.timeEstimateHours ?? Math.max(item.storyPoints ? item.storyPoints * 2 : 8, 1),
    history: item.history ?? [],
  }));

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
  onEdit?: (item: BacklogItem) => void;
  onDelete?: (itemId: string) => void;
  onMoveToSprint?: (itemId: string) => void;
  onStoryPointsChange?: (itemId: string, storyPoints: number) => void;
  onTimeEstimateChange?: (itemId: string, time: number) => void;
}

function BacklogItemCard({
  item,
  onEdit,
  onDelete,
  onMoveToSprint,
  onStoryPointsChange,
  onTimeEstimateChange,
}: BacklogItemCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`hover:shadow-medium transition-shadow ${
        isDragging ? "opacity-50 rotate-1 shadow-large" : ""
      }`}
    >
      <CardContent className="p-4">
        {/* Header */}
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
                  <DropdownMenuItem onClick={() => onEdit?.(item)}>
                    Edit Item
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onMoveToSprint?.(item.id)}>
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Move to Sprint
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => onDelete?.(item.id)}
                  >
                    Delete Item
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>

            {/* Status and Priority */}
            <div className="flex items-center gap-2">
              <Badge className={statusColors[item.status]} variant="secondary">
                {item.status.replace('_', ' ')}
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

            {/* Tags */}
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

            {/* Footer */}
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
                  <AvatarFallback className="text-xs">
                    {item.assignee.initials}
                  </AvatarFallback>
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
  const [items, setItems] = useState<BacklogItem[]>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as (BacklogItem & { createdAt: string })[];
          return enrichBacklogItems(
            parsed.map((item) => ({
              ...item,
              createdAt: new Date(item.createdAt),
            }))
          );
        } catch (error) {
          console.warn("Failed to parse backlog storage", error);
        }
      }
    }
    return enrichBacklogItems(enterpriseBacklog);
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const serializable = items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  }, [items]);

  const createHistoryEntry = (
    type: BacklogHistoryEntry["type"],
    detail: string
  ): BacklogHistoryEntry => ({
    id: createId(),
    timestamp: new Date().toISOString(),
    type,
    detail,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        if (oldIndex === -1 || newIndex === -1) {
          return items;
        }
        const reordered = arrayMove(items, oldIndex, newIndex);
        return reordered.map((item, index) => {
          const newRank = index + 1;
          if (item.rank !== newRank) {
            return {
              ...item,
              rank: newRank,
              history: [
                ...(item.history ?? []),
                createHistoryEntry("rank_change", `Rank adjusted to ${newRank}`),
              ],
            };
          }
          return item;
        });
      });
    }
  };

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

  const handleMoveToSprint = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: "in_sprint" as const,
              sprintId: "current-sprint",
              history: [
                ...(item.history ?? []),
                createHistoryEntry("status_change", "Moved to in_sprint"),
                createHistoryEntry("moved_to_sprint", "Moved to current sprint"),
              ],
            }
          : item
      )
    );
  };
  const handleStoryPointsChange = (itemId: string, storyPoints: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              storyPoints,
              history: [
                ...(item.history ?? []),
                createHistoryEntry("story_points_update", `Story points set to ${storyPoints}`),
              ],
            }
          : item
      )
    );
  };

  const handleTimeEstimateChange = (itemId: string, time: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              timeEstimateHours: time,
              history: [
                ...(item.history ?? []),
                createHistoryEntry("estimate_update", `Time estimate set to ${time}h`),
              ],
            }
          : item
      )
    );
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Product Backlog</h1>
          <p className="text-muted-foreground">Prioritize and manage your product backlog</p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Add Backlog Item
        </Button>
      </div>

      {/* Stats */}
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
                <p className="text-2xl font-bold">
                  {filteredItems.filter(item => item.status === "ready").length}
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
                <p className="text-sm text-muted-foreground">Total Time (hrs)</p>
                <p className="text-2xl font-bold">{Math.round(totalTimeEstimate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search backlog items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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

      {/* Backlog Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Backlog Items ({filteredItems.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={filteredItems.map(item => item.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <BacklogItemCard
                    key={item.id}
                    item={item}
                    onMoveToSprint={handleMoveToSprint}
                    onStoryPointsChange={handleStoryPointsChange}
                    onTimeEstimateChange={handleTimeEstimateChange}
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