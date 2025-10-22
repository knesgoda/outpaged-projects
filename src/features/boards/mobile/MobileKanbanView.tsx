import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { motion, useMotionValue, animate } from "framer-motion";
import type { PanInfo } from "framer-motion";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QueueDrawer } from "@/components/mobile/QueueDrawer";
import { SwipeableCard, SwipeActions } from "@/components/mobile/SwipeableCard";
import { useToast } from "@/hooks/use-toast";

import type { QueueSyncer } from "@/services/offline";
import { useBoardViewContext } from "../views/context";
import { buildKanbanDataset, type KanbanCard } from "../views/kanbanDataset";
import type { BoardViewRecord } from "../views/context";

import { MobileQuickActionsSheet, type QuickActionDefinition } from "./MobileQuickActionsSheet";
import { MobileQuickTaskSheet } from "./MobileQuickTaskSheet";
import { useMobileBoardSync } from "./useMobileBoardSync";
import { ConflictResolutionDialog } from "./ConflictResolutionDialog";

interface MobileKanbanViewProps {
  boardId: string;
  syncer?: QueueSyncer;
}

const DEFAULT_SYNCER: QueueSyncer = async () => ({ kind: "success" });

const toRecordId = (record: Record<string, unknown>): string | null => {
  if (typeof record.id === "string" || typeof record.id === "number") {
    return String(record.id);
  }
  if (typeof record.uuid === "string") {
    return record.uuid;
  }
  return null;
};

const getCardTitle = (card: KanbanCard) =>
  String(card.record.title ?? card.record.name ?? card.id);

