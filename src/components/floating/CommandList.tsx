import { useMemo, useState } from "react";
import { useCoringa } from "./CoringaContext";
import type { WidgetType } from "./CoringaContext";
import {
  Search,
  Star,
  Calculator,
  PlusCircle,
  MinusCircle,
  ArrowRight,
  Home,
  CalendarDays,
  NotebookPen,
  Wrench,
  TrendingUp,
  TrendingDown,
  PieChart,
  Layers,
  Wallet,
  UserRound,
  CreditCard,
} from "lucide-react";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";

type CommandItem = {
  id: string;
  label: string;
  icon: any;
  widget?: WidgetType;
  path?: string;
  group: string;
  color: string;
};

const COMMANDS: CommandItem[] = [
  {
    id: "nav-dashboard",
    label: "Dashboard",
    icon: Home,
    path: "/",
    group: "Dashboard",
    color: "text-sky-300",
  },
  {
    id: "cmd-income",
    label: "Nova Entrada",
    icon: PlusCircle,
    widget: "add-income",
    path: "/entradas/adicionar",
    group: "Entradas",
    color: "text-emerald-400",
  },
  {
    id: "income-sources",
    label: "Fontes",
    icon: TrendingUp,
    widget: "income-sources",
    path: "/entradas/fontes",
    group: "Entradas",
    color: "text-emerald-300",
  },
  {
    id: "cmd-expense",
    label: "Nova Saída",
    icon: MinusCircle,
    widget: "add-expense",
    path: "/saidas/adicionar",
    group: "Saídas",
    color: "text-rose-400",
  },
  {
    id: "categories",
    label: "Categorias",
    icon: TrendingDown,
    widget: "categories",
    path: "/categorias",
    group: "Saídas",
    color: "text-rose-300",
  },
  {
    id: "compare-months",
    label: "Comparativo Mensal",
    icon: PieChart,
    widget: "compare-months",
    path: "/comparar",
    group: "Análises",
    color: "text-sky-300",
  },
  {
    id: "product-analytics",
    label: "Pesquisa de Preços",
    icon: Layers,
    widget: "product-analytics",
    path: "/analise-produtos",
    group: "Análises",
    color: "text-amber-300",
  },
  {
    id: "tools",
    label: "Ferramentas",
    icon: Wrench,
    widget: "tools",
    path: "/ferramentas",
    group: "Ferramentas",
    color: "text-slate-300",
  },
  {
    id: "calculator-page",
    label: "Calculadora",
    icon: Calculator,
    widget: "calculator-page",
    path: "/ferramentas/calculadora",
    group: "Ferramentas",
    color: "text-blue-300",
  },
  {
    id: "notes-page",
    label: "Notas",
    icon: NotebookPen,
    widget: "notes-page",
    path: "/ferramentas/notas",
    group: "Ferramentas",
    color: "text-yellow-300",
  },
  {
    id: "calendar-page",
    label: "Calendário",
    icon: CalendarDays,
    widget: "calendar-page",
    path: "/ferramentas/calendario",
    group: "Ferramentas",
    color: "text-emerald-300",
  },
  {
    id: "bank",
    label: "Carteira",
    icon: Wallet,
    widget: "bank",
    path: "/banco",
    group: "Banco / Carteira",
    color: "text-slate-300",
  },
  {
    id: "payment-methods",
    label: "Formas de Pagamento",
    icon: CreditCard,
    widget: "payment-methods",
    path: "/formas-pagamento",
    group: "Banco / Carteira",
    color: "text-sky-300",
  },
  {
    id: "account",
    label: "Minha Conta",
    icon: UserRound,
    widget: "account",
    path: "/conta",
    group: "Conta",
    color: "text-violet-300",
  },
  {
    id: "cmd-calc",
    label: "Calculadora Rápida",
    icon: Calculator,
    widget: "calculator",
    group: "Utilidades",
    color: "text-blue-400",
  },
];

const GROUP_ORDER = [
  "Dashboard",
  "Entradas",
  "Saídas",
  "Análises",
  "Ferramentas",
  "Banco / Carteira",
  "Conta",
  "Utilidades",
];

export default function CommandList() {
  const { setActiveWidget, setIsOpen, favorites, toggleFavorite, addRecent } = useCoringa();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const filteredCommands = useMemo(() => {
    if (!search) return COMMANDS;
    return COMMANDS.filter((c) => c.label.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  const handleSelect = (cmd: CommandItem) => {
    addRecent(cmd.id);
    if (cmd.widget) {
      setActiveWidget(cmd.widget);
      setIsOpen(true); // garante render do widget
      return;
    }
    if (cmd.path) {
      navigate(cmd.path);
      // ao navegar para rota externa, pode fechar o coringa
      setIsOpen(false);
      return;
    }
  };

  const renderSection = (title: string, items: CommandItem[]) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-4">
        <h3 className="px-4 text-[10px] font-bold uppercase text-slate-500 mb-2">{title}</h3>
        <div className="space-y-1 px-2">
          {items.map((cmd) => (
            <div
              key={cmd.id}
              className="group flex items-center justify-between p-2 rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
              onClick={() => handleSelect(cmd)}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-md bg-slate-800 group-hover:bg-slate-700 ${cmd.color}`}
                >
                  <cmd.icon size={18} />
                </div>
                <span className="text-sm font-medium text-slate-200">{cmd.label}</span>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(cmd.id);
                  }}
                  className={clsx(
                    "p-1 hover:bg-slate-700 rounded",
                    favorites.includes(cmd.id) ? "text-yellow-400" : "text-slate-500"
                  )}
                >
                  <Star size={14} fill={favorites.includes(cmd.id) ? "currentColor" : "none"} />
                </button>
                <ArrowRight size={14} className="text-slate-500" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const favItems = COMMANDS.filter((c) => favorites.includes(c.id));

  const grouped = GROUP_ORDER.map((group) => ({
    title: group,
    items: COMMANDS.filter((c) => c.group === group),
  }));

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="O que você precisa?"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 placeholder:text-slate-600"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 scrollbar-thin scrollbar-thumb-slate-700">
        {!search && (
          <>
            {renderSection("Atalhos favoritos (máx. 5)", favItems)}
            {grouped.map((section) => (
              <div key={section.title}>{renderSection(section.title, section.items)}</div>
            ))}
          </>
        )}

        {search && renderSection("Resultados", filteredCommands)}

        {filteredCommands.length === 0 && (
          <div className="text-center text-slate-500 py-8 text-sm">Nenhum comando encontrado.</div>
        )}
      </div>
    </div>
  );
}


