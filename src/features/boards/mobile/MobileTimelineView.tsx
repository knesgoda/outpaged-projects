import { useCallback, useMemo, useRef, useState } from "react";
import type React from "react";
import { CalendarRange, ZoomIn, ZoomOut } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { useBoardViewContext } from "../views/context";

import { useGestureHandlers } from "./useGestureHandlers";
import { useDeviceDetection } from "./useDeviceDetection";

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const parseDate = (value: unknown): number | null => {
  if (!value) return null;
  if (value instanceof Date) return value.getTime();
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? null : parsed;
};

interface TimelineItem {
  id: string;
  label: string;
  start: number;
  end: number;
  left: number;
  width: number;
}

export function MobileTimelineView() {
  const { items, configuration } = useBoardViewContext();
  const { supportsTouch } = useDeviceDetection();
  const [zoom, setZoom] = useState(1);
  const pinchBase = useRef(1);
  const isPinching = useRef(false);

  const timelineSettings = configuration.timeline ?? {
    startField: "start_date",
    endField: "due_date",
  };

  const timelineItems = useMemo(() => {
    const mapped = items
      .map((item) => {
        const rawStart = item[timelineSettings.startField];
        const rawEnd = item[timelineSettings.endField] ?? rawStart;
        const start = parseDate(rawStart);
        const end = parseDate(rawEnd);
        const id = typeof item.id === "string" || typeof item.id === "number" ? String(item.id) : null;
        const label = String(item.title ?? item.name ?? item.key ?? id ?? "Untitled");
        if (start == null || end == null || !id) return null;
        return { id, label, start, end };
      })
      .filter((value): value is { id: string; label: string; start: number; end: number } => Boolean(value));

    if (!mapped.length) return [] as TimelineItem[];

    const minStart = Math.min(...mapped.map((item) => item.start));
    const maxEnd = Math.max(...mapped.map((item) => item.end));
    const range = Math.max(maxEnd - minStart, 1);

    return mapped.map((item) => {
      const left = ((item.start - minStart) / range) * 100;
      const width = Math.max(((item.end - item.start) / range) * 100, 2);
      return { ...item, left, width } satisfies TimelineItem;
    });
  }, [items, timelineSettings.endField, timelineSettings.startField]);

  const handleZoomChange = useCallback((next: number) => {
    setZoom(clamp(next, 0.5, 3));
  }, []);

  const { pinchHandlers } = useGestureHandlers({
    pinch: {
      onPinch: (scale) => {
        if (!isPinching.current) {
          isPinching.current = true;
          pinchBase.current = zoom;
        }
        handleZoomChange(pinchBase.current * scale);
      },
      onPinchEnd: () => {
        isPinching.current = false;
        pinchBase.current = zoom;
      },
    },
  });

  const handleWheel = useCallback(
    (event: React.WheelEvent<HTMLDivElement>) => {
      if (supportsTouch) return;
      if (!event.ctrlKey) return;
      event.preventDefault();
      const delta = event.deltaY > 0 ? -0.1 : 0.1;
      handleZoomChange(clamp(zoom + delta, 0.5, 3));
    },
    [handleZoomChange, supportsTouch, zoom]
  );

  return (
    <div className="flex h-full flex-col" data-testid="mobile-timeline-view">
      <div className="flex items-center justify-between gap-2 p-3">
        <div className="flex items-center gap-2">
          <CalendarRange className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold">Timeline</h2>
          <Badge variant="outline" data-testid="mobile-timeline-zoom-indicator">
            {zoom.toFixed(1)}x
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleZoomChange(clamp(zoom - 0.2, 0.5, 3))}
            data-testid="mobile-timeline-zoom-out"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleZoomChange(clamp(zoom + 0.2, 0.5, 3))}
            data-testid="mobile-timeline-zoom-in"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleZoomChange(1)}
            data-testid="mobile-timeline-reset"
          >
            Reset
          </Button>
        </div>
      </div>
      <Card className="m-3 flex-1 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Schedule overview</CardTitle>
        </CardHeader>
        <CardContent className="flex h-full flex-col">
          {timelineItems.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              No timeline data available.
            </div>
          ) : (
            <div
              className="relative flex-1 overflow-x-auto"
              onWheel={handleWheel}
              {...pinchHandlers}
              data-testid="mobile-timeline-track"
            >
              <div
                className="relative h-full min-h-[260px]"
                style={{ width: `${Math.max(100, zoom * 100)}%` }}
                data-zoom={zoom}
              >
                {timelineItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="absolute top-4 rounded-lg border bg-primary/10 px-3 py-2"
                    style={{
                      left: `${item.left}%`,
                      width: `${Math.max(item.width * zoom, 8)}%`,
                    }}
                    data-testid="mobile-timeline-item"
                  >
                    <div className="text-xs font-semibold text-primary">{item.label}</div>
                    <div className="text-[11px] text-muted-foreground">Event {index + 1}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
