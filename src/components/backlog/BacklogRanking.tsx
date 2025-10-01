import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GripVertical, Search, Filter, Plus } from "lucide-react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface BacklogItem {
  id: string;
  title: string;
  type: string;
  priority: string;
  story_points?: number;
  rank: number;
}

interface SortableItemProps {
  item: BacklogItem;
  onItemClick?: (id: string) => void;
}

function SortableItem({ item, onItemClick }: SortableItemProps) {
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

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      epic: "bg-purple-500/10 text-purple-500",
      story: "bg-blue-500/10 text-blue-500",
      task: "bg-green-500/10 text-green-500",
      bug: "bg-red-500/10 text-red-500",
    };
    return colors[type] || colors.task;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      urgent: "bg-red-500/10 text-red-500",
      high: "bg-orange-500/10 text-orange-500",
      medium: "bg-yellow-500/10 text-yellow-500",
      low: "bg-blue-500/10 text-blue-500",
    };
    return colors[priority] || colors.medium;
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "mb-2 cursor-pointer hover:shadow-md transition-shadow",
        isDragging && "opacity-50"
      )}
      onClick={() => onItemClick?.(item.id)}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <button
            className="cursor-grab active:cursor-grabbing"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </button>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium">{item.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-xs capitalize", getTypeColor(item.type))}>
                {item.type}
              </Badge>
              <Badge variant="outline" className={cn("text-xs capitalize", getPriorityColor(item.priority))}>
                {item.priority}
              </Badge>
              {item.story_points && (
                <Badge variant="secondary" className="text-xs">
                  {item.story_points} pts
                </Badge>
              )}
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            #{item.rank}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface BacklogRankingProps {
  items: BacklogItem[];
  onRankChange?: (items: BacklogItem[]) => void;
  onItemClick?: (id: string) => void;
  onAddItem?: () => void;
}

export function BacklogRanking({ items: initialItems, onRankChange, onItemClick, onAddItem }: BacklogRankingProps) {
  const [items, setItems] = useState(initialItems);
  const [searchTerm, setSearchTerm] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

      setItems(newItems);
      onRankChange?.(newItems);
    }
  };

  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search backlog..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <Button onClick={onAddItem}>
          <Plus className="h-4 w-4 mr-2" />
          Add Item
        </Button>
      </div>

      <div className="text-sm text-muted-foreground mb-2">
        {filteredItems.length} items • Drag to reorder priority
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={filteredItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {filteredItems.map((item) => (
            <SortableItem key={item.id} item={item} onItemClick={onItemClick} />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
