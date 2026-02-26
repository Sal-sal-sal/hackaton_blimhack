import { useRef, useState, useCallback, useEffect } from "react";

const SWIPE_THRESHOLD = 100;
const VELOCITY_THRESHOLD = 0.5; // px/ms
const MAX_ROTATION = 15;
const TAP_THRESHOLD = 8; // px — move less than this → it's a tap, not a drag

interface UseSwipeGestureResult {
  x: number;
  y: number;
  rotate: number;
  direction: "left" | "right" | null;
  dragProgress: number; // 0–1
  handlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: () => void;
  };
}

/**
 * Tinder-like drag + Instagram Stories-like tap detection.
 *
 * Drag behavior:
 * - Y-axis follows drag (subtly)
 * - Rotation direction depends on where the card was grabbed (top vs bottom half)
 * - Velocity-based swipe: fast flick triggers swipe even below distance threshold
 *
 * Tap behavior (movement < 8px):
 * - Calls onTap("left") or onTap("right") based on which horizontal half was touched
 */
export function useSwipeGesture(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  onTap?: (side: "left" | "right") => void,
): UseSwipeGestureResult {
  const [pos, setPos] = useState({ x: 0, y: 0, rotate: 0 });

  const onSwipeLeftRef = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);
  const onTapRef = useRef(onTap);
  useEffect(() => {
    onSwipeLeftRef.current = onSwipeLeft;
    onSwipeRightRef.current = onSwipeRight;
    onTapRef.current = onTap;
  }, [onSwipeLeft, onSwipeRight, onTap]);

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const grabYRatioRef = useRef(0.5);
  const elementRectRef = useRef<DOMRect | null>(null);
  const lastTimeRef = useRef(0);
  const lastXRef = useRef(0);
  const velocityRef = useRef(0);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    isDraggingRef.current = true;
    lastTimeRef.current = e.timeStamp;
    lastXRef.current = e.clientX;
    velocityRef.current = 0;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    grabYRatioRef.current = (e.clientY - rect.top) / rect.height;
    elementRectRef.current = rect;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;

    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    const dt = e.timeStamp - lastTimeRef.current;
    if (dt > 0) velocityRef.current = (e.clientX - lastXRef.current) / dt;
    lastTimeRef.current = e.timeStamp;
    lastXRef.current = e.clientX;

    const rotSign = grabYRatioRef.current < 0.5 ? 1 : -1;
    const rotate = Math.min(
      Math.max((dx / SWIPE_THRESHOLD) * MAX_ROTATION * rotSign, -MAX_ROTATION),
      MAX_ROTATION,
    );

    setPos({ x: dx, y: dy * 0.15, rotate });
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;
    const totalMove = Math.max(Math.abs(dx), Math.abs(dy));

    // ── Tap (no significant movement) ──────────────────────────────────────
    if (totalMove < TAP_THRESHOLD) {
      const rect = elementRectRef.current;
      if (rect && onTapRef.current) {
        const tapX = e.clientX - rect.left;
        onTapRef.current(tapX < rect.width / 2 ? "left" : "right");
      }
      setPos({ x: 0, y: 0, rotate: 0 });
      return;
    }

    // ── Drag swipe ──────────────────────────────────────────────────────────
    const vel = velocityRef.current;
    if (dx < -SWIPE_THRESHOLD || vel < -VELOCITY_THRESHOLD) {
      onSwipeLeftRef.current();
    } else if (dx > SWIPE_THRESHOLD || vel > VELOCITY_THRESHOLD) {
      onSwipeRightRef.current();
    }

    setPos({ x: 0, y: 0, rotate: 0 });
  }, []);

  const onPointerCancel = useCallback(() => {
    isDraggingRef.current = false;
    setPos({ x: 0, y: 0, rotate: 0 });
  }, []);

  const dragProgress = Math.min(Math.abs(pos.x) / SWIPE_THRESHOLD, 1);
  const direction: "left" | "right" | null =
    pos.x < -SWIPE_THRESHOLD * 0.4 ? "left" : pos.x > SWIPE_THRESHOLD * 0.4 ? "right" : null;

  return {
    x: pos.x,
    y: pos.y,
    rotate: pos.rotate,
    direction,
    dragProgress,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel },
  };
}
