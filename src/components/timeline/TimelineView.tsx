import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  differenceInCalendarDays,
  format,
  isSaturday,
  isSunday,
  parseISO,
  startOfDay,
} from "date-fns";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  Calendar,
  Filter,
  Layers,
  RefreshCcw,
  Flag,
  Globe2,
  Rocket,
  ShieldCheck,
  GitBranch,
  SquareStack,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  TimelineProvider,
  type TimelineDependency,
  type TimelineProviderProps,
  type TimelineMilestone,
  type TimelineRowModel,
  type TimelineScale,
  useTimelineInteractions,
  useTimelinePreferences,
  useTimelineSelector,
  useTimelineState,
} from "@/state/timeline";

const scaleOptions: { value: TimelineScale; label: string }[] = [
  { value: "hour", label: "Hour" },
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "year", label: "Year" },
];

const rowHeightByDensity = {
  comfortable: 44,
  compact: 36,
  condensed: 30,
} as const;

type Virtualizer = ReturnType<typeof useVirtualizer>;

const MILESTONE_LABEL_SAFE_MARGIN = 180;

export function getPixelsPerDay(scale: TimelineScale, zoomLevel: number) {
  const base =
    scale === "hour"
      ? 24 * 32
      : scale === "day"
        ? 72
        : scale === "week"
          ? 32
          : scale === "month"
            ? 20
            : scale === "quarter"
              ? 12
              : 6;
  return base * zoomLevel;
}

