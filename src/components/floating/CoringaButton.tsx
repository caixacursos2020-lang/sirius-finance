import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCoringa } from "./CoringaContext";
import { Sparkles, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";

const TRASH_ZONE_HEIGHT = 100;

export default function CoringaButton() {
  const { isEnabled, setIsEnabled, setIsOpen, fabPosition, setFabPosition, setActiveWidget } =
    useCoringa();
  const [isDragging, setIsDragging] = useState(false);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [constraints, setConstraints] = useState({
    left: 0,
    top: 0,
    right: typeof window !== "undefined" ? window.innerWidth - 56 : 0,
    bottom: typeof window !== "undefined" ? window.innerHeight - 56 : 0,
  });
  const [labelSide, setLabelSide] = useState<"left" | "right">("right");
  const posRef = useRef(fabPosition);
  useEffect(() => {
    posRef.current = fabPosition;
  }, [fabPosition]);

  const handleDragEnd = (_: any, info: any) => {
    setIsDragging(false);
    const point = info?.point;
    if (!point || typeof window === "undefined") {
      setIsOverTrash(false);
      return;
    }
    const { x, y } = point;

    if (y > window.innerHeight - TRASH_ZONE_HEIGHT) {
      setIsOpen(false);
      setIsEnabled(false);
    } else {
      setFabPosition({ x, y });
    }
    setIsOverTrash(false);
  };

  const handleDrag = (_: any, info: any) => {
    if (!info?.point || typeof window === "undefined") {
      setIsOverTrash(false);
      return;
    }
    setIsOverTrash(info.point.y > window.innerHeight - TRASH_ZONE_HEIGHT);
  };

  const handleClick = () => {
    if (!isDragging) {
      setActiveWidget("command");
      setIsOpen(true);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => {
      const margin = 140;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const current = posRef.current;
      const clamped = {
        x: Math.min(Math.max(current.x, 0), w - 56),
        y: Math.min(Math.max(current.y, 0), h - 56),
      };
      if (clamped.x !== current.x || clamped.y !== current.y) {
        setFabPosition(clamped);
        posRef.current = clamped;
      }
      setLabelSide(clamped.x > w - margin ? "left" : "right");
      setConstraints({
        left: 0,
        top: 0,
        right: w - 56,
        bottom: h - 56,
      });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [setFabPosition]);

  const isBrowser = typeof window !== "undefined" && typeof document !== "undefined";
  if (!isEnabled || !isBrowser) return null;

  return (
    <>
      {createPortal(
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className={`fixed bottom-0 left-0 right-0 h-[100px] z-[9998] flex items-center justify-center border-t backdrop-blur-sm transition-colors duration-300 ${
                isOverTrash
                  ? "bg-rose-900/80 border-rose-500 text-rose-200"
                  : "bg-slate-900/50 border-slate-700/50 text-slate-400"
              }`}
            >
              <div className="flex flex-col items-center gap-2">
                <Trash2 size={24} className={isOverTrash ? "animate-bounce" : ""} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isOverTrash ? "Solte para desativar" : "Arraste aqui para ocultar"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <motion.button
        drag
        dragMomentum={false}
        dragElastic={0.1}
        dragConstraints={constraints}
        onDragStart={() => setIsDragging(true)}
        onDragEnd={handleDragEnd}
        onDrag={handleDrag}
        onClick={handleClick}
        initial={{ x: fabPosition.x, y: fabPosition.y }}
        animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 9991,
          cursor: isDragging ? "grabbing" : "pointer",
          pointerEvents: "auto",
        }}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-sky-400 text-slate-900 shadow-[0_0_25px_rgba(16,185,129,0.45)] ring-2 ring-emerald-300/50"
      >
        {/* Aura viva */}
        <motion.span
          aria-hidden
          className="absolute -inset-3 rounded-full blur-xl opacity-70"
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(16,185,129,0.65), transparent 60%)",
          }}
          animate={{ opacity: [0.35, 0.8, 0.4], scale: [0.9, 1.05, 0.95] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          aria-hidden
          className="absolute -inset-2 rounded-full"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(16,185,129,0.9), rgba(56,189,248,0.8), rgba(16,185,129,0.9))",
            filter: "blur(6px)",
            opacity: 0.5,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 70% 20%, rgba(255,255,255,0.35), transparent 45%)",
          }}
          animate={{ opacity: [0.15, 0.45, 0.2] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Ring pulse */}
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full border border-emerald-300/40"
          animate={
            isDragging
              ? { opacity: 0, scale: 1 }
              : { opacity: [0.5, 0], scale: [1, 1.8] }
          }
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeOut" }}
        />

        <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
        <motion.div
          animate={!isDragging ? { y: [0, -1.5, 0] } : { y: 0 }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          <Sparkles className="h-6 w-6 text-white drop-shadow-md" />
        </motion.div>

        {/* Label convidativo */}
        <motion.span
          aria-hidden
          className={`pointer-events-none absolute whitespace-nowrap rounded-full border border-emerald-400/40 bg-slate-950/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-200 shadow-lg backdrop-blur ${
            labelSide === "right" ? "left-full ml-3" : "right-full mr-3"
          }`}
          animate={
            isDragging
              ? { opacity: 0, x: 0 }
              : { opacity: [0.2, 0.95, 0.25], x: labelSide === "right" ? [0, 2, 0] : [0, -2, 0] }
          }
          transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        >
          Abrir Acesso Rápido
        </motion.span>
      </motion.button>
    </>
  );
}
