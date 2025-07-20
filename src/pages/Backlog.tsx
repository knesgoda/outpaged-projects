import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Filter, 
  GripVertical, 
  MoreHorizontal,
  Flag,
  Users,
  Calendar,
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

export interface BacklogItem {
  id: string;
  title: string;
  description: string;
  status: "new" | "refined" | "estimated" | "ready" | "in_sprint";
  priority: "low" | "medium" | "high" | "urgent";
  storyPoints?: number;
  assignee?: {
    name: string;
    avatar?: string;
    initials: string;
  };
  tags: string[];
  acceptanceCriteria: string[];
  businessValue: number;
  effort: number;
  createdAt: Date;
  sprintId?: string;
}

const mockBacklogItems: BacklogItem[] = [
  {
    id: "backlog-1",
    title: "User Authentication with Social Login",
    description: "Implement OAuth integration for Google, GitHub, and LinkedIn login options",
    status: "ready",
    priority: "high",
    storyPoints: 8,
    assignee: { name: "Alice Johnson", initials: "AJ", avatar: "" },
    tags: ["Authentication", "Security", "Frontend"],
    acceptanceCriteria: [
      "Users can login with Google account",
      "Users can login with GitHub account", 
      "Login state persists across sessions"
    ],
    businessValue: 9,
    effort: 7,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
  },
  {
    id: "backlog-2", 
    title: "Advanced Search and Filtering",
    description: "Add comprehensive search functionality with filters for all data types",
    status: "estimated",
    priority: "medium",
    storyPoints: 13,
    tags: ["Search", "UX", "Performance"],
    acceptanceCriteria: [
      "Search works across all entities",
      "Filters can be combined",
      "Results load in under 2 seconds"
    ],
    businessValue: 7,
    effort: 8,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: "backlog-3",
    title: "Real-time Notifications System", 
    description: "Build notification system with email, SMS, and in-app alerts",
    status: "refined",
    priority: "medium",
    storyPoints: 21,
    assignee: { name: "Bob Smith", initials: "BS", avatar: "" },
    tags: ["Notifications", "Real-time", "Backend"],
    acceptanceCriteria: [
      "Users receive instant notifications",
      "Notification preferences can be customized",
      "Email notifications are sent for important events"
    ],
    businessValue: 8,
    effort: 9,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: "backlog-4",
    title: "Mobile Responsive Dashboard",
    description: "Optimize dashboard layout and interactions for mobile devices",
    status: "new", 
    priority: "low",
    tags: ["Mobile", "Responsive", "UI"],
    acceptanceCriteria: [
      "Dashboard works on mobile browsers",
      "Touch interactions are optimized",
      "Layout adapts to screen size"
    ],
    businessValue: 6,
    effort: 5,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  }
];

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
}

function BacklogItemCard({ item, onEdit, onDelete, onMoveToSprint }: BacklogItemCardProps) {
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
              <h3 className="font-semibold text-foreground leading-tight">{item.title}</h3>
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
              {item.storyPoints && (
                <Badge variant="outline">
                  <Target className="w-3 h-3 mr-1" />
                  {item.storyPoints} pts
                </Badge>
              )}
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
  const [items, setItems] = useState<BacklogItem[]>(mockBacklogItems);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");

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

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = filterStatus === "all" || item.status === filterStatus;
    const matchesPriority = filterPriority === "all" || item.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleMoveToSprint = (itemId: string) => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, status: "in_sprint" as const, sprintId: "current-sprint" }
        : item
    ));
  };

  const totalStoryPoints = filteredItems.reduce((sum, item) => sum + (item.storyPoints || 0), 0);
  const avgBusinessValue = filteredItems.reduce((sum, item) => sum + item.businessValue, 0) / filteredItems.length;

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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