function safeParseIso(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

type MilestoneLabelSide = "left" | "right";

export interface MilestoneLayoutInput {
  milestoneDate: Date;
  startDate: Date;
  pixelsPerDay: number;
  gridWidth: number;
}

export interface MilestoneLayoutResult {
  x: number;
  labelSide: MilestoneLabelSide;
}

export function computeMilestoneLayout({
  milestoneDate,
  startDate,
  pixelsPerDay,
  gridWidth,
}: MilestoneLayoutInput): MilestoneLayoutResult {
  const dayMs = 24 * 60 * 60 * 1000;
  const offsetDays = (milestoneDate.getTime() - startDate.getTime()) / dayMs;
  const x = offsetDays * pixelsPerDay;
  const safeX = Number.isFinite(x) ? x : 0;
  const labelSide: MilestoneLabelSide = safeX > gridWidth - MILESTONE_LABEL_SAFE_MARGIN ? "left" : "right";
  return { x: safeX, labelSide };
}

const milestoneTypeConfig = {
  release: {
    colorClass: "bg-blue-500",
    textClass: "text-blue-600",
    borderClass: "shadow-[0_0_0_1.5px_rgba(37,99,235,0.2)]",
    icon: Rocket,
    label: "Release milestone",
  },
  gate: {
    colorClass: "bg-purple-500",
    textClass: "text-purple-600",
    borderClass: "shadow-[0_0_0_1.5px_rgba(147,51,234,0.2)]",
    icon: ShieldCheck,
    label: "Gate milestone",
  },
  external: {
    colorClass: "bg-amber-500",
    textClass: "text-amber-600",
    borderClass: "shadow-[0_0_0_1.5px_rgba(245,158,11,0.2)]",
    icon: Globe2,
    label: "External dependency",
  },
  internal: {
    colorClass: "bg-slate-500",
    textClass: "text-slate-600",
    borderClass: "shadow-[0_0_0_1.5px_rgba(100,116,139,0.2)]",
    icon: Flag,
    label: "Internal checkpoint",
  },
} as const;

type MilestoneTypeKey = keyof typeof milestoneTypeConfig;

interface TimelineSurfaceProps {
  className?: string;
  height?: number | string;
}

function TimelineSurface({ className, height = "100%" }: TimelineSurfaceProps) {
  const { loading, error, refresh, snapshot } = useTimelineState();
  const { preferences, updatePreferences } = useTimelinePreferences();
  const rows = useTimelineSelector((context) => context.derived?.rows ?? []);
  const criticalPath = useTimelineSelector(
    (context) => new Set(context.derived?.criticalPath ?? []),
  );
  const dependencies = useTimelineSelector(
    (context) => context.snapshot?.dependencies ?? [],
  );
  const dateRange = useTimelineSelector(
    (context) =>
      context.derived?.dateRange ?? {
        start: snapshot?.lastUpdated ?? null,
        end: snapshot?.lastUpdated ?? null,
      },
  );

  const rowHeight =
    rowHeightByDensity[preferences.rowDensity] ??
    rowHeightByDensity.comfortable;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const gridScrollRef = useRef<HTMLDivElement | null>(null);
  const [horizontalOffset, setHorizontalOffset] = useState(0);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => rowHeight,
    overscan: 6,
  });

  const startDate = useMemo(
    () => safeParseIso(dateRange.start) ?? startOfDay(new Date()),
    [dateRange.start],
  );
  const endDate = useMemo(
    () => safeParseIso(dateRange.end) ?? addDays(startDate, 14),
    [dateRange.end, startDate],
  );
  const totalDays = Math.max(
    1,
    differenceInCalendarDays(endDate, startDate) + 1,
  );
  const pixelsPerDay = getPixelsPerDay(
    preferences.scale,
    preferences.zoomLevel,
  );
  const gridWidth = Math.max(600, totalDays * pixelsPerDay);

  useEffect(() => {
    const element = gridScrollRef.current;
    if (!element) return;
    const today = new Date();
    const todayStart = startOfDay(today).getTime();
    const start = startOfDay(startDate).getTime();
    if (todayStart < start) {
      element.scrollLeft = 0;
      return;
    }
    const diffDays = (todayStart - start) / (1000 * 60 * 60 * 24);
    element.scrollLeft = diffDays * pixelsPerDay;
  }, [pixelsPerDay, startDate]);

  useEffect(() => {
    const grid = gridScrollRef.current;
    if (!grid) return;
    const sync = () => {
      setHorizontalOffset(grid.scrollLeft);
    };
    sync();
    grid.addEventListener("scroll", sync, { passive: true });
    return () => {
      grid.removeEventListener("scroll", sync);
    };
  }, []);

  if (loading) {
    return (
      <Card
        className={cn("flex h-full flex-1 flex-col", className)}
        style={{ height }}
      >
        <CardContent className="flex flex-1 items-center justify-center text-muted-foreground">
          Loading timeline…
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        className={cn("flex h-full flex-1 flex-col", className)}
        style={{ height }}
      >
        <CardContent className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-muted-foreground">{error.message}</p>
          <Button onClick={() => refresh()} variant="outline">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className={cn("flex h-full flex-1 flex-col gap-3", className)}
      style={{ height }}
    >
      <TimelineToolbar
        onFitToRange={() =>
          gridScrollRef.current?.scrollTo({ left: 0, behavior: "smooth" })
        }
      />
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="flex min-h-0 flex-1 flex-col">
          <TimelineHeader
            startDate={startDate}
            endDate={endDate}
            pixelsPerDay={pixelsPerDay}
            preferencesScale={preferences.scale}
            gridWidth={gridWidth}
            scrollOffset={horizontalOffset}
          />
          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div
              ref={scrollRef}
              className="relative flex min-h-0 flex-1 overflow-y-auto"
            >
              <div className="flex min-h-full min-w-full">
                <TimelineLeftRail
                  rows={rows}
                  virtualizer={virtualizer}
                  rowHeight={rowHeight}
                />
                <div className="relative flex min-h-full flex-1 flex-col">
                  <div
                    ref={gridScrollRef}
                    className="relative h-full w-full overflow-x-auto"
                  >
                    <TimelineGrid
                      rows={rows}
                      virtualizer={virtualizer}
                      rowHeight={rowHeight}
                      startDate={startDate}
                      pixelsPerDay={pixelsPerDay}
                      gridWidth={gridWidth}
                      showWeekends={preferences.showWeekends}
                      showBaselines={preferences.showBaselines}
                      showDependencies={preferences.showDependencies}
                      dependencies={dependencies}
                      criticalPath={criticalPath}
                      milestones={snapshot?.milestones ?? []}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {preferences.showLegend ? <TimelineLegend /> : null}
      </div>
    </div>
  );
}

interface TimelineToolbarProps {
  onFitToRange?: () => void;
}

