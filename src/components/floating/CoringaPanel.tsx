import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Rnd } from "react-rnd";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useCoringa } from "./CoringaContext";
import CommandCenter from "./CommandCenter";

export default function CoringaPanel() {
  const { isOpen, panelPosition, setPanelPosition, panelSize, setPanelSize } = useCoringa();
  const [isMobile, setIsMobile] = useState(false);
  const [mobileSize, setMobileSize] = useState<{ width: number; height: number } | null>(null);
  const constraintsRef = useRef<HTMLDivElement | null>(null);
  const dragControls = useDragControls();
  const resizeStateRef = useRef<{
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      const prefersTouch = window.matchMedia("(pointer: coarse)").matches;
      const narrowWidth = window.innerWidth < 768;
      // Em telas touch (tablet/celular), força o modo sheet para evitar travas de drag
      setIsMobile(prefersTouch || narrowWidth);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!isMobile || typeof window === "undefined") return;

    const clamp = (value: number, min: number, max: number) =>
      Math.min(Math.max(value, min), max);

    const updateSize = () => {
      const maxW = window.innerWidth - 24;
      const maxH = window.innerHeight - 24;
      setMobileSize((prev) => {
        const base = prev ?? {
          width: Math.min(420, maxW),
          height: Math.round(window.innerHeight * 0.85),
        };
        const next = {
          width: clamp(base.width, 280, maxW),
          height: clamp(base.height, 320, maxH),
        };
        if (prev && prev.width === next.width && prev.height === next.height) {
          return prev;
        }
        return next;
      });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [isMobile, isOpen]);

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  const getBounds = () => {
    const w = typeof window !== "undefined" ? window.innerWidth : 1024;
    const h = typeof window !== "undefined" ? window.innerHeight : 768;
    return { maxW: w - 24, maxH: h - 24 };
  };

  const onResizePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (typeof window === "undefined") return;
    event.currentTarget.setPointerCapture(event.pointerId);

    const { maxW, maxH } = getBounds();
    const current = mobileSize ?? {
      width: Math.min(420, maxW),
      height: Math.round((maxH + 24) * 0.85),
    };

    resizeStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startW: current.width,
      startH: current.height,
    };
  };

  const onResizePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!resizeStateRef.current) return;
    const { maxW, maxH } = getBounds();

    const { startX, startY, startW, startH } = resizeStateRef.current;
    const deltaX = event.clientX - startX;
    const deltaY = startY - event.clientY;

    const nextW = clamp(startW + deltaX, 280, maxW);
    const nextH = clamp(startH + deltaY, 320, maxH);

    setMobileSize((prev) => {
      if (prev && prev.width === nextW && prev.height === nextH) return prev;
      return { width: nextW, height: nextH };
    });
  };

  const onResizePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    resizeStateRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {isMobile && <div ref={constraintsRef} className="fixed inset-0 z-[9997]" />}

          {isMobile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              // Overlay transparente e sem captura de clique, para permitir ver/interagir com o app por tras.
              // Fechar o Acesso Rápido fica pelo botao "X" / ESC.
              className="fixed inset-0 bg-black/0 z-[9998] pointer-events-none"
            />
          )}

          {isMobile ? (
            <motion.div
              drag
              dragListener={false}
              dragControls={dragControls}
              dragConstraints={constraintsRef}
              dragMomentum={false}
              dragElastic={0.12}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-3 left-3 z-[9999] bg-slate-900/85 rounded-2xl border border-slate-700 shadow-2xl flex flex-col"
              style={{
                touchAction: "none",
                width: mobileSize?.width ?? Math.min(420, typeof window !== "undefined" ? window.innerWidth - 24 : 360),
                height: mobileSize?.height ?? Math.round((typeof window !== "undefined" ? window.innerHeight : 640) * 0.85),
                maxWidth: typeof window !== "undefined" ? window.innerWidth - 24 : 1024,
                maxHeight: typeof window !== "undefined" ? window.innerHeight - 24 : 768,
              }}
            >
              <div
                className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing touch-none select-none"
                onPointerDown={(event) => dragControls.start(event)}
              >
                <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
              </div>
              <div className="flex-1 overflow-hidden">
                <CommandCenter isMobile={true} />
              </div>
              <div className="h-6 flex items-center justify-between px-3">
                <div className="w-10 h-1 rounded-full bg-slate-700/70" />
                <button
                  type="button"
                  className="h-6 w-6 rounded-md border border-slate-600 bg-slate-800 cursor-nwse-resize touch-none select-none"
                  onPointerDown={onResizePointerDown}
                  onPointerMove={onResizePointerMove}
                  onPointerUp={onResizePointerUp}
                  onPointerCancel={onResizePointerUp}
                  aria-label="Redimensionar Acesso Rápido"
                >
                  <span className="block h-full w-full rounded-md bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.6),transparent_60%)]" />
                </button>
              </div>
            </motion.div>
          ) : (
            <Rnd
              position={{ x: panelPosition.x, y: panelPosition.y }}
              size={{ width: panelSize.width, height: panelSize.height }}
              minWidth={400}
              minHeight={300}
              bounds="window"
              cancel=".coringa-no-drag, input, textarea, button, select, a"
              onDragStop={(_, d) => setPanelPosition({ x: d.x, y: d.y })}
              onResizeStop={(_, __, ref, ___, position) => {
                setPanelSize({
                  width: parseInt(ref.style.width),
                  height: parseInt(ref.style.height),
                });
                setPanelPosition({ x: position.x, y: position.y });
              }}
              style={{ zIndex: 9999 }}
              className="rounded-xl border border-slate-700 bg-slate-900/80 shadow-2xl overflow-hidden flex flex-col"
            >
              <CommandCenter isMobile={false} />
            </Rnd>
          )}
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
