import { useState, useRef, TouchEvent, ReactNode } from "react";

import { CheckCircle2, Flag, ArrowRight, XCircle, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface SwipeAction {
  id: string;
  label: string;
  icon: ReactNode;
  color: string;
  onAction: () => void;
  hapticPattern?: number | number[];
}

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  className?: string;
}

export function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className,
}: SwipeableCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isSwiping) return;
    
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    
    // Apply resistance at edges
    const maxSwipe = 120;
    const resistance = 0.5;
    
    if (Math.abs(diff) > maxSwipe) {
      setTranslateX(diff > 0 ? maxSwipe + (diff - maxSwipe) * resistance : -maxSwipe + (diff + maxSwipe) * resistance);
    } else {
      setTranslateX(diff);
    }
  };

  const triggerHaptic = (pattern?: number | number[]) => {
    if (typeof window === "undefined") return;
    if (!pattern) return;
    try {
      window.navigator?.vibrate?.(pattern);
    } catch {
      // noop - haptics are best effort
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);

    const threshold = 80;

    if (translateX > threshold && rightAction) {
      // Swipe right action
      rightAction.onAction();
      triggerHaptic(rightAction.hapticPattern ?? 35);
      setTranslateX(0);
      onSwipeRight?.();
    } else if (translateX < -threshold && leftAction) {
      // Swipe left action
      leftAction.onAction();
      triggerHaptic(leftAction.hapticPattern ?? [0, 24, 12, 24]);
      setTranslateX(0);
      onSwipeLeft?.();
    } else {
      // Reset if threshold not met
      setTranslateX(0);
    }
  };

  const showLeftAction = translateX > 20;
  const showRightAction = translateX < -20;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Left action background */}
      {rightAction && (
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 flex items-center px-4 transition-opacity rounded-2xl",
            rightAction.color,
            showLeftAction ? "opacity-100" : "opacity-0"
          )}
          style={{ width: Math.max(0, translateX) }}
        >
          <div className="flex items-center gap-2">
            {rightAction.icon}
            <span className="font-medium">{rightAction.label}</span>
          </div>
        </div>
      )}

      {/* Right action background */}
      {leftAction && (
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 flex items-center justify-end px-4 transition-opacity rounded-2xl",
            leftAction.color,
            showRightAction ? "opacity-100" : "opacity-0"
          )}
          style={{ width: Math.max(0, -translateX) }}
        >
          <div className="flex items-center gap-2">
            <span className="font-medium">{leftAction.label}</span>
            {leftAction.icon}
          </div>
        </div>
      )}

      {/* Swipeable content */}
      <div
        className={cn("relative", className)}
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isSwiping ? "none" : "transform 0.3s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

// Predefined action presets
export const SwipeActions = {
  complete: (onComplete: () => void): SwipeAction => ({
    id: "complete",
    label: "Complete",
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: "bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-400/30",
    onAction: onComplete,
    hapticPattern: 40,
  }),

  done: (onDone: () => void): SwipeAction => ({
    id: "done",
    label: "Mark done",
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: "bg-emerald-500/15 text-emerald-100 ring-1 ring-emerald-400/40",
    onAction: onDone,
    hapticPattern: 45,
  }),

  delete: (onDelete: () => void): SwipeAction => ({
    id: "delete",
    label: "Delete",
    icon: <Trash2 className="h-5 w-5" />,
    color: "bg-destructive text-destructive-foreground",
    onAction: onDelete,
    hapticPattern: [0, 30, 20, 30],
  }),

  moveForward: (onMove: () => void): SwipeAction => ({
    id: "move",
    label: "Move",
    icon: <ArrowRight className="h-5 w-5" />,
    color: "bg-primary text-primary-foreground",
    onAction: onMove,
    hapticPattern: 35,
  }),

  archive: (onArchive: () => void): SwipeAction => ({
    id: "archive",
    label: "Archive",
    icon: <XCircle className="h-5 w-5" />,
    color: "bg-warning text-warning-foreground",
    onAction: onArchive,
    hapticPattern: [0, 30, 10, 30],
  }),

  flag: (onFlag: () => void): SwipeAction => ({
    id: "flag",
    label: "Flag",
    icon: <Flag className="h-5 w-5" />,
    color: "bg-orange-500/15 text-orange-100 ring-1 ring-orange-400/40",
    onAction: onFlag,
    hapticPattern: [0, 28, 14, 28],
  }),
};