export function TimelineToolbar({ onFitToRange }: TimelineToolbarProps) {
  const { preferences, updatePreferences } = useTimelinePreferences();
  const { refresh } = useTimelineState();

  const toggleValues = useMemo(() => {
    const values: string[] = [];
    if (preferences.showWeekends) values.push("weekends");
    if (preferences.showBaselines) values.push("baselines");
    if (preferences.showDependencies) values.push("dependencies");
    if (preferences.showOverlays) values.push("overlays");
    if (preferences.showLegend) values.push("legend");
    return values;
  }, [preferences]);

  const handleToggleChange = (next: string[]) => {
    updatePreferences({
      showWeekends: next.includes("weekends"),
      showBaselines: next.includes("baselines"),
      showDependencies: next.includes("dependencies"),
      showOverlays: next.includes("overlays"),
      showLegend: next.includes("legend"),
    });
  };

  const handleZoom = (delta: number) => {
    const nextZoom = Math.min(5, Math.max(0.25, preferences.zoomLevel + delta));
    updatePreferences({ zoomLevel: Number(nextZoom.toFixed(2)) });
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-card/80 px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={preferences.scale}
          onValueChange={(value) =>
            updatePreferences({ scale: value as TimelineScale })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Scale" />
          </SelectTrigger>
          <SelectContent>
            {scaleOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => handleZoom(-0.25)}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => handleZoom(0.25)}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => updatePreferences({ zoomLevel: 1 })}
          >
            Fit
          </Button>
          <Button size="sm" variant="secondary" onClick={onFitToRange}>
            Fit to start
          </Button>
        </div>
        <Separator orientation="vertical" className="h-6" />
        <ToggleGroup
          type="multiple"
          value={toggleValues}
          onValueChange={handleToggleChange}
        >
          <ToggleGroupItem value="weekends" aria-label="Toggle weekends">
            <Calendar className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="baselines" aria-label="Toggle baselines">
            <Layers className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="dependencies" aria-label="Toggle dependencies">
            <GitBranch className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="overlays" aria-label="Toggle overlays">
            <SquareStack className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="legend" aria-label="Toggle legend">
            <Filter className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => refresh()}>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>
    </div>
  );
}

interface TimelineHeaderProps {
  startDate: Date;
  endDate: Date;
  pixelsPerDay: number;
  preferencesScale: TimelineScale;
  gridWidth: number;
  scrollOffset: number;
}

