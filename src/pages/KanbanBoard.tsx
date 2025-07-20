import { useState, useEffect } from "react";
import { useRealtime } from "@/hooks/useRealtime";
import { useToast } from "@/hooks/use-toast";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KanbanColumn, Column } from "@/components/kanban/KanbanColumn";
import { TaskCard, Task } from "@/components/kanban/TaskCard";
import { TaskDialog } from "@/components/kanban/TaskDialog";
import { Plus, Filter, Search, Settings } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Mock data
const initialColumns: Column[] = [
  {
    id: "todo",
    title: "To Do",
    tasks: [
      {
        id: "task-1",
        title: "Design new login page",
        description: "Create wireframes and mockups for the new authentication flow",
        status: "todo",
        priority: "high",
        assignee: { name: "Alice Johnson", initials: "AJ", avatar: "" },
        dueDate: "Dec 15",
        tags: ["Design", "Frontend"],
        comments: 3,
        attachments: 2,
      },
      {
        id: "task-2",
        title: "API Rate Limiting",
        description: "Implement rate limiting for API endpoints to prevent abuse",
        status: "todo",
        priority: "medium",
        assignee: { name: "Bob Smith", initials: "BS", avatar: "" },
        dueDate: "Dec 20",
        tags: ["Backend", "Security"],
        comments: 1,
        attachments: 0,
      },
    ],
  },
  {
    id: "inprogress",
    title: "In Progress",
    tasks: [
      {
        id: "task-3",
        title: "User dashboard redesign",
        description: "Modernize the dashboard with new charts and improved UX",
        status: "inprogress",
        priority: "high",
        assignee: { name: "Carol Davis", initials: "CD", avatar: "" },
        dueDate: "Dec 18",
        tags: ["Design", "Frontend"],
        comments: 5,
        attachments: 3,
      },
    ],
  },
  {
    id: "review",
    title: "Review",
    tasks: [
      {
        id: "task-4",
        title: "Database optimization",
        description: "Optimize slow queries and add proper indexing",
        status: "review",
        priority: "medium",
        assignee: { name: "David Wilson", initials: "DW", avatar: "" },
        dueDate: "Dec 12",
        tags: ["Backend", "Performance"],
        comments: 2,
        attachments: 1,
      },
    ],
  },
  {
    id: "done",
    title: "Done",
    tasks: [
      {
        id: "task-5",
        title: "Setup CI/CD pipeline",
        description: "Configure automated testing and deployment",
        status: "done",
        priority: "low",
        assignee: { name: "Alice Johnson", initials: "AJ", avatar: "" },
        dueDate: "Dec 5",
        tags: ["DevOps", "Backend"],
        comments: 4,
        attachments: 2,
      },
    ],
  },
];

