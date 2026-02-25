import { useRef, useState, useCallback, useEffect } from "react";

const SWIPE_THRESHOLD = 100;
const MAX_ROTATION = 15;

interface UseSwipeGestureResult {
  x: number;
  rotate: number;
  direction: "left" | "right" | null;
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: () => void;
  };
}

/**
 * Tracks pointer/touch drag on a card.
 *
 * Uses refs for the callbacks so the returned handlers are stable across
 * re-renders and never need to be re-created (no stale closure issues).
 */
export function useSwipeGesture(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
): UseSwipeGestureResult {
  const [x, setX] = useState(0);

  // Stable refs — updated on every render so callbacks are never stale
  const onSwipeLeftRef = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);
  useEffect(() => {
    onSwipeLeftRef.current = onSwipeLeft;
    onSwipeRightRef.current = onSwipeRight;
  }, [onSwipeLeft, onSwipeRight]);

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startXRef.current = e.clientX;
    isDraggingRef.current = true;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    setX(e.clientX - startXRef.current);
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const dx = e.clientX - startXRef.current;
    if (dx < -SWIPE_THRESHOLD) {
      onSwipeLeftRef.current();
    } else if (dx > SWIPE_THRESHOLD) {
      onSwipeRightRef.current();
    }
    setX(0);
  }, []);

  const onPointerCancel = useCallback(() => {
    isDraggingRef.current = false;
    setX(0);
  }, []);

  const rotate = Math.min(Math.max((x / SWIPE_THRESHOLD) * MAX_ROTATION, -MAX_ROTATION), MAX_ROTATION);

  const direction: "left" | "right" | null =
    x < -SWIPE_THRESHOLD * 0.4 ? "left" : x > SWIPE_THRESHOLD * 0.4 ? "right" : null;

  return {
    x,
    rotate,
    direction,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
