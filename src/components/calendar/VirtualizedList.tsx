import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  overscan?: number;
  className?: string;
  innerClassName?: string;
  estimateHeight?: (item: T, index: number) => number;
  renderItem: (item: T, index: number) => ReactNode;
}

interface RangeState {
  start: number;
  end: number;
  offset: number;
}

const DEFAULT_RANGE: RangeState = { start: 0, end: -1, offset: 0 };

export function VirtualizedList<T>({
  items,
  itemHeight,
  overscan = 3,
  className,
  innerClassName,
  estimateHeight,
  renderItem,
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [range, setRange] = useState<RangeState>(DEFAULT_RANGE);

  const heights = useMemo(() => {
    if (!estimateHeight) {
      return undefined;
    }
    return items.map((item, index) => estimateHeight(item, index));
  }, [items, estimateHeight]);

  const totalHeight = useMemo(() => {
    if (heights) {
      return heights.reduce((total, value) => total + value, 0);
    }
    return items.length * itemHeight;
  }, [heights, items.length, itemHeight]);

  const offsets = useMemo(() => {
    if (!heights) {
      return undefined;
    }
    let running = 0;
    return heights.map((height) => {
      const current = running;
      running += height;
      return current;
    });
  }, [heights]);

  const resolveOffsetForIndex = useCallback(
    (index: number) => {
      if (offsets) {
        return offsets[index] ?? 0;
      }
      return index * itemHeight;
    },
    [offsets, itemHeight]
  );

  const getVisibleRange = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return DEFAULT_RANGE;
    }
    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;
    if (viewportHeight === 0) {
      return DEFAULT_RANGE;
    }

    let startIndex = 0;
    let endIndex = items.length - 1;

    if (offsets && heights) {
      while (startIndex < items.length && resolveOffsetForIndex(startIndex) + heights[startIndex] < scrollTop) {
        startIndex += 1;
      }
      endIndex = startIndex;
      const limit = scrollTop + viewportHeight;
      while (endIndex < items.length && resolveOffsetForIndex(endIndex) < limit) {
        endIndex += 1;
      }
    } else {
      const baseStart = Math.floor(scrollTop / itemHeight);
      const visible = Math.ceil(viewportHeight / itemHeight);
      startIndex = Math.max(0, baseStart - overscan);
      endIndex = Math.min(items.length - 1, baseStart + visible + overscan);
    }

    return {
      start: Math.max(0, startIndex - overscan),
      end: Math.min(items.length - 1, endIndex + overscan),
      offset: resolveOffsetForIndex(startIndex),
    } satisfies RangeState;
  }, [items.length, offsets, heights, itemHeight, overscan, resolveOffsetForIndex]);

  useEffect(() => {
    setRange(getVisibleRange());
  }, [getVisibleRange]);

  const handleScroll = useCallback(() => {
    setRange(getVisibleRange());
  }, [getVisibleRange]);

  const visibleItems = useMemo(() => {
    if (items.length === 0 || range.end < range.start) {
      return [] as Array<[T, number]>;
    }
    const slice = items.slice(range.start, range.end + 1);
    return slice.map((item, index) => [item, range.start + index] as const);
  }, [items, range]);

  return (
    <div
      ref={containerRef}
      className={cn("relative h-full w-full overflow-auto", className)}
      onScroll={handleScroll}
    >
      <div className={cn("relative w-full", innerClassName)} style={{ height: Math.max(totalHeight, 0) }}>
        {visibleItems.map(([item, index]) => {
          const top = resolveOffsetForIndex(index);
          const height = heights ? heights[index] : itemHeight;
          return (
            <div
              key={`virtual-item-${index}`}
              className="absolute left-0 right-0"
              style={{ top, height }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
