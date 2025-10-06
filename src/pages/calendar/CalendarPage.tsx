import { useCallback, useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  addDays,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useCalendarRange, CalendarTask } from "@/hooks/useCalendar";
import { DateRangeControls, DateRange, CalendarUnit } from "@/components/common/DateRangeControls";
import { ViewSwitch, CalendarView } from "@/components/common/ViewSwitch";
import { TaskPreviewDrawer } from "@/components/tasks/TaskPreviewDrawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const WEEK_OPTIONS = { weekStartsOn: 1 as const };
const MAX_VISIBLE_TASKS = 3;

interface ProjectOption {
  id: string;
  name: string | null;
}

function getRangeForView(view: CalendarView, pivot: Date): DateRange {
  switch (view) {
    case "day":
      return { from: startOfDay(pivot), to: endOfDay(pivot) };
    case "week":
      return {
        from: startOfWeek(pivot, WEEK_OPTIONS),
        to: endOfWeek(pivot, WEEK_OPTIONS),
      };
    case "month":
    default:
      return {
        from: startOfMonth(pivot),
        to: endOfMonth(pivot),
      };
  }
}

function formatHeaderLabel(view: CalendarView, range: DateRange) {
  switch (view) {
    case "day":
      return format(range.from, "EEEE, MMM d");
    case "week":
      return `${format(range.from, "MMM d")} - ${format(range.to, "MMM d")}`;
    case "month":
    default:
      return format(range.from, "MMMM yyyy");
  }
}

function normalizeTaskInterval(task: CalendarTask) {
  const start = task.start_date ? startOfDay(parseISO(task.start_date)) : null;
  const due = task.due_date ? endOfDay(parseISO(task.due_date)) : null;

  if (!start && !due) return null;

  if (start && due) {
    if (start <= due) {
      return { start, end: due };
    }
    return { start: due, end: endOfDay(start) };
  }

  if (start && !due) {
    return { start, end: endOfDay(start) };
  }

  if (!start && due) {
    const normalized = startOfDay(due);
    return { start: normalized, end: endOfDay(due) };
  }

  return null;
}

function getDayKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function buildTasksByDay(tasks: CalendarTask[]) {
  const map = new Map<string, CalendarTask[]>();
  tasks.forEach((task) => {
    const interval = normalizeTaskInterval(task);
    if (!interval) return;
    const days = eachDayOfInterval({ start: interval.start, end: interval.end });
    days.forEach((day) => {
      const key = getDayKey(day);
      const existing = map.get(key);
      if (existing) {
        existing.push(task);
      } else {
        map.set(key, [task]);
      }
    });
  });
  return map;
}

function useProjectsList() {
  return useQuery({
    queryKey: ["calendar", "projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name");
      if (error) {
        throw error;
      }
      return (data ?? []) as ProjectOption[];
    },
  });
}

interface DayTasksDrawerProps {
  date: Date | null;
  tasks: CalendarTask[];
  open: boolean;
  onClose: () => void;
  onSelectTask: (task: CalendarTask) => void;
  getProjectName: (projectId: string) => string;
}

