import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMilliseconds,
  differenceInCalendarDays,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import { useTimelineState, useTimelinePreferences } from "./context";
import type {
  TimelineDependency,
  TimelineDependencyType,
  TimelineItem,
  TimelineRowModel,
  TimelineSnapMode,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_DURATION_MS = 60 * 60 * 1000; // 1 hour minimum

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toIso(date: Date): string {
  return new Date(date.getTime()).toISOString();
}

function snapDate(date: Date, mode: TimelineSnapMode): Date {
  switch (mode) {
    case "day":
      return startOfDay(date);
    case "week":
      return startOfWeek(date, { weekStartsOn: 1 });
    case "month":
      return startOfMonth(date);
    default:
      return date;
  }
}

function addDaysExact(date: Date, deltaDays: number): Date {
  if (!Number.isFinite(deltaDays) || deltaDays === 0) return new Date(date);
  return new Date(date.getTime() + deltaDays * DAY_MS);
}

function shiftDateWithSnap(
  initial: Date,
  deltaDays: number,
  snapMode: TimelineSnapMode,
): Date {
  const candidate = addDaysExact(initial, deltaDays);
  if (snapMode === "none") return candidate;
  return snapDate(candidate, snapMode);
}

function ensureEndAfterStart(start: Date, end: Date): Date {
  if (end.getTime() <= start.getTime()) {
    return addMilliseconds(start, MIN_DURATION_MS);
  }
  return end;
}

function cloneItem(item: TimelineItem): TimelineItem {
  return {
    ...item,
    assigneeIds: item.assigneeIds ? [...item.assigneeIds] : undefined,
  };
}

function generateId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

interface DragGesture {
  type: "drag";
  itemIds: string[];
  initial: Record<string, { start: Date; end: Date }>;
}

interface ResizeGesture {
  type: "resize";
  itemId: string;
  edge: "start" | "end";
  initialStart: Date;
  initialEnd: Date;
}

interface CreateGesture {
  type: "create";
  itemId: string;
  rowId: string;
  anchor: Date;
}

interface DependencyGesture {
  type: "dependency";
  fromId: string;
  dependencyType: TimelineDependencyType;
}

type Gesture =
  | DragGesture
  | ResizeGesture
  | CreateGesture
  | DependencyGesture
  | null;

export interface UseTimelineInteractionsArgs {
  pixelsPerDay: number;
  rows: TimelineRowModel[];
}

export interface KeyboardEventLike {
  key: string;
  shiftKey?: boolean;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  preventDefault: () => void;
}

function normaliseDelta(deltaPixels: number, pixelsPerDay: number) {
  if (!Number.isFinite(deltaPixels) || pixelsPerDay === 0) return 0;
  return deltaPixels / pixelsPerDay;
}

export function useTimelineInteractions({
  rows,
  pixelsPerDay,
}: UseTimelineInteractionsArgs) {
  const {
    snapshot,
    updateSnapshot,
    selection,
    setSelection,
    clipboard,
    setClipboard,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useTimelineState();
  const { preferences: prefState, updatePreferences: updatePrefs } =
    useTimelinePreferences();
  const snapMode = prefState.snapMode ?? "day";
  const [gesture, setGesture] = useState<Gesture>(null);
  const pixelsPerDayRef = useRef(pixelsPerDay);

  useEffect(() => {
    pixelsPerDayRef.current = pixelsPerDay;
  }, [pixelsPerDay]);

  const itemById = useMemo(() => {
    return new Map(snapshot?.items.map((item) => [item.id, item]) ?? []);
  }, [snapshot?.items]);

  const rowsByItemId = useMemo(() => {
    const map = new Map<string, TimelineRowModel>();
    for (const row of rows) {
      if (row.itemId) {
        map.set(row.itemId, row);
      }
    }
    return map;
  }, [rows]);

  const applyToItems = useCallback(
    (ids: string[], transform: (item: TimelineItem) => TimelineItem) => {
      if (!snapshot || ids.length === 0) return;
      const idSet = new Set(ids);
      updateSnapshot((prev) => {
        let changed = false;
        const nextItems = prev.items.map((item) => {
          if (!idSet.has(item.id)) return item;
          const result = transform(item);
          if (result !== item) {
            changed = true;
          }
          return result;
        });
        if (!changed) return prev;
        return {
          ...prev,
          items: nextItems,
          lastUpdated: new Date().toISOString(),
        };
      });
    },
    [snapshot, updateSnapshot],
  );

  const selectItem = useCallback(
    (itemId: string, mode: "replace" | "append" | "toggle" = "replace") => {
      setSelection((prev) => {
        if (mode === "replace") return [itemId];
        if (mode === "append") {
          if (prev.includes(itemId)) return prev;
          return [...prev, itemId];
        }
        if (mode === "toggle") {
          if (prev.includes(itemId)) {
            return prev.filter((id) => id !== itemId);
          }
          return [...prev, itemId];
        }
        return prev;
      });
    },
    [setSelection],
  );

  const clearSelection = useCallback(() => setSelection([]), [setSelection]);

  const beginDrag = useCallback(
    (itemId: string) => {
      const ids = selection.includes(itemId) ? selection : [itemId];
      const initial: Record<string, { start: Date; end: Date }> = {};
      for (const id of ids) {
        const row = rowsByItemId.get(id);
        if (!row) continue;
        const start = parseDate(row.start);
        const end = parseDate(row.end);
        if (!start || !end) continue;
        initial[id] = { start, end };
      }
      if (Object.keys(initial).length === 0) return;
      setGesture({ type: "drag", itemIds: ids, initial });
    },
    [rowsByItemId, selection],
  );

  const updateDrag = useCallback(
    (deltaPixels: number) => {
      if (!gesture || gesture.type !== "drag") return;
      const deltaDays = normaliseDelta(deltaPixels, pixelsPerDayRef.current);
      const ids = gesture.itemIds;
      applyToItems(ids, (item) => {
        const baseline = gesture.initial[item.id];
        if (!baseline) return item;
        const startCandidate = shiftDateWithSnap(
          baseline.start,
          deltaDays,
          snapMode,
        );
        const endCandidate = shiftDateWithSnap(
          baseline.end,
          deltaDays,
          snapMode,
        );
        const nextStart = startCandidate;
        const nextEnd = ensureEndAfterStart(nextStart, endCandidate);
        const startIso = toIso(nextStart);
        const endIso = toIso(nextEnd);
        if (item.start === startIso && item.end === endIso) return item;
        return { ...item, start: startIso, end: endIso };
      });
    },
    [applyToItems, gesture, snapMode],
  );

  const beginResize = useCallback(
    (itemId: string, edge: "start" | "end") => {
      const row = rowsByItemId.get(itemId);
      const start = parseDate(row?.start);
      const end = parseDate(row?.end);
      if (!row || !start || !end) return;
      setGesture({
        type: "resize",
        itemId,
        edge,
        initialStart: start,
        initialEnd: end,
      });
    },
    [rowsByItemId],
  );

  const updateResize = useCallback(
    (deltaPixels: number) => {
      if (!gesture || gesture.type !== "resize") return;
      const deltaDays = normaliseDelta(deltaPixels, pixelsPerDayRef.current);
      applyToItems([gesture.itemId], (item) => {
        const baselineStart = gesture.initialStart;
        const baselineEnd = gesture.initialEnd;
        const nextStart =
          gesture.edge === "start"
            ? shiftDateWithSnap(baselineStart, deltaDays, snapMode)
            : baselineStart;
        const nextEnd =
          gesture.edge === "end"
            ? shiftDateWithSnap(baselineEnd, deltaDays, snapMode)
            : baselineEnd;
        const safeEnd = ensureEndAfterStart(nextStart, nextEnd);
        const startIso = toIso(nextStart);
        const endIso = toIso(safeEnd);
        if (item.start === startIso && item.end === endIso) return item;
        return { ...item, start: startIso, end: endIso };
      });
    },
    [applyToItems, gesture, snapMode],
  );

  const beginCreate = useCallback(
    (rowId: string, anchor: Date) => {
      if (!snapshot) return;
      const newId = generateId("timeline-item");
      const start = snapDate(anchor, snapMode);
      const end = ensureEndAfterStart(start, addDays(start, 1));
      setGesture({ type: "create", itemId: newId, rowId, anchor: start });
      updateSnapshot((prev) => {
        const newItem: TimelineItem = {
          id: newId,
          name: "New item",
          kind: "task",
          groupId: rowId.startsWith("__") ? null : rowId,
          start: toIso(start),
          end: toIso(end),
          durationMinutes: differenceInCalendarDays(end, start) * 24 * 60,
          percentComplete: 0,
          status: "planned",
        };
        return {
          ...prev,
          items: [...prev.items, newItem],
          lastUpdated: new Date().toISOString(),
        };
      });
      setSelection([newId]);
    },
    [snapMode, snapshot, updateSnapshot, setSelection],
  );

  const updateCreate = useCallback(
    (current: Date) => {
      if (!gesture || gesture.type !== "create") return;
      const start = gesture.anchor;
      const snappedEnd = snapDate(current, snapMode);
      const safeEnd = ensureEndAfterStart(start, snappedEnd);
      applyToItems([gesture.itemId], (item) => {
        const endIso = toIso(safeEnd);
        if (item.end === endIso) return item;
        return { ...item, end: endIso };
      });
    },
    [applyToItems, gesture, snapMode],
  );

  const cancelGesture = useCallback(() => {
    if (!gesture) return;
    if (gesture.type === "create") {
      updateSnapshot((prev) => ({
        ...prev,
        items: prev.items.filter((item) => item.id !== gesture.itemId),
        lastUpdated: new Date().toISOString(),
      }));
    }
    setGesture(null);
  }, [gesture, updateSnapshot]);

  const completeGesture = useCallback(() => {
    setGesture(null);
  }, []);

  const beginDependency = useCallback(
    (fromId: string, dependencyType: TimelineDependencyType = "FS") => {
      setGesture({ type: "dependency", fromId, dependencyType });
    },
    [],
  );

  const completeDependency = useCallback(
    (toId: string) => {
      if (!gesture || gesture.type !== "dependency" || !snapshot) return;
      if (gesture.fromId === toId) {
        setGesture(null);
        return;
      }
      updateSnapshot((prev) => {
        const exists = prev.dependencies.some(
          (dependency) =>
            dependency.fromId === gesture.fromId && dependency.toId === toId,
        );
        if (exists) return prev;
        const dependency: TimelineDependency = {
          id: generateId("timeline-dependency"),
          fromId: gesture.fromId,
          toId,
          type: gesture.dependencyType,
        };
        return {
          ...prev,
          dependencies: [...prev.dependencies, dependency],
          lastUpdated: new Date().toISOString(),
        };
      });
      setGesture(null);
    },
    [gesture, snapshot, updateSnapshot],
  );

  const deleteSelection = useCallback(() => {
    if (!snapshot || selection.length === 0) return;
    const idSet = new Set(selection);
    updateSnapshot((prev) => {
      const items = prev.items.filter((item) => !idSet.has(item.id));
      const dependencies = prev.dependencies.filter(
        (dependency) =>
          !idSet.has(dependency.fromId) && !idSet.has(dependency.toId),
      );
      if (
        items.length === prev.items.length &&
        dependencies.length === prev.dependencies.length
      ) {
        return prev;
      }
      return {
        ...prev,
        items,
        dependencies,
        lastUpdated: new Date().toISOString(),
      };
    });
    clearSelection();
  }, [clearSelection, selection, snapshot, updateSnapshot]);

  const copySelection = useCallback(() => {
    if (!snapshot || selection.length === 0) return;
    const idSet = new Set(selection);
    const items = snapshot.items
      .filter((item) => idSet.has(item.id))
      .map(cloneItem);
    setClipboard(items);
  }, [selection, setClipboard, snapshot]);

  const pasteClipboard = useCallback(() => {
    if (!snapshot || !clipboard || clipboard.length === 0) return;
    const offset = clipboard.reduce((min, item) => {
      const date = parseDate(item.start);
      if (!date) return min;
      return Math.min(min, date.getTime());
    }, Number.POSITIVE_INFINITY);
    const now = startOfDay(new Date());
    const deltaMs = Number.isFinite(offset) ? now.getTime() - offset : DAY_MS;
    updateSnapshot((prev) => {
      const copies = clipboard.map((item) => {
        const startDate = parseDate(item.start) ?? now;
        const endDate = parseDate(item.end) ?? addDays(startDate, 1);
        const shiftedStart = new Date(startDate.getTime() + deltaMs);
        const shiftedEnd = new Date(endDate.getTime() + deltaMs);
        return {
          ...cloneItem(item),
          id: generateId("timeline-item"),
          start: toIso(shiftedStart),
          end: toIso(shiftedEnd),
          groupId: item.groupId ?? null,
        };
      });
      return {
        ...prev,
        items: [...prev.items, ...copies],
        lastUpdated: new Date().toISOString(),
      };
    });
    setSelection(clipboard.map((item) => item.id));
  }, [clipboard, setSelection, snapshot, updateSnapshot]);

  const nudgeSelection = useCallback(
    (direction: 1 | -1, magnitudeDays: number) => {
      if (selection.length === 0) return;
      applyToItems(selection, (item) => {
        const start = parseDate(item.start);
        const end = parseDate(item.end);
        if (!start || !end) return item;
        const delta = direction * magnitudeDays;
        const nextStart = shiftDateWithSnap(start, delta, snapMode);
        const nextEnd = shiftDateWithSnap(end, delta, snapMode);
        const safeEnd = ensureEndAfterStart(nextStart, nextEnd);
        return { ...item, start: toIso(nextStart), end: toIso(safeEnd) };
      });
    },
    [applyToItems, selection, snapMode],
  );

  const moveSelectionByRow = useCallback(
    (direction: 1 | -1) => {
      if (selection.length === 0) return;
      const currentId = selection[selection.length - 1];
      const row = rowsByItemId.get(currentId);
      if (!row) return;
      const currentIndex = rows.findIndex((entry) => entry.id === row.id);
      if (currentIndex === -1) return;
      const step = direction > 0 ? 1 : -1;
      for (
        let idx = currentIndex + step;
        idx >= 0 && idx < rows.length;
        idx += step
      ) {
        const candidate = rows[idx];
        if (candidate.itemId) {
          setSelection([candidate.itemId]);
          return;
        }
      }
    },
    [rows, rowsByItemId, selection, setSelection],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEventLike) => {
      const key = event.key;
      const meta = event.metaKey || event.ctrlKey;

      if (key === "Escape") {
        cancelGesture();
        clearSelection();
        return;
      }

      if ((key === "Delete" || key === "Backspace") && selection.length) {
        event.preventDefault();
        deleteSelection();
        return;
      }

      if (meta && key.toLowerCase() === "c") {
        event.preventDefault();
        copySelection();
        return;
      }

      if (meta && key.toLowerCase() === "v") {
        event.preventDefault();
        pasteClipboard();
        return;
      }

      if (meta && key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (meta && key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (meta && key.toLowerCase() === "a") {
        event.preventDefault();
        if (snapshot) {
          setSelection(snapshot.items.map((item) => item.id));
        }
        return;
      }

      if (key === "ArrowRight" || key === "ArrowLeft") {
        if (selection.length === 0) return;
        event.preventDefault();
        const direction = key === "ArrowRight" ? 1 : -1;
        const magnitude = event.shiftKey ? 7 : event.altKey ? 0.25 : 1;
        nudgeSelection(direction as 1 | -1, magnitude);
        return;
      }

      if (key === "ArrowUp" || key === "ArrowDown") {
        event.preventDefault();
        moveSelectionByRow(key === "ArrowDown" ? 1 : -1);
        return;
      }

      if (key === "=" || key === "+") {
        event.preventDefault();
        updatePrefs({
          zoomLevel: Math.min(5, (prefState.zoomLevel ?? 1) + 0.1),
        });
        return;
      }

      if (key === "-" || key === "_") {
        event.preventDefault();
        updatePrefs({
          zoomLevel: Math.max(0.25, (prefState.zoomLevel ?? 1) - 0.1),
        });
        return;
      }

      if (key === "0" && meta) {
        event.preventDefault();
        updatePrefs({ zoomLevel: 1 });
      }
    },
    [
      cancelGesture,
      clearSelection,
      copySelection,
      deleteSelection,
      moveSelectionByRow,
      nudgeSelection,
      pasteClipboard,
      prefState.zoomLevel,
      redo,
      selection.length,
      setSelection,
      snapshot,
      undo,
      updatePrefs,
    ],
  );

  return {
    gesture,
    selection,
    clipboard,
    canUndo,
    canRedo,
    selectItem,
    clearSelection,
    beginDrag,
    updateDrag,
    beginResize,
    updateResize,
    beginCreate,
    updateCreate,
    beginDependency,
    completeDependency,
    cancelGesture,
    completeGesture,
    handleKeyDown,
    copySelection,
    pasteClipboard,
    deleteSelection,
  };
}
