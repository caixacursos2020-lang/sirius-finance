import { useCallback, useRef, useState } from "react";
import { useLocalStorageState } from "./useLocalStorageState";

type Point = { x: number; y: number };

type Bounds = {
  width: number;
  height: number;
  offsetLeft?: number;
  offsetTop?: number;
};

/**
 * Hook genérico de drag com persistência em localStorage.
 * Funciona com mouse e touch (pointer events).
 */
export function usePersistentDrag(
  storageKey: string,
  initial: Point,
  getBounds?: () => Bounds | undefined
) {
  const [position, setPosition] = useLocalStorageState<Point>(
    storageKey,
    initial
  );
  const dragging = useRef(false);
  const startPoint = useRef<Point>({ x: 0, y: 0 });
  const startPos = useRef<Point>(position);
  const [, setTick] = useState(0); // só para forçar re-render ao arrastar

  const clamp = useCallback(
    (next: Point) => {
      const bounds = getBounds?.() ?? {
        width: typeof window !== "undefined" ? window.innerWidth : 1000,
        height: typeof window !== "undefined" ? window.innerHeight : 800,
        offsetLeft: 0,
        offsetTop: 0,
      };
      const offX = bounds.offsetLeft ?? 0;
      const offY = bounds.offsetTop ?? 0;
      return {
        x: Math.min(
          Math.max(next.x, offX),
          offX + bounds.width - 20 // pequena margem
        ),
        y: Math.min(
          Math.max(next.y, offY),
          offY + bounds.height - 20
        ),
      };
    },
    [getBounds]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      (e as PointerEvent).preventDefault?.();
      const evt = e as PointerEvent;
      dragging.current = true;
      startPoint.current = { x: evt.clientX, y: evt.clientY };
      startPos.current = position;
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [position]
  );

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragging.current) return;
    const dx = e.clientX - startPoint.current.x;
    const dy = e.clientY - startPoint.current.y;
    const next = clamp({ x: startPos.current.x + dx, y: startPos.current.y + dy });
    setPosition(next);
    setTick((t) => t + 1);
  }, [clamp, setPosition]);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
  }, [onPointerMove]);

  return {
    position,
    setPosition,
    bind: {
      onPointerDown,
    },
  };
}

