import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

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

import { useGestureHandlers } from "./useGestureHandlers";
import { MobileQuickActionsSheet, type QuickActionDefinition } from "./MobileQuickActionsSheet";
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

export function MobileKanbanView({ boardId, syncer = DEFAULT_SYNCER }: MobileKanbanViewProps) {
  const { items, configuration, replaceItems, isLoading } = useBoardViewContext();
  const { toast } = useToast();
  const [activeIndex, setActiveIndex] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [selectedColumnLabel, setSelectedColumnLabel] = useState<string | null>(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const [queueDrawerOpen, setQueueDrawerOpen] = useState(false);

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

  const { swipeHandlers } = useGestureHandlers({
    swipe: {
      onSwipeLeft: () => setActiveIndex((index) => Math.min(index + 1, columns.length - 1)),
      onSwipeRight: () => setActiveIndex((index) => Math.max(index - 1, 0)),
      threshold: 45,
    },
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
      data-testid="mobile-kanban-queue-indicator"
      onClick={() => setQueueDrawerOpen(true)}
    >
      {sync.queue.length} pending
    </Button>
  ) : null;

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

  const handleCardSwipeComplete = useCallback(
    async (card: KanbanCard, columnIndex: number) => {
      const nextColumn = columns[columnIndex + 1];
      if (!nextColumn || !groupingField) {
        toast({
          title: "Cannot move",
          description: "This is the last column",
          variant: "destructive",
        });
        return;
      }

      const recordId = toRecordId(card.record);
      if (!recordId) return;

      await persistChange(
        card,
        { type: "move", from: columns[columnIndex].key, to: nextColumn.key, field: groupingField },
        { [groupingField]: nextColumn.key }
      );

      toast({
        title: "Moved",
        description: `Moved to ${nextColumn.label}`,
      });
    },
    [columns, groupingField, persistChange, toast]
  );

  const handleCardSwipeDelete = useCallback(
    async (card: KanbanCard) => {
      const recordId = toRecordId(card.record);
      if (!recordId) return;

      // Optimistically remove from UI
      const nextItems = items.filter(item => toRecordId(item) !== recordId);
      replaceItems(nextItems);

      toast({
        title: "Deleted",
        description: "Task has been deleted",
      });
    },
    [items, replaceItems, toast]
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading mobile kanban…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col" data-testid="mobile-kanban-view">
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold">Kanban</h2>
          {queueIndicator}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
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
            onClick={() => setActiveIndex((index) => Math.min(index + 1, columns.length - 1))}
            disabled={activeIndex === columns.length - 1}
            data-testid="mobile-kanban-next"
            aria-label="Next column"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div
          className="flex h-full w-full touch-pan-y transition-transform duration-300 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          data-active-index={activeIndex}
          data-testid="mobile-kanban-track"
          {...swipeHandlers}
        >
          {columns.map((column, index) => (
            <div
              key={column.id}
              className="flex w-full flex-shrink-0 flex-col gap-2 px-3 pb-8"
              data-testid="mobile-kanban-column"
              aria-hidden={activeIndex !== index}
            >
              <Card className="flex h-full flex-col">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span>{column.label}</span>
                    <Badge variant="secondary">{column.items.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto">
                  <div className="space-y-2">
                    {column.items.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No cards in this column.</p>
                    ) : (
                      column.items.map((card) => (
                        <SwipeableCard
                          key={card.id}
                          rightAction={SwipeActions.complete(() => handleCardSwipeComplete(card, index))}
                          leftAction={SwipeActions.delete(() => handleCardSwipeDelete(card))}
                        >
                          <button
                            type="button"
                            className="w-full rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition hover:border-primary active:scale-[0.98]"
                            onClick={() => handleCardPress(card, column.label)}
                            data-testid="mobile-kanban-card"
                          >
                            <div className="space-y-1">
                              <div className="text-sm font-medium leading-tight">
                                {String(card.record.title ?? card.record.name ?? card.id)}
                              </div>
                              {card.record.description && (
                                <div className="text-xs text-muted-foreground line-clamp-2">
                                  {String(card.record.description)}
                                </div>
                              )}
                              <div className="flex items-center gap-2 pt-1">
                                <div className="text-xs text-muted-foreground">
                                  {String(card.record.assignee ?? card.record.owner ?? "Unassigned")}
                                </div>
                                {card.record.priority && (
                                  <Badge variant="outline" className="text-[10px] h-4 px-1">
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
        </div>
      </div>

      <MobileQuickActionsSheet
        open={quickActionsOpen && Boolean(selectedItem)}
        item={selectedItem}
        columnLabel={selectedColumnLabel ?? undefined}
        onClose={() => setQuickActionsOpen(false)}
        onAction={handleQuickAction}
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
