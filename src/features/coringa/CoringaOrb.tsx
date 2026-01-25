import { useEffect } from "react";
import { motion, useMotionValue } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useCoringa } from "./CoringaProvider";

const ORB_SIZE = 64;

export default function CoringaOrb() {
  const {
    enabled,
    orbPosition,
    setOrbPosition,
    edgeSnap,
    setEdgeSnap,
    windowOpen,
    setWindowOpen,
    setEnabled,
  } = useCoringa();

  const x = useMotionValue(orbPosition.x);
  const y = useMotionValue(orbPosition.y);

  useEffect(() => {
    x.set(orbPosition.x);
    y.set(orbPosition.y);
  }, [orbPosition.x, orbPosition.y, x, y]);

  if (!enabled) return null;

  const handleDragEnd = (_: any, info: any) => {
    if (typeof window === "undefined") return;
    const newX = info.point.x;
    const newY = info.point.y;

    // zona de ocultar
    if (newY > window.innerHeight - 90) {
      setWindowOpen(false);
      setEnabled(false);
      return;
    }

    const snap = newX < window.innerWidth / 2 ? "left" : "right";
    const clampedX =
      snap === "left" ? 16 : Math.max(16, window.innerWidth - ORB_SIZE - 16);
    const clampedY = Math.min(
      Math.max(16, newY),
      window.innerHeight - ORB_SIZE - 24
    );

    setEdgeSnap(snap);
    setOrbPosition({ x: clampedX, y: clampedY });
    x.set(clampedX);
    y.set(clampedY);
  };

  return (
    <motion.button
      aria-label="Abrir Command Center"
      onClick={() => setWindowOpen(!windowOpen)}
      drag
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      style={{ x, y }}
      whileTap={{ scale: 0.95 }}
      className="fixed z-[1300] flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 via-sky-500 to-indigo-500 text-slate-900 ring-4 ring-white/10 backdrop-blur-lg"
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{
        scale: 1,
        opacity: 1,
        boxShadow: "0 0 28px rgba(56,189,248,0.35)",
        filter: "drop-shadow(0 0 10px rgba(16,185,129,0.6))",
      }}
    >
      <Sparkles className="h-7 w-7 animate-pulse" />
      <div className="absolute inset-0 rounded-full bg-white/10 opacity-0 hover:opacity-30 transition-opacity" />
      <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 text-[10px] text-slate-200">
        {edgeSnap === "left" ? "float •" : "• float"}
      </div>
    </motion.button>
  );
}