function DayTasksDrawer({ date, tasks, open, onClose, onSelectTask, getProjectName }: DayTasksDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <SheetContent side="right" className="flex w-full flex-col gap-4 sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>{date ? format(date, "EEEE, MMM d") : "Tasks"}</SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-full pr-2">
          <div className="space-y-2 pb-6">
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks scheduled.</p>
            ) : (
              tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onSelectTask(task)}
                  className="w-full rounded-md border bg-background p-3 text-left transition hover:border-primary"
                >
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{getProjectName(task.project_id)}</p>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function CalendarSkeleton() {
  return (
    <div className="grid gap-px rounded-lg border bg-border">
      {Array.from({ length: 6 }).map((_, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 gap-px">
          {Array.from({ length: 7 }).map((__, dayIndex) => (
            <Skeleton key={`${weekIndex}-${dayIndex}`} className="h-24 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

function CalendarEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center rounded-md border border-dashed text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

export default function CalendarPage() {
  const [view, setView] = useState<CalendarView>("month");
  const [range, setRange] = useState<DateRange>(() => getRangeForView("month", new Date()));
  const [focusedDate, setFocusedDate] = useState<Date>(range.from);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const [isTaskDrawerOpen, setIsTaskDrawerOpen] = useState(false);
  const [expandedDay, setExpandedDay] = useState<Date | null>(null);
  const [isDayDrawerOpen, setIsDayDrawerOpen] = useState(false);

  const { data: projects = [] } = useProjectsList();
  const projectLookup = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((project) => {
      map.set(project.id, project.name ?? "Untitled project");
    });
    return map;
  }, [projects]);

  const { tasks, isLoading, error, refetch } = useCalendarRange({
    from: range.from,
    to: range.to,
    projectId: selectedProject,
  });

  const tasksByDay = useMemo(() => buildTasksByDay(tasks), [tasks]);

  const getTasksForDate = useCallback(
    (date: Date) => tasksByDay.get(getDayKey(date)) ?? [],
    [tasksByDay]
  );

  const expandedDayTasks = expandedDay ? getTasksForDate(expandedDay) : [];

  useEffect(() => {
    document.title = "Calendar";
  }, []);

  const unitMap: Record<CalendarView, CalendarUnit> = {
    month: "month",
    week: "week",
    day: "day",
  };

  const headerLabel = useMemo(() => formatHeaderLabel(view, range), [view, range]);

  const handleRangeChange = (nextRange: DateRange) => {
    setRange(nextRange);
    setFocusedDate(nextRange.from);
  };

  const updateFocusedDate = (next: Date) => {
    setFocusedDate(next);
    if (next < range.from || next > range.to) {
      const nextRange = getRangeForView(view, next);
      setRange(nextRange);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      updateFocusedDate(addDays(focusedDate, -1));
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      updateFocusedDate(addDays(focusedDate, 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      updateFocusedDate(addDays(focusedDate, view === "month" ? -7 : -1));
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      updateFocusedDate(addDays(focusedDate, view === "month" ? 7 : 1));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      setExpandedDay(focusedDate);
      setIsDayDrawerOpen(true);
    }
    if (event.key === "Escape") {
      if (isTaskDrawerOpen) {
        setIsTaskDrawerOpen(false);
      }
      if (isDayDrawerOpen) {
        setIsDayDrawerOpen(false);
        setExpandedDay(null);
      }
    }
  };

  const openTask = (task: CalendarTask) => {
    setSelectedTask(task);
    setIsTaskDrawerOpen(true);
    setIsDayDrawerOpen(false);
  };

  const renderMonth = () => {
    const start = startOfWeek(startOfMonth(range.from), WEEK_OPTIONS);
    const end = endOfWeek(endOfMonth(range.from), WEEK_OPTIONS);
    const days = eachDayOfInterval({ start, end });
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div
        role="grid"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="grid gap-px rounded-lg border bg-border outline-none"
      >
        {weeks.map((week, index) => (
          <div key={index} role="row" className="grid grid-cols-7 gap-px">
            {week.map((day) => {
              const dayTasks = getTasksForDate(day);
              const visible = dayTasks.slice(0, MAX_VISIBLE_TASKS);
              const remaining = dayTasks.length - visible.length;
              const isFocused = isSameDay(day, focusedDate);
              return (
                <div
                  key={day.toISOString()}
                  role="gridcell"
                  className={cn(
                    "flex min-h-[120px] flex-col bg-background p-2 text-xs",
                    !isSameMonth(day, range.from) && "bg-muted/40 text-muted-foreground",
                    isFocused && "ring-2 ring-primary"
                  )}
                  onClick={() => updateFocusedDate(day)}
                >
                  <div className="flex items-center justify-between">
                    <span className={cn("text-sm font-medium", isToday(day) && "text-primary")}>{format(day, "d")}</span>
                    {isToday(day) && <Badge variant="outline">Today</Badge>}
                  </div>
                  <div className="mt-2 space-y-1">
                    {visible.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => openTask(task)}
                        className="flex w-full items-center justify-between rounded-md bg-primary/10 px-2 py-1 text-left text-xs hover:bg-primary/20"
                      >
                        <span className="truncate">{task.title}</span>
                      </button>
                    ))}
                    {remaining > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedDay(day);
                          setIsDayDrawerOpen(true);
                        }}
                        className="w-full rounded-md border border-dashed px-2 py-1 text-left text-xs text-muted-foreground hover:border-primary"
                      >
                        +{remaining} more
                      </button>
                    )}
                    {dayTasks.length === 0 && (
                      <p className="text-xs text-muted-foreground">No tasks</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  const renderWeek = () => {
    const days = eachDayOfInterval({ start: range.from, end: range.to });
    return (
      <div
        role="grid"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="grid grid-cols-7 gap-2"
      >
        {days.map((day) => {
          const dayTasks = getTasksForDate(day);
          const isFocused = isSameDay(day, focusedDate);
          return (
            <div
              key={day.toISOString()}
              role="gridcell"
              className={cn(
                "flex min-h-[160px] flex-col rounded-lg border bg-background p-3",
                isFocused && "ring-2 ring-primary"
              )}
              onClick={() => updateFocusedDate(day)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{format(day, "EEE d")}</span>
                {isToday(day) && <Badge variant="outline">Today</Badge>}
              </div>
              <div className="mt-3 space-y-2">
                {dayTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No tasks</p>
                ) : (
                  dayTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => openTask(task)}
                      className="w-full rounded-md bg-primary/10 px-2 py-1 text-left text-sm hover:bg-primary/20"
                    >
                      <p className="truncate font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{projectLookup.get(task.project_id) ?? "Project"}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDay = () => {
    const dayTasks = getTasksForDate(focusedDate);
    return (
      <div
        role="grid"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="flex flex-col gap-4"
      >
        <div className="rounded-lg border bg-background p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{format(focusedDate, "EEEE, MMM d")}</h2>
            {isToday(focusedDate) && <Badge variant="outline">Today</Badge>}
          </div>
          <div className="mt-4 space-y-3">
            {dayTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks in this day.</p>
            ) : (
              dayTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => openTask(task)}
                  className="w-full rounded-md border bg-muted/40 px-3 py-2 text-left transition hover:border-primary"
                >
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{projectLookup.get(task.project_id) ?? "Project"}</p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (isLoading) {
      return <CalendarSkeleton />;
    }

    if (error) {
      return (
        <div className="flex flex-col gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>We could not load the calendar right now.</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>Retry</Button>
        </div>
      );
    }

    if (tasks.length === 0) {
      return <CalendarEmptyState message="No tasks in this range." />;
    }

    if (view === "month") return renderMonth();
    if (view === "week") return renderWeek();
    return renderDay();
  };

  return (
    <section className="flex flex-col gap-6">
      <header className="space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Calendar</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Calendar</h1>
            <p className="text-muted-foreground">Plan work across every project.</p>
          </div>
          <ViewSwitch value={view} onChange={(next) => {
            setView(next);
            setRange(getRangeForView(next, focusedDate));
          }} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <DateRangeControls unit={unitMap[view]} range={range} onChange={handleRangeChange} />
            <span className="text-sm font-medium">{headerLabel}</span>
          </div>
          <Select
            value={selectedProject ?? "all"}
            onValueChange={(value) => {
              setSelectedProject(value === "all" ? undefined : value);
            }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name ?? "Untitled project"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>
      {renderContent()}
      <TaskPreviewDrawer
        task={selectedTask}
        open={isTaskDrawerOpen}
        onClose={() => setIsTaskDrawerOpen(false)}
        projectName={selectedTask ? projectLookup.get(selectedTask.project_id) ?? undefined : undefined}
      />
      <DayTasksDrawer
        date={expandedDay}
        tasks={expandedDayTasks}
        open={isDayDrawerOpen}
        onClose={() => {
          setIsDayDrawerOpen(false);
          setExpandedDay(null);
        }}
        onSelectTask={openTask}
        getProjectName={(projectId) => projectLookup.get(projectId) ?? "Project"}
      />
    </section>
  );
}
