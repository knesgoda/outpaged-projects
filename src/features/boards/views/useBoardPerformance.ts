import { useEffect, useLayoutEffect, useRef } from "react";

type FrameHandle = number | ReturnType<typeof setTimeout>;

const requestFrame = (callback: FrameRequestCallback): FrameHandle => {
  if (typeof requestAnimationFrame === "function") {
    return requestAnimationFrame(callback);
  }
  return setTimeout(() => callback(Date.now()), 16);
};

const cancelFrame = (handle: FrameHandle) => {
  if (typeof cancelAnimationFrame === "function" && typeof handle === "number") {
    cancelAnimationFrame(handle);
    return;
  }
  clearTimeout(handle as ReturnType<typeof setTimeout>);
};

export interface BoardPerformanceEvent {
  label: string;
  itemCount: number;
  durationMs: number;
  timestamp: number;
}

const isBrowser = typeof window !== "undefined";
const hasPerformance = typeof performance !== "undefined" && typeof performance.now === "function";

export function useBoardPerformanceTracker(label: string, itemCount: number) {
  const startRef = useRef<number>(hasPerformance ? performance.now() : Date.now());

  useLayoutEffect(() => {
    startRef.current = hasPerformance ? performance.now() : Date.now();
  }, [itemCount]);

  useEffect(() => {
    const handle = requestFrame(() => {
      const end = hasPerformance ? performance.now() : Date.now();
      const duration = end - startRef.current;

      if (isBrowser) {
        const globalStore = (window as typeof window & {
          __BOARD_PERF__?: BoardPerformanceEvent[];
        }).__BOARD_PERF__ ?? [];
        globalStore.push({
          label,
          itemCount,
          durationMs: duration,
          timestamp: Date.now(),
        });
        (window as typeof window & { __BOARD_PERF__?: BoardPerformanceEvent[] }).__BOARD_PERF__ = globalStore;
      }

      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console -- profiling aid for large datasets
        console.info(`[board-perf] ${label}`, {
          durationMs: Number(duration.toFixed(2)),
          itemCount,
        });
      }
    });

    return () => {
      cancelFrame(handle);
    };
  }, [itemCount, label]);
}
