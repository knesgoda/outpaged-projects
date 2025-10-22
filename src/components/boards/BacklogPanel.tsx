import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { useProject } from "@/contexts/ProjectContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Search, ListTodo, Calendar } from "lucide-react";
import { fetchBacklogItems, getBacklogStats } from "@/services/boards/backlogService";
import { statusService } from "@/services/boards/statusService";
import { addTaskToSprint, getActiveSprint, getSprintMetrics } from "@/services/boards/sprintService";
import { SprintPanel } from "./SprintPanel";
import { BacklogCard } from "./BacklogCard";

export function BacklogPanel() {
  const { project } = useProject();
  const [backlogItems, setBacklogItems] = useState<any[]>([]);
  const [backlogStats, setBacklogStats] = useState<any>(null);
  const [activeSprint, setActiveSprint] = useState<any>(null);
  const [sprintMetrics, setSprintMetrics] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [backlogStatuses, setBacklogStatuses] = useState<string[]>(["backlog", "todo"]);
  const [transferEffect, setTransferEffect] = useState<{
    id: string;
    start: { x: number; y: number };
    end: { x: number; y: number };
  } | null>(null);

  const backlogRefs = useRef(new Map<string, HTMLElement>());
  const sprintDropRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadBacklogConfiguration();
    loadSprintData();
  }, [project.id]);

  useEffect(() => {
    if (!transferEffect) return;
    const timeout = setTimeout(() => setTransferEffect(null), 750);
    return () => clearTimeout(timeout);
  }, [transferEffect]);

  async function loadBacklogConfiguration() {
    const statuses = await resolveBacklogStatuses();
    setBacklogStatuses(statuses);
    await loadBacklogData(statuses);
  }

  async function resolveBacklogStatuses(): Promise<string[]> {
    try {
      const statuses = await statusService.getProjectStatuses(project.id);
      const backlogKeys = statuses
        .filter(status => status.category === "Todo")
        .map(status => status.key)
        .filter((key): key is string => Boolean(key && key.trim()));

      return backlogKeys.length > 0 ? backlogKeys : ["backlog", "todo"];
    } catch (error) {
      console.error("Error resolving backlog statuses:", error);
      return ["backlog", "todo"];
    }
  }

  async function loadBacklogData(statuses: string[] = backlogStatuses) {
    setIsLoading(true);
    try {
      const items = await fetchBacklogItems(project.id, statuses);
      const stats = await getBacklogStats(project.id, statuses, items);
      setBacklogItems(items);
      setBacklogStats(stats);
    } catch (error) {
      console.error("Error loading backlog:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadSprintData() {
    const sprint = await getActiveSprint(project.id);
    setActiveSprint(sprint);
    
    if (sprint) {
      const metrics = await getSprintMetrics(sprint.id, sprint.project_id);
      setSprintMetrics(metrics);
    }
  }

  const filteredItems = useMemo(
    () =>
      backlogItems.filter((item) =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [backlogItems, searchQuery]
  );
  const surfaceWidth = surfaceRef.current?.clientWidth ?? 1;
  const surfaceHeight = surfaceRef.current?.clientHeight ?? 1;

  function registerBacklogNode(taskId: string, node: HTMLElement | null) {
    if (!node) {
      backlogRefs.current.delete(taskId);
      return;
    }

    backlogRefs.current.set(taskId, node);
  }

  function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    if (
      destination.droppableId === "backlog" &&
      source.droppableId === "backlog"
    ) {
      if (destination.index === source.index) return;

      setBacklogItems((items) => {
        const updated = [...items];
        const draggedIndex = updated.findIndex((item) => item.id === draggableId);
        if (draggedIndex === -1) return items;
        const [removed] = updated.splice(draggedIndex, 1);

        if (destination.index >= filteredItems.length) {
          updated.push(removed);
        } else {
          const targetId = filteredItems[destination.index]?.id;
          const targetIndex = targetId
            ? updated.findIndex((item) => item.id === targetId)
            : updated.length;
          const insertIndex = targetIndex < 0 ? updated.length : targetIndex;
          updated.splice(insertIndex, 0, removed);
        }

        return updated;
      });
      return;
    }

    if (
      destination.droppableId === "sprint" &&
      source.droppableId === "backlog" &&
      activeSprint
    ) {
      const sourceIndex = source.index;
      const task = backlogItems[sourceIndex];
      triggerTransferEffect(draggableId);
      setBacklogItems((items) => items.filter((item) => item.id !== task.id));
      void addTaskToSprint(activeSprint.id, task.id).then((success) => {
        if (!success) {
          setBacklogItems((items) => {
            const clone = [...items];
            clone.splice(sourceIndex, 0, task);
            return clone;
          });
        }
        loadBacklogData();
        loadSprintData();
      });
    }
  }

  function triggerTransferEffect(taskId: string) {
    const sourceEl = backlogRefs.current.get(taskId);
    const targetEl = sprintDropRef.current;
    const surfaceEl = surfaceRef.current;

    if (!sourceEl || !targetEl || !surfaceEl) return;

    const sourceRect = sourceEl.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const surfaceRect = surfaceEl.getBoundingClientRect();

    setTransferEffect({
      id: taskId,
      start: {
        x: sourceRect.right - surfaceRect.left,
        y: sourceRect.top + sourceRect.height / 2 - surfaceRect.top,
      },
      end: {
        x: targetRect.left - surfaceRect.left,
        y: targetRect.top + targetRect.height / 2 - surfaceRect.top,
      },
    });
  }

  return (
    <div ref={surfaceRef} className="relative h-full overflow-hidden rounded-2xl bg-[#050d1f] text-slate-100">
      <div className="absolute inset-0 pointer-events-none">
        <AnimatePresence>
          {transferEffect && (
            <motion.svg
              key={transferEffect.id}
              className="absolute inset-0"
              viewBox={`0 0 ${surfaceWidth} ${surfaceHeight}`}
            >
              <motion.path
                d={`M ${transferEffect.start.x} ${transferEffect.start.y} C ${transferEffect.start.x + 80} ${transferEffect.start.y}, ${transferEffect.end.x - 80} ${transferEffect.end.y}, ${transferEffect.end.x} ${transferEffect.end.y}`}
                stroke="rgba(255,153,0,0.85)"
                strokeWidth={3}
                strokeLinecap="round"
                fill="transparent"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              />
              <motion.circle
                cx={transferEffect.end.x}
                cy={transferEffect.end.y}
                r={6}
                fill="rgba(255,153,0,0.95)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="relative z-10 grid h-full grid-cols-1 gap-6 p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <Droppable droppableId="backlog">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-[rgba(11,29,58,0.85)] shadow-[0_20px_40px_rgba(2,8,23,0.45)] backdrop-blur"
              >
                <div className="flex items-center justify-between gap-3 border-b border-white/10 p-5">
                  <div className="flex items-center gap-3 text-base font-semibold tracking-tight">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                      <ListTodo className="h-5 w-5" />
                    </div>
                    Backlog
                  </div>
                  {backlogStats && (
                    <div className="hidden items-center gap-2 text-xs font-medium text-white/70 md:flex">
                      <Badge variant="secondary" className="bg-white/10 text-white">
                        {backlogStats.totalItems} items
                      </Badge>
                      <Badge variant="secondary" className="bg-white/10 text-white">
                        {backlogStats.totalPoints} pts
                      </Badge>
                      {backlogStats.totalHours > 0 && (
                        <Badge variant="secondary" className="bg-white/10 text-white">
                          {backlogStats.totalHours}h
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-4 border-b border-white/10 p-5">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                    <Input
                      placeholder="Search backlog..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-11 rounded-full border-white/10 bg-white/5 pl-11 text-slate-100 placeholder:text-white/40 focus-visible:ring-white/30"
                    />
                  </div>

                  {backlogStats && (
                    <div className="flex flex-wrap gap-2 text-xs font-medium text-white/80 md:hidden">
                      <Badge variant="secondary" className="bg-white/10 text-white">
                        {backlogStats.totalItems} items
                      </Badge>
                      <Badge variant="secondary" className="bg-white/10 text-white">
                        {backlogStats.totalPoints} pts
                      </Badge>
                      {backlogStats.totalHours > 0 && (
                        <Badge variant="secondary" className="bg-white/10 text-white">
                          {backlogStats.totalHours}h
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <ScrollArea className="flex-1">
                  <div className="space-y-3 p-5">
                    {isLoading ? (
                      <div className="py-12 text-center text-sm text-white/60">
                        Loading backlog...
                      </div>
                    ) : filteredItems.length === 0 ? (
                      <div className="py-12 text-center text-sm text-white/60">
                        {searchQuery ? "No items match your search" : "No items in backlog"}
                      </div>
                    ) : (
                      filteredItems.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(draggableProvided, snapshot) => (
                            <motion.div
                              layout
                              ref={(node) => {
                                draggableProvided.innerRef(node);
                                if (node) {
                                  registerBacklogNode(item.id, node);
                                } else {
                                  registerBacklogNode(item.id, null);
                                }
                              }}
                              {...draggableProvided.draggableProps}
                              {...draggableProvided.dragHandleProps}
                              className="shadow-none"
                              animate={{ scale: snapshot.isDragging ? 1.02 : 1 }}
                            >
                              <BacklogCard
                                task={item}
                                onRefresh={() => loadBacklogData()}
                                className="bg-[rgba(14,35,70,0.92)] border-white/5 text-slate-100"
                              />
                            </motion.div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {provided.placeholder}
                  </div>
                </ScrollArea>
              </div>
            )}
          </Droppable>

          <Droppable droppableId="sprint" isDropDisabled={!activeSprint}>
            {(provided, snapshot) => (
              <div className="relative">
                <div
                  ref={(node) => {
                    provided.innerRef(node);
                    sprintDropRef.current = node;
                  }}
                  {...provided.droppableProps}
                  className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-[rgba(8,24,48,0.92)] shadow-[0_20px_40px_rgba(2,8,23,0.35)] backdrop-blur"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 p-5">
                    <div className="flex items-center gap-3 text-base font-semibold tracking-tight">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                        <Calendar className="h-5 w-5" />
                      </div>
                      Sprint
                    </div>
                    <Badge
                      variant="secondary"
                      className="hidden bg-white/10 text-white md:inline-flex"
                    >
                      {activeSprint ? activeSprint.name : "No active sprint"}
                    </Badge>
                  </div>

                  <div className="px-5">
                    <Separator className="my-0.5 bg-white/10" />
                  </div>

                  <div className="flex-1">
                    <SprintPanel
                      activeSprint={activeSprint}
                      sprintMetrics={sprintMetrics}
                      onSprintChange={loadSprintData}
                      isDragTargetActive={snapshot.isDraggingOver}
                    />
                  </div>
                  {provided.placeholder}
                </div>
                <div className="pointer-events-none absolute inset-y-8 -left-6 hidden w-12 rounded-full border-l border-white/10 bg-gradient-to-b from-white/5 via-transparent to-white/5 lg:block" />
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>
    </div>
  );
}