export default function KanbanBoard() {
  const [columns, setColumns] = useState<Column[]>(initialColumns);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterBy, setFilterBy] = useState("all");
  const [taskDialog, setTaskDialog] = useState<{
    isOpen: boolean;
    task?: Task | null;
    columnId?: string;
  }>({ isOpen: false });
  
  const { toast } = useToast();

  // Real-time updates for tasks
  useRealtime({
    table: 'tasks',
    onInsert: (payload) => {
      toast({
        title: "New Task Created",
        description: `"${payload.new.title}" was added to the board`,
      });
      // In a real app, you would refresh the data here
    },
    onUpdate: (payload) => {
      toast({
        title: "Task Updated",
        description: `"${payload.new.title}" was modified`,
      });
      // In a real app, you would update the specific task
    },
    onDelete: (payload) => {
      toast({
        title: "Task Deleted",
        description: "A task was removed from the board",
        variant: "destructive",
      });
      // In a real app, you would remove the task from state
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = findTask(active.id as string);
    setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = findTask(activeId);
    const overColumn = findColumn(overId);

    if (!activeTask) return;

    setColumns((columns) => {
      const activeColumn = columns.find((col) =>
        col.tasks.some((task) => task.id === activeId)
      );

      if (!activeColumn) return columns;

      // Moving to a different column
      if (overColumn && activeColumn.id !== overColumn.id) {
        const activeIndex = activeColumn.tasks.findIndex(
          (task) => task.id === activeId
        );
        const updatedTask = { ...activeTask, status: overColumn.id };

        return columns.map((col) => {
          if (col.id === activeColumn.id) {
            return {
              ...col,
              tasks: col.tasks.filter((task) => task.id !== activeId),
            };
          }
          if (col.id === overColumn.id) {
            return {
              ...col,
              tasks: [...col.tasks, updatedTask],
            };
          }
          return col;
        });
      }

      // Reordering within the same column
      const overTask = findTask(overId);
      if (overTask && activeColumn.id === overTask.status) {
        const activeIndex = activeColumn.tasks.findIndex(
          (task) => task.id === activeId
        );
        const overIndex = activeColumn.tasks.findIndex(
          (task) => task.id === overId
        );

        return columns.map((col) => {
          if (col.id === activeColumn.id) {
            return {
              ...col,
              tasks: arrayMove(col.tasks, activeIndex, overIndex),
            };
          }
          return col;
        });
      }

      return columns;
    });
  };

  const findTask = (id: string): Task | undefined => {
    for (const column of columns) {
      const task = column.tasks.find((task) => task.id === id);
      if (task) return task;
    }
  };

  const findColumn = (id: string): Column | undefined => {
    return columns.find((col) => col.id === id);
  };

  const handleAddTask = (columnId: string) => {
    setTaskDialog({ isOpen: true, columnId });
  };

  const handleEditTask = (task: Task) => {
    setTaskDialog({ isOpen: true, task });
  };

  const handleDeleteTask = (taskId: string) => {
    setColumns((columns) =>
      columns.map((col) => ({
        ...col,
        tasks: col.tasks.filter((task) => task.id !== taskId),
      }))
    );
  };

  const handleSaveTask = (taskData: Partial<Task>) => {
    if (taskDialog.task) {
      // Update existing task
      setColumns((columns) =>
        columns.map((col) => ({
          ...col,
          tasks: col.tasks.map((task) =>
            task.id === taskDialog.task!.id ? { ...task, ...taskData } : task
          ),
        }))
      );
    } else {
      // Add new task
      const columnId = taskDialog.columnId;
      if (columnId) {
        setColumns((columns) =>
          columns.map((col) =>
            col.id === columnId
              ? { ...col, tasks: [...col.tasks, taskData as Task] }
              : col
          )
        );
      }
    }
  };

  const addNewColumn = () => {
    const newColumn: Column = {
      id: `column-${Date.now()}`,
      title: "New Column",
      tasks: [],
    };
    setColumns([...columns, newColumn]);
  };

  const filteredColumns = columns.map((column) => ({
    ...column,
    tasks: column.tasks.filter((task) => {
      const matchesSearch = task.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesFilter =
        filterBy === "all" ||
        task.priority === filterBy ||
        task.assignee?.name.toLowerCase().includes(filterBy.toLowerCase());
      return matchesSearch && matchesFilter;
    }),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Kanban Board</h1>
          <p className="text-muted-foreground">
            Drag and drop tasks to manage your workflow
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={addNewColumn}>
            <Plus className="w-4 h-4 mr-2" />
            Add Column
          </Button>
          <Button className="bg-gradient-primary hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/30 border-muted focus:bg-background"
          />
        </div>
        <Select value={filterBy} onValueChange={setFilterBy}>
          <SelectTrigger className="w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tasks</SelectItem>
            <SelectItem value="urgent">Urgent Priority</SelectItem>
            <SelectItem value="high">High Priority</SelectItem>
            <SelectItem value="medium">Medium Priority</SelectItem>
            <SelectItem value="low">Low Priority</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 min-w-fit">
            {filteredColumns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? (
              <div className="rotate-2 opacity-90">
                <TaskCard task={activeTask} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Task Dialog */}
      <TaskDialog
        task={taskDialog.task}
        isOpen={taskDialog.isOpen}
        onClose={() => setTaskDialog({ isOpen: false })}
        onSave={handleSaveTask}
        columnId={taskDialog.columnId}
      />
    </div>
  );
}