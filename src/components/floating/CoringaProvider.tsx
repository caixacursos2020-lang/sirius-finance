import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useLocalStorageState } from "../../hooks/useLocalStorageState";
import { CoringaContext } from "./CoringaContext";
import type { Point, Size, WidgetType } from "./CoringaContext";
import CoringaButton from "./CoringaButton";
import CoringaPanel from "./CoringaPanel";
import { useHotkeys } from "../../hooks/useHotkeys";

export default function CoringaProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeWidget, setActiveWidget] = useState<WidgetType>("command");

  const [isEnabled, setIsEnabled] = useLocalStorageState<boolean>("coringa.enabled", true);

  const [fabPosition, setFabPosition] = useLocalStorageState<Point>("coringa.fab.pos", {
    x: typeof window !== "undefined" ? window.innerWidth - 80 : 0,
    y: typeof window !== "undefined" ? window.innerHeight - 100 : 0,
  });

  const [panelPosition, setPanelPosition] = useLocalStorageState<Point>("coringa.panel.pos", {
    x: typeof window !== "undefined" ? window.innerWidth / 2 - 250 : 100,
    y: typeof window !== "undefined" ? window.innerHeight / 2 - 200 : 100,
  });

  const [panelSize, setPanelSize] = useLocalStorageState<Size>("coringa.panel.size", {
    width: 500,
    height: 400,
  });

  const [favorites, setFavorites] = useLocalStorageState<string[]>("coringa.favorites", []);
  const [recents, setRecents] = useLocalStorageState<string[]>("coringa.recents", []);

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      if (prev.includes(id)) {
        return prev.filter((f) => f !== id);
      }
      const next = [id, ...prev];
      return next.slice(0, 5);
    });
  };

  const addRecent = (id: string) => {
    setRecents((prev) => {
      const filtered = prev.filter((r) => r !== id);
      return [id, ...filtered].slice(0, 5);
    });
  };

  useHotkeys(
    "k",
    () => {
      if (isEnabled) {
        setIsOpen((prev) => !prev);
        if (!isOpen) setActiveWidget("command");
      }
    },
    { ctrlKey: true }
  );

  useHotkeys("escape", () => setIsOpen(false));

  const value = useMemo(
    () => ({
      isOpen,
      setIsOpen,
      isEnabled,
      setIsEnabled,
      activeWidget,
      setActiveWidget,
      fabPosition,
      setFabPosition,
      panelPosition,
      setPanelPosition,
      panelSize,
      setPanelSize,
      favorites,
      toggleFavorite,
      recents,
      addRecent,
    }),
    [
      isOpen,
      isEnabled,
      activeWidget,
      fabPosition,
      panelPosition,
      panelSize,
      favorites,
      recents,
    ]
  );

  return (
    <CoringaContext.Provider value={value}>
      {children}
      <CoringaButton />
      <CoringaPanel />

    </CoringaContext.Provider>
  );
}