export function MobileKanbanView({ boardId, syncer = DEFAULT_SYNCER }: MobileKanbanViewProps) {
  const { items, configuration, replaceItems, isLoading } = useBoardViewContext();
  const { toast } = useToast();
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedColumnLabel, setSelectedColumnLabel] = useState<string | null>(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false);
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const announcementTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const x = useMotionValue(0);
  const [columnWidth, setColumnWidth] = useState(0);

  const dataset = useMemo(
    () =>
      buildKanbanDataset({
        items,
        grouping: configuration.grouping,
        sortRules: configuration.sort ?? [],
        colorRules: configuration.colorRules ?? [],
      }),
    [configuration.colorRules, configuration.grouping, configuration.sort, items]
  );

  const groupingField = dataset.groupingField ?? configuration.grouping.primary ?? "status";

  const columns = useMemo(
    () =>
      dataset.swimlanes.flatMap((lane) =>
        lane.groups.map((group) => ({
          id: `${lane.id}-${group.id}`,
          label: group.label,
          key: group.key,
          items: group.items,
          swimlane: lane,
        }))
      ),
    [dataset.swimlanes]
  );

  const selectedItem = useMemo(() => {
    if (!selectedItemId) return null;
    return items.find((item) => toRecordId(item) === selectedItemId) ?? null;
  }, [items, selectedItemId]);

  const handleApplyRemote = useCallback(
    (remoteRecord: Record<string, unknown>) => {
      const remoteId = toRecordId(remoteRecord);
      if (!remoteId) return;
      const nextItems = items.map((item) =>
        toRecordId(item) === remoteId ? { ...item, ...remoteRecord } : item
      );
      replaceItems(nextItems);
    },
    [items, replaceItems]
  );

  const sync = useMobileBoardSync({
    boardId,
    view: "kanban",
    items,
    syncer,
    onApplyRemote: handleApplyRemote,
  });

  useEffect(() => {
    if (sync.conflictUi.isOpen) {
      setQueueDrawerOpen(true);
    }
  }, [sync.conflictUi.isOpen]);

  const queueIndicator = sync.queue.length > 0 ? (
    <Button
      variant="outline"
      size="sm"
      className="border-orange-500/30 bg-orange-500/10 text-orange-200 shadow-none transition hover:bg-orange-500/15 focus-visible:ring-orange-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1f36]"
      data-testid="mobile-kanban-queue-indicator"
      onClick={() => setQueueDrawerOpen(true)}
    >
      {sync.queue.length} pending
    </Button>
  ) : null;

  const announce = useCallback((message: string) => {
    if (announcementTimeoutRef.current) {
      clearTimeout(announcementTimeoutRef.current);
    }
    setAnnouncement(message);
    announcementTimeoutRef.current = setTimeout(() => {
      setAnnouncement("");
      announcementTimeoutRef.current = null;
    }, 2500);
  }, []);

  useEffect(() => {
    return () => {
      if (announcementTimeoutRef.current) {
        clearTimeout(announcementTimeoutRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const measure = () => {
      setColumnWidth(viewportRef.current?.offsetWidth ?? 0);
    };
    measure();
    window.addEventListener("resize", measure);
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && viewportRef.current) {
      observer = new ResizeObserver(() => measure());
      observer.observe(viewportRef.current);
    }
    return () => {
      window.removeEventListener("resize", measure);
      observer?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!columns.length) {
      setActiveIndex(0);
      x.set(0);
      return;
    }
    setActiveIndex((current) => Math.min(current, columns.length - 1));
  }, [columns.length, x]);

  useEffect(() => {
    if (!columnWidth) {
      return;
    }
    const controls = animate(x, -activeIndex * columnWidth, {
      type: "spring",
      stiffness: 280,
      damping: 32,
    });
    return controls.stop;
  }, [activeIndex, columnWidth, x]);

  const dragConstraints = useMemo(
    () => ({ left: -columnWidth * Math.max(0, columns.length - 1), right: 0 }),
    [columnWidth, columns.length]
  );

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      if (!columnWidth || columns.length <= 1) {
        x.set(0);
        return;
      }
      const projected = x.get() + info.velocity.x * 0.2;
      const rawIndex = -projected / columnWidth;
      const nextIndex = Math.max(0, Math.min(columns.length - 1, Math.round(rawIndex)));
      setActiveIndex(nextIndex);
    },
    [columnWidth, columns.length, x]
  );

  const updateLocalItems = useCallback(
    (itemId: string, patch: Partial<BoardViewRecord>) => {
      const nextItems = items.map((item) =>
        toRecordId(item) === itemId ? { ...item, ...patch } : item
      );
      replaceItems(nextItems);
      return nextItems;
    },
    [items, replaceItems]
  );

  const persistChange = useCallback(
    async (
      card: KanbanCard,
      payload: Parameters<typeof sync.enqueue>[1],
      patch: Partial<BoardViewRecord>
    ) => {
      const recordId = toRecordId(card.record);
      if (!recordId) return;
      const nextItems = updateLocalItems(recordId, patch);
      await sync.enqueue(recordId, payload, nextItems, {
        baseVersion:
          typeof card.record.updated_at === "string" || typeof card.record.updated_at === "number"
            ? (card.record.updated_at as string | number)
            : null,
      });
      setSelectedItemId(recordId);
    },
    [sync, updateLocalItems]
  );

  const handleQuickAction = useCallback(
    async (action: QuickActionDefinition) => {
      if (!selectedItemId) return;
      const columnIndex = columns.findIndex((column) =>
        column.items.some((card) => toRecordId(card.record) === selectedItemId)
      );
      if (columnIndex === -1) return;

      const column = columns[columnIndex];
      const card = column.items.find((item) => toRecordId(item.record) === selectedItemId);
      if (!card) return;

      if (action.id === "move-forward") {
        const nextColumn = columns[columnIndex + 1];
        if (!nextColumn || !groupingField) {
          setQuickActionsOpen(false);
          return;
        }
        await persistChange(card, { type: "move", from: column.key, to: nextColumn.key, field: groupingField }, {
          [groupingField]: nextColumn.key,
        });
        setSelectedColumnLabel(nextColumn.label);
      } else if (action.id === "reset") {
        const firstColumn = columns[0];
        if (!firstColumn || !groupingField) {
          setQuickActionsOpen(false);
          return;
        }
        await persistChange(card, { type: "update", changes: { [groupingField]: firstColumn.key }, field: groupingField }, {
          [groupingField]: firstColumn.key,
        });
        setSelectedColumnLabel(firstColumn.label);
      } else if (action.id === "complete") {
        const doneColumn = [...columns].reverse().find((candidate) =>
          candidate.label.toLowerCase().includes("done") || candidate.label.toLowerCase().includes("complete")
        );
        const target = doneColumn ?? columns[columns.length - 1];
        if (!target || !groupingField) {
          setQuickActionsOpen(false);
          return;
        }
        await persistChange(card, { type: "update", changes: { [groupingField]: target.key }, field: groupingField }, {
          [groupingField]: target.key,
          status: target.key,
        });
        setSelectedColumnLabel(target.label);
      }
      setQuickActionsOpen(false);
    },
    [columns, groupingField, persistChange, selectedItemId]
  );

  const handleCardPress = useCallback(
    (card: KanbanCard, columnLabel: string) => {
      const id = toRecordId(card.record);
      if (!id) return;
      setSelectedItemId(id);
      setSelectedColumnLabel(columnLabel);
      setQuickActionsOpen(true);
    },
    []
  );

  const findDoneColumnForCard = useCallback(
    (columnIndex: number) => {
      const origin = columns[columnIndex];
      if (!origin) return null;
      const laneColumns = columns.filter((candidate) => candidate.swimlane.id === origin.swimlane.id);
      const doneCandidate = [...laneColumns]
        .reverse()
        .find((candidate) => {
          const label = candidate.label.toLowerCase();
          return label.includes("done") || label.includes("complete");
        });
      return doneCandidate ?? laneColumns[laneColumns.length - 1] ?? null;
    },
    [columns]
  );

  const handleCardSwipeDone = useCallback(
    async (card: KanbanCard, columnIndex: number) => {
      if (!groupingField) {
        toast({
          title: "Cannot mark done",
          description: "Status field unavailable for this board",
          variant: "destructive",
        });
        return;
      }

      const targetColumn = findDoneColumnForCard(columnIndex);
      if (!targetColumn) {
        toast({
          title: "Cannot mark done",
          description: "No destination column found",
          variant: "destructive",
        });
        return;
      }

      const recordId = toRecordId(card.record);
      if (!recordId) return;

      await persistChange(
        card,
        { type: "update", changes: { [groupingField]: targetColumn.key }, field: groupingField },
        { [groupingField]: targetColumn.key, status: targetColumn.key }
      );

      const title = getCardTitle(card);
      setSelectedColumnLabel(targetColumn.label);

      const targetIndex = columns.findIndex((candidate) => candidate.id === targetColumn.id);
      if (targetIndex >= 0) {
        setActiveIndex(targetIndex);
      }

      toast({
        title: "Marked done",
        description: `${title} moved to ${targetColumn.label}`,
      });
      announce(`${title} marked done in ${targetColumn.label}`);
    },
    [announce, columns, findDoneColumnForCard, groupingField, persistChange, toast]
  );

  const handleCardSwipeFlag = useCallback(
    async (card: KanbanCard, columnIndex: number) => {
      const recordId = toRecordId(card.record);
      if (!recordId) return;

      await persistChange(
        card,
        { type: "update", changes: { flagged: true }, field: "flagged" },
        { flagged: true }
      );

      const column = columns[columnIndex];
      const title = getCardTitle(card);
      if (column) {
        setSelectedColumnLabel(column.label);
      }

      toast({
        title: "Flagged for follow-up",
        description: `${title} flagged in ${column?.label ?? "board"}`,
      });
      announce(`${title} flagged for review`);
    },
    [announce, columns, persistChange, toast]
  );

  const handleQuickCreate = useCallback(
    async ({ title, description }: { title: string; description?: string }) => {
      const trimmedTitle = title.trim();
      if (!trimmedTitle) {
        return;
      }

      const targetColumn = columns[activeIndex] ?? columns[0];
      if (!targetColumn) {
        toast({
          title: "Cannot create task",
          description: "No columns available",
          variant: "destructive",
        });
        return;
      }

      const statusField = groupingField ?? configuration.grouping.primary ?? "status";
      const laneDefinition = dataset.definitions.find((definition) => definition.id === targetColumn.swimlane.id);
      const recordId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : `temp-${Date.now()}`;
      const now = new Date().toISOString();
      const newRecord: BoardViewRecord = {
        id: recordId,
        title: trimmedTitle,
        status: targetColumn.key,
        [statusField]: targetColumn.key,
        created_at: now,
        updated_at: now,
      };

      if (description?.trim()) {
        newRecord.description = description.trim();
      }

      if (dataset.swimlaneField && laneDefinition) {
        newRecord[dataset.swimlaneField] = laneDefinition.value ?? null;
      }

      const previousItems = items;
      const nextItems = [...items, newRecord];
      replaceItems(nextItems);

      try {
        await sync.enqueue(
          recordId,
          { type: "create", item: newRecord, field: statusField, to: targetColumn.key },
          nextItems
        );

        setSelectedItemId(recordId);
        setSelectedColumnLabel(targetColumn.label);
        const targetIndex = columns.findIndex((candidate) => candidate.id === targetColumn.id);
        if (targetIndex >= 0) {
          setActiveIndex(targetIndex);
        }

        toast({
          title: "Task created",
          description: `${trimmedTitle} added to ${targetColumn.label}`,
        });
        announce(`${trimmedTitle} created in ${targetColumn.label}`);
      } catch (error) {
        console.error("Failed to enqueue quick task", error);
        replaceItems(previousItems);
        toast({
          title: "Failed to create task",
          description: "We couldn't queue this change. Try again soon.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [activeIndex, announce, columns, configuration.grouping.primary, dataset.definitions, dataset.swimlaneField, groupingField, items, replaceItems, sync, toast]
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#041427] text-sm text-slate-300">
        Loading mobile kanban…
      </div>
    );
  }

  const quickCreateColumn = columns[activeIndex] ?? columns[0];
  const dragEnabled = columns.length > 1 && columnWidth > 0;

  return (
    <div className="relative flex h-full flex-col bg-[#041427] text-slate-100" data-testid="mobile-kanban-view">
      <div className="flex items-center justify-between gap-3 border-b border-white/5 bg-[#0b1f36]/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold tracking-wide text-white">Kanban</h2>
          {queueIndicator}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-primary/20 hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1f36] disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setActiveIndex((index) => Math.max(index - 1, 0))}
            disabled={activeIndex === 0}
            data-testid="mobile-kanban-prev"
            aria-label="Previous column"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:bg-primary/20 hover:text-white focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1f36] disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() => setActiveIndex((index) => Math.min(index + 1, columns.length - 1))}
            disabled={activeIndex === columns.length - 1}
            data-testid="mobile-kanban-next"
            aria-label="Next column"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div ref={viewportRef} className="relative flex-1 overflow-hidden">
        <motion.div
          className="flex h-full w-full touch-pan-y"
          style={{ x }}
          drag={dragEnabled ? "x" : false}
          dragConstraints={dragEnabled ? dragConstraints : { left: 0, right: 0 }}
          dragElastic={0.18}
          dragMomentum={false}
          onDragEnd={dragEnabled ? handleDragEnd : undefined}
          data-active-index={activeIndex}
          data-testid="mobile-kanban-track"
        >
          {columns.map((column, index) => (
            <div
              key={column.id}
              className="flex w-full flex-shrink-0 flex-col gap-3 px-4 pb-24"
              data-testid="mobile-kanban-column"
              aria-hidden={activeIndex !== index}
            >
              <Card className="flex h-full flex-col border border-white/5 bg-[#0d1f33]/95 text-slate-100 shadow-[0_18px_40px_rgba(4,12,28,0.55)]">
                <CardHeader className="border-b border-white/5 pb-3">
                  <CardTitle className="flex items-center justify-between text-base font-semibold text-slate-50">
                    <span>{column.label}</span>
                    <Badge className="rounded-full border border-orange-500/40 bg-orange-500/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-orange-200">
                      {column.items.length}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto px-2 pb-6">
                  <div className="space-y-3">
                    {column.items.length === 0 ? (
                      <p className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-slate-300">
                        No cards in this column.
                      </p>
                    ) : (
                      column.items.map((card) => (
                        <SwipeableCard
                          key={card.id}
                          rightAction={SwipeActions.done(() => handleCardSwipeDone(card, index))}
                          leftAction={SwipeActions.flag(() => handleCardSwipeFlag(card, index))}
                        >
                          <button
                            type="button"
                            className="w-full rounded-2xl border border-white/10 bg-[#112840]/95 px-4 py-3 text-left shadow-[0_12px_28px_rgba(3,12,24,0.45)] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#041427] hover:border-primary/40 active:scale-[0.98]"
                            onClick={() => handleCardPress(card, column.label)}
                            data-testid="mobile-kanban-card"
                          >
                            <div className="space-y-2">
                              <div className="text-sm font-semibold leading-tight text-white">
                                {getCardTitle(card)}
                              </div>
                              {card.record.description && (
                                <div className="line-clamp-2 text-xs text-slate-300">
                                  {String(card.record.description)}
                                </div>
                              )}
                              <div className="flex items-center gap-3 pt-1 text-xs text-slate-300">
                                <span className="truncate">
                                  {String(card.record.assignee ?? card.record.owner ?? "Unassigned")}
                                </span>
                                {card.record.priority && (
                                  <Badge className="h-5 rounded-full border border-orange-400/40 bg-orange-500/10 px-2 text-[10px] font-semibold uppercase tracking-wide text-orange-200">
                                    {String(card.record.priority)}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </button>
                        </SwipeableCard>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </motion.div>
      </div>

      <Button
        type="button"
        size="icon"
        className="absolute bottom-6 right-5 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-[0_22px_48px_rgba(255,106,0,0.45)] transition hover:shadow-[0_0_0_8px_rgba(255,106,0,0.22)] focus-visible:ring-4 focus-visible:ring-primary/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#041427]"
        onClick={() => setQuickCreateOpen(true)}
        aria-label="Quick create task"
      >
        <Plus className="h-6 w-6" />
      </Button>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      <MobileQuickActionsSheet
        open={quickActionsOpen && Boolean(selectedItem)}
        item={selectedItem}
        columnLabel={selectedColumnLabel ?? undefined}
        onClose={() => setQuickActionsOpen(false)}
        onAction={handleQuickAction}
      />

      <MobileQuickTaskSheet
        open={quickCreateOpen}
        defaultColumnLabel={quickCreateColumn?.label}
        onClose={() => setQuickCreateOpen(false)}
        onSubmit={handleQuickCreate}
      />

      <ConflictResolutionDialog
        conflict={sync.conflict}
        open={Boolean(sync.conflict)}
        onResolve={(resolution) => void sync.resolveConflict(resolution)}
      />

      <QueueDrawer
        open={queueDrawerOpen || sync.conflictUi.isOpen}
        onClose={() => {
          setQueueDrawerOpen(false);
          sync.conflictUi.close();
        }}
        queue={sync.queue}
        skipped={sync.skipped}
        appliedRemote={sync.appliedRemote}
        backoff={sync.backoff}
        onRetry={(id) => void sync.retry(id)}
        onSkip={(id) => void sync.skip(id)}
        onRetryAll={() => {
          sync.resetBackoff();
          void sync.retry();
        }}
        isProcessing={sync.isProcessing}
      />
    </div>
  );
}