function TimelineHeader({
  startDate,
  endDate,
  pixelsPerDay,
  preferencesScale,
  gridWidth,
  scrollOffset,
}: TimelineHeaderProps) {
  const totalDays = Math.max(
    1,
    differenceInCalendarDays(endDate, startDate) + 1,
  );
  const labels = [] as { date: Date; width: number }[];
  for (let i = 0; i < totalDays; i += 1) {
    const date = addDays(startDate, i);
    labels.push({ date, width: pixelsPerDay });
  }

  return (
    <div className="sticky top-0 z-20 flex h-12 items-center border-b bg-card/95 px-3 backdrop-blur">
      <div className="w-72 flex-shrink-0" />
      <div className="flex flex-1 overflow-hidden">
        <div
          className="pointer-events-none flex"
          style={{
            width: gridWidth,
            transform: `translateX(-${scrollOffset}px)`,
          }}
        >
          {labels.map((label) => (
            <div
              key={label.date.toISOString()}
              className="flex h-full flex-1 items-center justify-start border-l px-2 text-xs text-muted-foreground"
              style={{ minWidth: label.width }}
            >
              {preferencesScale === "hour"
                ? format(label.date, "MMM d")
                : preferencesScale === "month"
                  ? format(label.date, "MMM d")
                  : preferencesScale === "quarter"
                    ? `Q${Math.floor(label.date.getMonth() / 3) + 1} ${label.date.getFullYear()}`
                    : format(label.date, "MMM d")}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

interface TimelineLeftRailProps {
  rows: TimelineRowModel[];
  virtualizer: Virtualizer;
  rowHeight: number;
}

function TimelineLeftRail({
  rows,
  virtualizer,
  rowHeight,
}: TimelineLeftRailProps) {
  const virtualItems = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();

  return (
    <div className="relative w-72 flex-shrink-0 border-r bg-background">
      <div style={{ height: totalSize }}>
        {virtualItems.map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (!row) return null;
          const depthPadding = row.depth * 16;
          const isGroup = row.type === "group";
          const background =
            virtualRow.index % 2 === 0 ? "bg-muted/30" : "bg-background";
          return (
            <div
              key={row.id}
              className={cn(
                "absolute flex w-full items-center gap-2 border-b border-border/40 px-3 text-sm",
                background,
                isGroup ? "font-medium" : "font-normal",
              )}
              style={{
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
                paddingLeft: depthPadding + 12,
              }}
            >
              <span className="truncate" title={row.label}>
                {row.label}
              </span>
              {row.percentComplete != null ? (
                <span className="ml-auto text-xs text-muted-foreground">
                  {Math.round(row.percentComplete * 100)}%
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TimelineGridProps {
  rows: TimelineRowModel[];
  virtualizer: Virtualizer;
  rowHeight: number;
  startDate: Date;
  pixelsPerDay: number;
  gridWidth: number;
  showWeekends: boolean;
  showBaselines: boolean;
  showDependencies: boolean;
  dependencies: TimelineDependency[];
  criticalPath: Set<string>;
  milestones: TimelineMilestone[];
}

type TimelineContextMenuInfo =
  | { type: "grid"; clientX: number }
  | { type: "row"; rowIndex: number; clientX: number }
  | { type: "bar"; rowIndex: number; itemId: string; clientX: number };

function TimelineGrid({
  rows,
  virtualizer,
  rowHeight,
  startDate,
  pixelsPerDay,
  gridWidth,
  showWeekends,
  showBaselines,
  showDependencies,
  dependencies,
  criticalPath,
  milestones,
}: TimelineGridProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const totalHeight = virtualizer.getTotalSize();
  const virtualItems = virtualizer.getVirtualItems();
  const rowIndexByItemId = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((row, index) => {
      if (row.itemId) {
        map.set(row.itemId, index);
      }
    });
    return map;
  }, [rows]);
  const milestonesById = useMemo(() => new Map(milestones.map(milestone => [milestone.id, milestone])), [milestones]);

  const interactions = useTimelineInteractions({ rows, pixelsPerDay });
  const [pointerState, setPointerState] = useState<{
    pointerId: number;
    originX: number;
  } | null>(null);
  const [contextInfo, setContextInfo] =
    useState<TimelineContextMenuInfo | null>(null);

  const selectionSet = useMemo(
    () => new Set(interactions.selection),
    [interactions.selection],
  );

  useEffect(() => {
    if (!interactions.gesture && pointerState && overlayRef.current) {
      if (overlayRef.current.hasPointerCapture(pointerState.pointerId)) {
        overlayRef.current.releasePointerCapture(pointerState.pointerId);
      }
      setPointerState(null);
    }
  }, [interactions.gesture, pointerState]);

  const focusOverlay = () => {
    if (overlayRef.current && document.activeElement !== overlayRef.current) {
      overlayRef.current.focus();
    }
  };

  const toDateFromClientX = (clientX: number) => {
    const rect = overlayRef.current?.getBoundingClientRect();
    if (!rect) return startDate;
    const offsetX = clientX - rect.left;
    const dayOffset = offsetX / pixelsPerDay;
    return new Date(startDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointerState) return;
    const delta = event.clientX - pointerState.originX;
    if (interactions.gesture?.type === "drag") {
      interactions.updateDrag(delta);
    } else if (interactions.gesture?.type === "resize") {
      interactions.updateResize(delta);
    } else if (interactions.gesture?.type === "create") {
      interactions.updateCreate(toDateFromClientX(event.clientX));
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerState && event.pointerId === pointerState.pointerId) {
      if (overlayRef.current?.hasPointerCapture(pointerState.pointerId)) {
        overlayRef.current.releasePointerCapture(pointerState.pointerId);
      }
      setPointerState(null);
      interactions.completeGesture();
    } else if (interactions.gesture?.type === "dependency") {
      interactions.cancelGesture();
    }
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    if (pointerState && event.pointerId === pointerState.pointerId) {
      if (overlayRef.current?.hasPointerCapture(pointerState.pointerId)) {
        overlayRef.current.releasePointerCapture(pointerState.pointerId);
      }
      setPointerState(null);
      interactions.cancelGesture();
    }
  };

  const handleRowPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    row: TimelineRowModel | undefined,
  ) => {
    if (!row) return;
    if (event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      focusOverlay();
      const anchor = toDateFromClientX(event.clientX);
      interactions.beginCreate(row, anchor);
      overlayRef.current?.setPointerCapture(event.pointerId);
      setPointerState({ pointerId: event.pointerId, originX: event.clientX });
      return;
    }
    if (!event.metaKey && !event.ctrlKey && !event.shiftKey) {
      interactions.clearSelection();
      focusOverlay();
    }
  };

  const handleBarPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    row: TimelineRowModel,
  ) => {
    if (!row.itemId) return;
    event.preventDefault();
    event.stopPropagation();
    focusOverlay();
    const mode =
      event.metaKey || event.ctrlKey
        ? "toggle"
        : event.shiftKey
          ? "append"
          : "replace";
    interactions.selectItem(row.itemId, mode);
    interactions.beginDrag(row.itemId);
    overlayRef.current?.setPointerCapture(event.pointerId);
    setPointerState({ pointerId: event.pointerId, originX: event.clientX });
  };

  const handleResizePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    itemId: string,
    edge: "start" | "end",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    focusOverlay();
    if (!selectionSet.has(itemId)) {
      interactions.selectItem(itemId, "replace");
    }
    interactions.beginResize(itemId, edge);
    overlayRef.current?.setPointerCapture(event.pointerId);
    setPointerState({ pointerId: event.pointerId, originX: event.clientX });
  };

  const handleDependencyPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    itemId: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    focusOverlay();
    interactions.beginDependency(itemId);
  };

  const handleDependencyPointerUp = (
    event: React.PointerEvent<HTMLDivElement>,
    itemId: string,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    focusOverlay();
    interactions.completeDependency(itemId);
  };

  const handleContextMenuCapture = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    const target = event.target as HTMLElement;
    const barEl = target.closest<HTMLElement>("[data-context='bar']");
    if (barEl?.dataset.itemId) {
      const rowIndex = Number(barEl.dataset.rowIndex ?? "-1");
      const itemId = barEl.dataset.itemId;
      if (itemId) {
        setContextInfo({
          type: "bar",
          rowIndex,
          itemId,
          clientX: event.clientX,
        });
        if (!selectionSet.has(itemId)) {
          interactions.selectItem(itemId, "replace");
        }
        return;
      }
    }
    const rowEl = target.closest<HTMLElement>("[data-row-index]");
    if (rowEl?.dataset.rowIndex) {
      setContextInfo({
        type: "row",
        rowIndex: Number(rowEl.dataset.rowIndex),
        clientX: event.clientX,
      });
      return;
    }
    setContextInfo({ type: "grid", clientX: event.clientX });
  };

  const handleContextMenuOpenChange = (open: boolean) => {
    if (!open) {
      setContextInfo(null);
    }
  };

  const handleCreateFromContext = (info: TimelineContextMenuInfo) => {
    let rowIndex: number | null = null;
    if (info.type === "row" || info.type === "bar") {
      rowIndex = info.rowIndex;
    } else {
      for (const item of virtualItems) {
        const candidate = rows[item.index];
        if (candidate) {
          rowIndex = item.index;
          break;
        }
      }
    }
    if (rowIndex == null) return;
    const row = rows[rowIndex];
    if (!row) return;
    const anchor = toDateFromClientX(info.clientX);
    interactions.beginCreate(row, anchor);
    interactions.updateCreate(addDays(anchor, 1));
    interactions.completeGesture();
    setContextInfo(null);
  };

  const renderBar = (
    row: TimelineRowModel,
    virtualRow: (typeof virtualItems)[number],
  ) => {
    if (!row.itemId) return null;
    const start = safeParseIso(row.start);
    const end = safeParseIso(row.end);
    if (!start || !end) return null;
    const dayMs = 24 * 60 * 60 * 1000;
    const startOffset = (start.getTime() - startDate.getTime()) / dayMs;
    const endOffset = (end.getTime() - startDate.getTime()) / dayMs;
    const left = startOffset * pixelsPerDay;
    const width = Math.max(8, (endOffset - startOffset) * pixelsPerDay);
    const barHeight = Math.max(8, rowHeight - 12);
    const isSelected = selectionSet.has(row.itemId);

    return (
      <div
        data-context="bar"
        data-item-id={row.itemId}
        data-row-index={virtualRow.index}
        className="absolute"
        style={{ left, width, top: 6, height: barHeight }}
      >
        <div
          className={cn(
            "absolute inset-0 rounded-md border border-transparent bg-primary/20 text-[11px] text-primary-foreground shadow-sm transition",
            isSelected
              ? "ring-2 ring-primary/60 bg-primary/30"
              : "hover:bg-primary/15",
          )}
          tabIndex={0}
          onKeyDown={(event) => interactions.handleKeyDown(event)}
        >
          <div
            className="absolute inset-0 cursor-grab"
            onPointerDown={(event) => handleBarPointerDown(event, row)}
          />
          <div className="relative z-10 flex h-full w-full items-center justify-between px-2 text-xs font-medium text-primary-foreground pointer-events-none">
            <span className="truncate">{row.label}</span>
          </div>
          <div
            className="absolute left-0 top-0 h-full w-2 cursor-ew-resize"
            onPointerDown={(event) =>
              handleResizePointerDown(event, row.itemId!, "start")
            }
          />
          <div
            className="absolute right-0 top-0 h-full w-2 cursor-ew-resize"
            onPointerDown={(event) =>
              handleResizePointerDown(event, row.itemId!, "end")
            }
          />
          <div
            className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-primary shadow"
            onPointerDown={(event) =>
              handleDependencyPointerDown(event, row.itemId!)
            }
            onPointerUp={(event) =>
              handleDependencyPointerUp(event, row.itemId!)
            }
          />
        </div>
      </div>
    );
  };

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio ?? 1;
    canvas.width = gridWidth * dpr;
    canvas.height = totalHeight * dpr;
    canvas.style.width = `${gridWidth}px`;
    canvas.style.height = `${totalHeight}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, gridWidth, totalHeight);

    const dayMs = 24 * 60 * 60 * 1000;

    if (showWeekends) {
      const totalDays = Math.ceil(gridWidth / pixelsPerDay);
      for (let i = 0; i < totalDays; i += 1) {
        const date = addDays(startDate, i);
        if (isSaturday(date) || isSunday(date)) {
          const x = i * pixelsPerDay;
          ctx.fillStyle = "rgba(148, 163, 184, 0.2)";
          ctx.fillRect(x, 0, pixelsPerDay, totalHeight);
        }
      }
    }

    ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
    for (let x = 0; x < gridWidth; x += pixelsPerDay) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, totalHeight);
      ctx.stroke();
    }

    const today = startOfDay(new Date());
    const offsetDays = (today.getTime() - startDate.getTime()) / dayMs;
    if (offsetDays >= 0 && offsetDays <= gridWidth / pixelsPerDay) {
      const x = offsetDays * pixelsPerDay;
      ctx.strokeStyle = "rgba(239, 68, 68, 0.8)";
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, totalHeight);
      ctx.stroke();
    }

    ctx.lineWidth = 1;
    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      if (row.type !== "item") continue;
      const start = safeParseIso(row.start);
      const end = safeParseIso(row.end);
      if (!start || !end) continue;
      const y = i * rowHeight + 6;
      const barHeight = rowHeight - 12;
      const startOffset = (start.getTime() - startDate.getTime()) / dayMs;
      const endOffset = (end.getTime() - startDate.getTime()) / dayMs;
      const x = startOffset * pixelsPerDay;
      const width = Math.max(4, (endOffset - startOffset) * pixelsPerDay);

      const isCritical = criticalPath.has(row.itemId ?? "");
      ctx.fillStyle = isCritical
        ? "rgba(249, 115, 22, 0.9)"
        : "rgba(59, 130, 246, 0.85)";
      ctx.beginPath();
      const radius = Math.min(6, barHeight / 2);
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + barHeight - radius);
      ctx.quadraticCurveTo(
        x + width,
        y + barHeight,
        x + width - radius,
        y + barHeight,
      );
      ctx.lineTo(x + radius, y + barHeight);
      ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
      ctx.fill();

      if (showBaselines) {
        ctx.strokeStyle = "rgba(71, 85, 105, 0.6)";
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(x, y + barHeight + 2, width, 4);
        ctx.setLineDash([]);
      }
    }

    if (showDependencies) {
      ctx.strokeStyle = "rgba(59, 130, 246, 0.45)";
      ctx.lineWidth = 2;
      for (const dependency of dependencies) {
        const fromIndex = rowIndexByItemId.get(dependency.fromId);
        const toIndex = rowIndexByItemId.get(dependency.toId);
        if (fromIndex == null || toIndex == null) continue;
        const fromRow = rows[fromIndex];
        const toRow = rows[toIndex];
        const fromEnd = safeParseIso(fromRow?.end);
        const toStart = safeParseIso(toRow?.start);
        if (!fromEnd || !toStart) continue;
        const fromOffset = (fromEnd.getTime() - startDate.getTime()) / dayMs;
        const toOffset = (toStart.getTime() - startDate.getTime()) / dayMs;
        const fromX = fromOffset * pixelsPerDay;
        const toX = toOffset * pixelsPerDay;
        const fromY = fromIndex * rowHeight + rowHeight / 2;
        const toY = toIndex * rowHeight + rowHeight / 2;

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        const midX = Math.min(fromX + 40, (fromX + toX) / 2);
        ctx.bezierCurveTo(midX, fromY, midX, toY, toX, toY);
        ctx.stroke();

        ctx.beginPath();
        ctx.fillStyle = "rgba(59, 130, 246, 0.6)";
        ctx.moveTo(toX, toY);
        ctx.lineTo(toX - 6, toY - 4);
        ctx.lineTo(toX - 6, toY + 4);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }, [
    criticalPath,
    dependencies,
    gridWidth,
    pixelsPerDay,
    rowHeight,
    rowIndexByItemId,
    rows,
    showBaselines,
    showDependencies,
    showWeekends,
    startDate,
    totalHeight,
  ]);

  const contextRow =
    contextInfo && contextInfo.type !== "grid"
      ? (rows[contextInfo.rowIndex] ?? null)
      : null;

  return (
    <>
      <div className="relative" style={{ width: gridWidth, height: totalHeight }}>
        <canvas ref={canvasRef} className="absolute left-0 top-0" />
        <ContextMenu onOpenChange={handleContextMenuOpenChange}>
          <ContextMenuTrigger asChild>
            <div
              ref={overlayRef}
              className="relative z-10 h-full w-full outline-none"
              tabIndex={0}
              role="application"
              onKeyDown={(event) => interactions.handleKeyDown(event)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onContextMenuCapture={handleContextMenuCapture}
            >
              {virtualItems.map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <div
                    key={row?.id ?? virtualRow.key}
                    className={cn(
                      "absolute inset-x-0 border-b border-border/40",
                      virtualRow.index % 2 === 0
                        ? "bg-transparent"
                        : "bg-muted/20",
                      "relative",
                    )}
                    style={{ top: virtualRow.start, height: virtualRow.size }}
                    data-row-index={virtualRow.index}
                    onPointerDown={(event) => handleRowPointerDown(event, row)}
                  >
                    {row?.type === "item" ? renderBar(row, virtualRow) : null}
                  </div>
                );
              })}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent className="w-48">
            {contextInfo?.type === "bar" && contextRow ? (
              <>
                <ContextMenuLabel className="truncate">
                  {contextRow.label}
                </ContextMenuLabel>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onSelect={() =>
                    interactions.selectItem(contextInfo.itemId, "replace")
                  }
                >
                  Select item
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => interactions.copySelection()}>
                  Copy
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => interactions.deleteSelection()}>
                  Delete
                </ContextMenuItem>
              </>
            ) : (
              <>
                <ContextMenuLabel>Timeline</ContextMenuLabel>
                <ContextMenuSeparator />
                <ContextMenuItem
                  onSelect={() =>
                    contextInfo && handleCreateFromContext(contextInfo)
                  }
                >
                  Create item here
                </ContextMenuItem>
                <ContextMenuItem
                  disabled={
                    !interactions.clipboard || interactions.clipboard.length === 0
                  }
                  onSelect={() => interactions.pasteClipboard()}
                >
                  Paste
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>
      </div>
      <TooltipProvider delayDuration={100}>
      <div className="relative" style={{ width: gridWidth, height: totalHeight }}>
        <canvas ref={canvasRef} className="absolute left-0 top-0" />
        {virtualItems.map(virtualRow => {
          const row = rows[virtualRow.index];
          const y = virtualRow.start;
          return (
            <div
              key={`background-${row?.id ?? virtualRow.key}`}
              className={cn(
                "absolute inset-x-0 border-b border-border/40",
                virtualRow.index % 2 === 0 ? "bg-transparent" : "bg-muted/20"
              )}
              style={{ top: y, height: virtualRow.size }}
            />
          );
        })}
        {virtualItems.map(virtualRow => {
          const row = rows[virtualRow.index];
          if (!row || row.type !== "milestone") return null;

          const milestone =
            (row.milestoneId ? milestonesById.get(row.milestoneId) : null) ??
            (row.itemId ? milestonesById.get(row.itemId) : null) ??
            null;
          const milestoneDate =
            safeParseIso(row.start) ??
            safeParseIso(row.end) ??
            (milestone ? safeParseIso(milestone.date) : null);
          if (!milestoneDate) return null;

          const { x, labelSide } = computeMilestoneLayout({
            milestoneDate,
            startDate,
            pixelsPerDay,
            gridWidth,
          });
          const clampedX = Math.max(0, Math.min(gridWidth, x));
          const label = row.label || milestone?.name || "Milestone";
          const milestoneType = (milestone?.type ?? "internal") as MilestoneTypeKey;
          const config =
            milestoneTypeConfig[milestoneType] ?? milestoneTypeConfig.internal;
          const Icon = config.icon;
          const tooltipDate = format(milestoneDate, "PP");
          const tooltipTitle = label;

          const transform =
            labelSide === "left"
              ? "translateX(calc(-100% + 8px)) translateY(-50%)"
              : "translateX(-8px) translateY(-50%)";

          const labelClasses = cn(
            "max-w-[180px] truncate rounded border border-border/60 bg-background/90 px-2 py-0.5 text-xs font-medium shadow-sm backdrop-blur",
            config.textClass,
            labelSide === "left" ? "text-right" : "text-left"
          );

          return (
            <div
              key={`milestone-${row.id}`}
              className="pointer-events-none absolute"
              style={{
                left: clampedX,
                top: virtualRow.start + rowHeight / 2,
              }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="pointer-events-auto inline-flex min-w-0 items-center gap-2"
                    style={{ transform }}
                  >
                    {labelSide === "left" ? (
                      <>
                        <span className={labelClasses}>{label}</span>
                        <div
                          className={cn(
                            "relative h-4 w-4 rotate-45 rounded-sm border border-white/70",
                            config.colorClass,
                            config.borderClass
                          )}
                        >
                          <Icon className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-white" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div
                          className={cn(
                            "relative h-4 w-4 rotate-45 rounded-sm border border-white/70",
                            config.colorClass,
                            config.borderClass
                          )}
                        >
                          <Icon className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 -rotate-45 text-white" />
                        </div>
                        <span className={labelClasses}>{label}</span>
                      </>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="flex min-w-[160px] flex-col gap-1">
                    <span className="font-semibold text-foreground">{tooltipTitle}</span>
                    <span className="text-xs text-muted-foreground">
                      {config.label} · {tooltipDate}
                    </span>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
    </>
  );
}

function TimelineLegend() {
  const milestoneEntries: Array<{ key: MilestoneTypeKey; label: string; Icon: typeof Rocket; colorClass: string }> = [
    { key: "release", label: milestoneTypeConfig.release.label, Icon: milestoneTypeConfig.release.icon, colorClass: milestoneTypeConfig.release.colorClass },
    { key: "gate", label: milestoneTypeConfig.gate.label, Icon: milestoneTypeConfig.gate.icon, colorClass: milestoneTypeConfig.gate.colorClass },
    { key: "external", label: milestoneTypeConfig.external.label, Icon: milestoneTypeConfig.external.icon, colorClass: milestoneTypeConfig.external.colorClass },
    { key: "internal", label: milestoneTypeConfig.internal.label, Icon: milestoneTypeConfig.internal.icon, colorClass: milestoneTypeConfig.internal.colorClass },
  ];

  return (
    <aside className="hidden w-64 border-l bg-background/90 p-4 text-sm text-muted-foreground lg:block">
      <h3 className="text-sm font-semibold text-foreground">Legend</h3>
      <ul className="mt-3 space-y-2">
        <li>
          <span className="mr-2 inline-block h-3 w-3 rounded bg-blue-500 align-middle" />
          Planned work
        </li>
        <li>
          <span className="mr-2 inline-block h-3 w-3 rounded bg-orange-500 align-middle" />
          Critical path
        </li>
        <li>
          <span className="mr-2 inline-block h-3 w-3 rounded border border-dashed border-slate-500 align-middle" />
          Baseline
        </li>
        <li>
          <span className="mr-2 inline-block h-3 w-3 rounded bg-rose-500/70 align-middle" />
          Today marker
        </li>
        {milestoneEntries.map(({ key, label, Icon, colorClass }) => (
          <li key={key} className="flex items-center gap-2">
            <span className={cn("flex h-4 w-4 items-center justify-center rounded-full border border-border/50", colorClass)}>
              <Icon className="h-3 w-3 text-white" />
            </span>
            <span className="text-xs text-foreground">{label}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export interface TimelineViewProps
  extends Omit<TimelineProviderProps, "children"> {
  className?: string;
  height?: number | string;
}

export function TimelineView({
  className,
  height,
  ...providerProps
}: TimelineViewProps) {
  return (
    <TimelineProvider {...providerProps}>
      <TimelineSurface className={className} height={height} />
    </TimelineProvider>
  );
}
