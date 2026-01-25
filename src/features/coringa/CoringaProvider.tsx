import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocalStorageState } from "../../hooks/useLocalStorageState";

export type EdgeSnap = "left" | "right";

type Rect = { x: number; y: number; width: number; height: number };

type CoringaContextValue = {
  enabled: boolean;
  setEnabled: (v: boolean) => void;

  orbPosition: { x: number; y: number };
  setOrbPosition: (p: { x: number; y: number }) => void;
  edgeSnap: EdgeSnap;
  setEdgeSnap: (s: EdgeSnap) => void;

  windowOpen: boolean;
  setWindowOpen: (v: boolean) => void;
  windowRect: Rect;
  setWindowRect: (r: Rect) => void;

  activeToolId: string | null;
  setActiveToolId: (id: string | null) => void;

  favorites: string[];
  toggleFavorite: (id: string) => void;
};

const CoringaContext = createContext<CoringaContextValue | null>(null);

const ORB_KEY = "coringa_orb";
const WINDOW_KEY = "coringa_window";
const ENABLED_KEY = "coringa_enabled";
const FAV_KEY = "coringa_favs";

function defaultOrbPosition() {
  if (typeof window === "undefined") return { x: 18, y: 240 };
  return { x: window.innerWidth - 82, y: window.innerHeight - 180 };
}

function defaultWindowRect(): Rect {
  if (typeof window === "undefined")
    return { x: 120, y: 120, width: 420, height: 520 };
  const w = Math.min(window.innerWidth * 0.68, 520);
  const h = Math.min(window.innerHeight * 0.7, 560);
  return {
    x: Math.max(32, window.innerWidth * 0.16),
    y: Math.max(28, window.innerHeight * 0.12),
    width: w,
    height: h,
  };
}

export function CoringaProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useLocalStorageState<boolean>(ENABLED_KEY, true);
  const [orbPosition, setOrbPosition] = useLocalStorageState(ORB_KEY, defaultOrbPosition());
  const [edgeSnap, setEdgeSnap] = useState<EdgeSnap>("right");
  const [windowOpen, setWindowOpen] = useState(false);
  const [windowRect, setWindowRect] = useLocalStorageState<Rect>(WINDOW_KEY, defaultWindowRect());
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [favorites, setFavorites] = useLocalStorageState<string[]>(FAV_KEY, []);

  useEffect(() => {
    if (!enabled) {
      setWindowOpen(false);
    }
  }, [enabled]);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      if (prev.includes(id)) return prev.filter((f) => f !== id);
      return [...prev, id];
    });
  };

  const value = useMemo<CoringaContextValue>(
    () => ({
      enabled,
      setEnabled,
      orbPosition,
      setOrbPosition,
      edgeSnap,
      setEdgeSnap,
      windowOpen,
      setWindowOpen,
      windowRect,
      setWindowRect,
      activeToolId,
      setActiveToolId,
      favorites,
      toggleFavorite,
    }),
    [
      enabled,
      orbPosition,
      edgeSnap,
      windowOpen,
      windowRect,
      activeToolId,
      favorites,
    ]
  );

  return <CoringaContext.Provider value={value}>{children}</CoringaContext.Provider>;
}

export const useCoringa = () => {
  const ctx = useContext(CoringaContext);
  if (!ctx) throw new Error("useCoringa deve ser usado dentro de CoringaProvider");
  return ctx;
};

