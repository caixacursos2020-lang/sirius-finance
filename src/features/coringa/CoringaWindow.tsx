import { useEffect, useMemo, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "cmdk";
import { AnimatePresence, motion } from "framer-motion";
import { X, Star, StarOff } from "lucide-react";
import { coringaRegistry } from "./registry";
import { useCoringa } from "./CoringaProvider";

const MOBILE_BREAKPOINT = 720;

export default function CoringaWindow() {
  const {
    enabled,
    windowOpen,
    setWindowOpen,
    windowRect,
    setWindowRect,
    activeToolId,
    setActiveToolId,
    favorites,
    toggleFavorite,
  } = useCoringa();

  const [query, setQuery] = useState("");
  const isMobile = typeof window !== "undefined" && window.innerWidth < MOBILE_BREAKPOINT;
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setWindowOpen(true);
      }
      if (e.key === "Escape") {
        setWindowOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setWindowOpen]);

  const results = useMemo(() => {
    const q = query.toLowerCase();
    return coringaRegistry.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }, [query]);

  const activeTool = coringaRegistry.find((t) => t.id === activeToolId) ?? coringaRegistry[0];

  const openTool = (id: string, action?: () => void) => {
    setActiveToolId(id);
    setWindowOpen(true);
    if (action) action();
  };

  const renderContent = () => {
    if (!activeTool?.component) {
      return (
        <div className="flex h-full items-center justify-center text-slate-400">
          Selecione uma ferramenta
        </div>
      );
    }
    const Comp = activeTool.component;
    return <Comp />;
  };

  const baseWindow = (
    <div
      ref={containerRef}
      className="flex h-full w-full flex-col rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)] overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Command Center
        </div>
        <div className="flex items-center gap-2">
          <button
            className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-200 hover:border-emerald-400"
            onClick={() => setWindowOpen(false)}
            aria-label="Fechar"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="p-3 border-b border-white/5">
        <Command label="Acesso Rápido command">
          <CommandInput
            placeholder="Buscar ação (Ctrl+K)"
            value={query}
            onValueChange={setQuery}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
          />
          <CommandList className="max-h-44 overflow-y-auto mt-2">
            <CommandEmpty>Nada encontrado</CommandEmpty>
            <CommandGroup heading="Favoritos">
              {favorites
                .map((id) => coringaRegistry.find((t) => t.id === id))
                .filter(Boolean)
                .map((item) => (
                  <CommandItem
                    key={item!.id}
                    value={item!.title}
                    onSelect={() => openTool(item!.id, item!.onSelect)}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-2 data-[selected=true]:bg-emerald-500/20"
                  >
                    <span className="flex items-center gap-2 text-slate-100">
                      {item!.icon}
                      {item!.title}
                    </span>
                    <Star className="h-3 w-3 text-amber-400" />
                  </CommandItem>
                ))}
            </CommandGroup>
            <CommandGroup heading="Todas">
              {results.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.title}
                  onSelect={() => openTool(item.id, item.onSelect)}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-2 data-[selected=true]:bg-sky-500/10"
                >
                  <span className="flex items-center gap-2 text-slate-100">
                    {item.icon}
                    {item.title}
                    <span className="text-[10px] text-slate-500">{item.category}</span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(item.id);
                    }}
                    className="text-amber-400"
                    aria-label="Favoritar"
                  >
                    {favorites.includes(item.id) ? <Star size={14} /> : <StarOff size={14} />}
                  </button>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </div>

      <div className="flex-1 p-4">{renderContent()}</div>
    </div>
  );

  if (!enabled) return null;

  return (
    <AnimatePresence>
      {windowOpen && (
        isMobile ? (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: "30%", opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 120 }}
            className="fixed inset-x-0 bottom-0 z-[1290] h-[70vh] p-3"
          >
            {baseWindow}
          </motion.div>
        ) : (
          <Rnd
            bounds="window"
            default={{ x: windowRect.x, y: windowRect.y, width: windowRect.width, height: windowRect.height }}
            size={{ width: windowRect.width, height: windowRect.height }}
            position={{ x: windowRect.x, y: windowRect.y }}
            minWidth={360}
            minHeight={360}
            onDragStop={(_, d) => setWindowRect({ ...windowRect, x: d.x, y: d.y })}
            onResizeStop={(_, __, ref, _delta, position) => {
              setWindowRect({
                x: position.x,
                y: position.y,
                width: ref.offsetWidth,
                height: ref.offsetHeight,
              });
            }}
            className="z-[1290]"
          >
            {baseWindow}
          </Rnd>
        )
      )}
    </AnimatePresence>
  );
}
