import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  title: string;
  task_type?: string;
  hierarchy_level?: string;
  status?: string;
  priority?: string;
  assignee_id?: string;
  story_points?: number;
  due_date?: string;
  parent_id?: string;
  children?: Task[];
}

interface TableViewProps {
  tasks: Task[];
  onTaskClick?: (taskId: string) => void;
  showHierarchy?: boolean;
}

export function TableView({ tasks, onTaskClick, showHierarchy = true }: TableViewProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const toggleRow = (taskId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedRows(newExpanded);
  };

  const buildHierarchy = (tasks: Task[]): Task[] => {
    if (!showHierarchy) return tasks;
    
    const taskMap = new Map<string, Task>();
    const rootTasks: Task[] = [];

    tasks.forEach(task => {
      taskMap.set(task.id, { ...task, children: [] });
    });

    tasks.forEach(task => {
      const taskWithChildren = taskMap.get(task.id)!;
      if (task.parent_id && taskMap.has(task.parent_id)) {
        taskMap.get(task.parent_id)!.children!.push(taskWithChildren);
      } else {
        rootTasks.push(taskWithChildren);
      }
    });

    return rootTasks;
  };

  const filterTasks = (tasks: Task[]): Task[] => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || task.task_type === typeFilter;
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  };

  const getTypeColor = (type?: string) => {
    const colors: Record<string, string> = {
      epic: "bg-purple-500/10 text-purple-500",
      story: "bg-blue-500/10 text-blue-500",
      task: "bg-green-500/10 text-green-500",
      bug: "bg-red-500/10 text-red-500",
      feature_request: "bg-cyan-500/10 text-cyan-500",
    };
    return colors[type || "task"] || colors.task;
  };

  const getPriorityColor = (priority?: string) => {
    const colors: Record<string, string> = {
      urgent: "bg-red-500/10 text-red-500",
      high: "bg-orange-500/10 text-orange-500",
      medium: "bg-yellow-500/10 text-yellow-500",
      low: "bg-blue-500/10 text-blue-500",
    };
    return colors[priority || "medium"] || colors.medium;
  };

  const renderTask = (task: Task, level: number = 0) => {
    const hasChildren = task.children && task.children.length > 0;
    const isExpanded = expandedRows.has(task.id);

    return (
      <>
        <TableRow 
          key={task.id}
          className="hover:bg-muted/50 cursor-pointer"
          onClick={() => onTaskClick?.(task.id)}
        >
          <TableCell style={{ paddingLeft: `${level * 24 + 16}px` }}>
            <div className="flex items-center gap-2">
              {hasChildren && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleRow(task.id);
                  }}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              )}
              <span className="font-medium">{task.title}</span>
            </div>
          </TableCell>
          <TableCell>
            <Badge variant="outline" className={cn("capitalize", getTypeColor(task.task_type))}>
              {task.task_type?.replace(/_/g, " ")}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge variant="outline" className="capitalize">
              {task.status?.replace(/_/g, " ")}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge variant="outline" className={cn("capitalize", getPriorityColor(task.priority))}>
              {task.priority}
            </Badge>
          </TableCell>
          <TableCell>
            {task.assignee_id && (
              <Avatar className="h-6 w-6">
                <AvatarImage src="" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            )}
          </TableCell>
          <TableCell className="text-center">{task.story_points || "-"}</TableCell>
          <TableCell>
            {task.due_date ? new Date(task.due_date).toLocaleDateString() : "-"}
          </TableCell>
        </TableRow>
        {isExpanded && hasChildren && task.children!.map(child => renderTask(child, level + 1))}
      </>
    );
  };

  const hierarchicalTasks = buildHierarchy(filterTasks(tasks));

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="epic">Epic</SelectItem>
            <SelectItem value="story">Story</SelectItem>
            <SelectItem value="task">Task</SelectItem>
            <SelectItem value="bug">Bug</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead className="text-center">Points</TableHead>
              <TableHead>Due Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hierarchicalTasks.map(task => renderTask(task))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
