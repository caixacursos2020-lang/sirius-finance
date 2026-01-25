import { createContext, useContext } from "react";

export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

export type WidgetType =
  | "command"
  | "calculator"
  | "notes"
  | "add-income"
  | "add-expense"
  | "income-sources"
  | "categories"
  | "compare-months"
  | "product-analytics"
  | "tools"
  | "calculator-page"
  | "notes-page"
  | "calendar-page"
  | "bank"
  | "payment-methods"
  | "account"
  | "import-receipt"
  | null;

export interface CoringaContextType {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  isEnabled: boolean;
  setIsEnabled: (v: boolean) => void;
  activeWidget: WidgetType;
  setActiveWidget: (w: WidgetType) => void;

  fabPosition: Point;
  setFabPosition: (p: Point) => void;
  panelPosition: Point;
  setPanelPosition: (p: Point) => void;
  panelSize: Size;
  setPanelSize: (s: Size) => void;

  favorites: string[];
  toggleFavorite: (id: string) => void;
  recents: string[];
  addRecent: (id: string) => void;
}

export const CoringaContext = createContext<CoringaContextType | null>(null);

export const useCoringa = () => {
  const ctx = useContext(CoringaContext);
  if (!ctx) throw new Error("useCoringa must be used within CoringaProvider");
  return ctx;
};
