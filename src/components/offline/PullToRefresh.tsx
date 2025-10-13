import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  disabled?: boolean;
  threshold?: number;
}

export function PullToRefresh({ onRefresh, disabled = false, threshold = 80 }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const scrollElement = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (disabled) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        touchStartY.current = e.touches[0].clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshing || window.scrollY > 0) return;

      const currentY = e.touches[0].clientY;
      const distance = Math.max(0, currentY - touchStartY.current);

      if (distance > 0) {
        e.preventDefault();
        setPullDistance(Math.min(distance, threshold * 1.5));
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
      setPullDistance(0);
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [disabled, isRefreshing, onRefresh, pullDistance, threshold]);

  const progress = Math.min(pullDistance / threshold, 1);
  const isTriggered = progress >= 1;

  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <div
      ref={scrollElement}
      className="pointer-events-none fixed left-0 right-0 top-0 z-50 flex justify-center"
      style={{ transform: `translateY(${pullDistance * 0.5}px)` }}
    >
      <div
        className={cn(
          "mt-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 shadow-lg transition-all",
          isTriggered && "bg-primary/20 scale-110"
        )}
      >
        <RefreshCw
          className={cn(
            "h-5 w-5 text-primary transition-transform",
            (isRefreshing || isTriggered) && "animate-spin"
          )}
          style={{ transform: `rotate(${progress * 180}deg)` }}
        />
      </div>
    </div>
  );
}
