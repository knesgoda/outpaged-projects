import { useCallback, useRef } from "react";
import type React from "react";

import { useDeviceDetection } from "./useDeviceDetection";

export interface SwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
}

export interface PinchOptions {
  onPinch?: (scale: number) => void;
  onPinchEnd?: () => void;
}

interface PointerState {
  startX: number;
  startY: number;
  pointerId: number;
}

interface PinchState {
  pointers: Map<number, { x: number; y: number }>;
  initialDistance: number | null;
}

export function useGestureHandlers({
  swipe,
  pinch,
}: {
  swipe?: SwipeOptions;
  pinch?: PinchOptions;
}) {
  const { supportsTouch } = useDeviceDetection();
  const pointerState = useRef<PointerState | null>(null);
  const pinchState = useRef<PinchState>({ pointers: new Map(), initialDistance: null });

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!swipe) return;
      pointerState.current = {
        startX: event.clientX,
        startY: event.clientY,
        pointerId: event.pointerId,
      };
    },
    [swipe]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!swipe) return;
      if (!pointerState.current || pointerState.current.pointerId !== event.pointerId) {
        return;
      }

      const deltaX = event.clientX - pointerState.current.startX;
      const deltaY = event.clientY - pointerState.current.startY;
      const threshold = swipe.threshold ?? 60;

      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        return;
      }

      if (deltaX > threshold) {
        pointerState.current = null;
        swipe.onSwipeRight?.();
      } else if (deltaX < -threshold) {
        pointerState.current = null;
        swipe.onSwipeLeft?.();
      }
    },
    [swipe]
  );

  const handlePointerUp = useCallback(() => {
    pointerState.current = null;
  }, []);

  const distanceBetween = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handlePinchPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!pinch) return;
      const state = pinchState.current;
      state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (state.pointers.size === 2) {
        const [first, second] = Array.from(state.pointers.values());
        state.initialDistance = distanceBetween(first, second);
      }
    },
    [pinch]
  );

  const handlePinchPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!pinch) return;
      const state = pinchState.current;
      if (!state.pointers.has(event.pointerId)) return;

      state.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (state.pointers.size === 2) {
        const [first, second] = Array.from(state.pointers.values());
        const distance = distanceBetween(first, second);
        if (state.initialDistance && distance > 0) {
          const scale = distance / state.initialDistance;
          pinch.onPinch?.(scale);
        }
      }
    },
    [pinch]
  );

  const handlePinchPointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (!pinch) return;
      const state = pinchState.current;
      state.pointers.delete(event.pointerId);
      if (state.pointers.size < 2) {
        state.initialDistance = null;
        pinch.onPinchEnd?.();
      }
    },
    [pinch]
  );

  const swipeHandlers = supportsTouch
    ? {
        onTouchStart: (event: React.TouchEvent<HTMLElement>) => {
          if (!swipe) return;
          const touch = event.touches[0];
          pointerState.current = {
            startX: touch.clientX,
            startY: touch.clientY,
            pointerId: touch.identifier,
          };
        },
        onTouchMove: (event: React.TouchEvent<HTMLElement>) => {
          if (!swipe || !pointerState.current) return;
          const touch = Array.from(event.changedTouches).find(
            (item) => item.identifier === pointerState.current?.pointerId
          );
          if (!touch) return;

          const deltaX = touch.clientX - pointerState.current.startX;
          const deltaY = touch.clientY - pointerState.current.startY;
          const threshold = swipe.threshold ?? 60;
          if (Math.abs(deltaY) > Math.abs(deltaX)) {
            return;
          }
          if (deltaX > threshold) {
            pointerState.current = null;
            swipe.onSwipeRight?.();
          } else if (deltaX < -threshold) {
            pointerState.current = null;
            swipe.onSwipeLeft?.();
          }
        },
        onTouchEnd: () => {
          pointerState.current = null;
        },
      }
    : {
        onPointerDown: handlePointerDown,
        onPointerMove: handlePointerMove,
        onPointerUp: handlePointerUp,
        onPointerCancel: handlePointerUp,
      };

  const pinchHandlers = supportsTouch
    ? {
        onTouchStart: (event: React.TouchEvent<HTMLElement>) => {
          if (!pinch) return;
          Array.from(event.changedTouches).forEach((touch) => {
            pinchState.current.pointers.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
          });
          if (pinchState.current.pointers.size === 2) {
            const [first, second] = Array.from(pinchState.current.pointers.values());
            pinchState.current.initialDistance = distanceBetween(first, second);
          }
        },
        onTouchMove: (event: React.TouchEvent<HTMLElement>) => {
          if (!pinch) return;
          Array.from(event.changedTouches).forEach((touch) => {
            if (pinchState.current.pointers.has(touch.identifier)) {
              pinchState.current.pointers.set(touch.identifier, {
                x: touch.clientX,
                y: touch.clientY,
              });
            }
          });
          if (pinchState.current.pointers.size === 2 && pinchState.current.initialDistance) {
            const [first, second] = Array.from(pinchState.current.pointers.values());
            const distance = distanceBetween(first, second);
            if (distance > 0) {
              pinch.onPinch?.(distance / pinchState.current.initialDistance);
            }
          }
        },
        onTouchEnd: (event: React.TouchEvent<HTMLElement>) => {
          if (!pinch) return;
          Array.from(event.changedTouches).forEach((touch) => {
            pinchState.current.pointers.delete(touch.identifier);
          });
          if (pinchState.current.pointers.size < 2) {
            pinchState.current.initialDistance = null;
            pinch.onPinchEnd?.();
          }
        },
      }
    : {
        onPointerDown: handlePinchPointerDown,
        onPointerMove: handlePinchPointerMove,
        onPointerUp: handlePinchPointerUp,
        onPointerCancel: handlePinchPointerUp,
      };

  return {
    swipeHandlers,
    pinchHandlers,
  };
}
