import { useCoringa } from "./CoringaContext";
import CommandList from "./CommandList";
import WidgetHost from "./WidgetHost";
import { X, ArrowLeft, GripHorizontal } from "lucide-react";

export default function CommandCenter({ isMobile }: { isMobile: boolean }) {
  const { activeWidget, setActiveWidget, setIsOpen } = useCoringa();

  const isCommandMode = activeWidget === "command";

  return (
    <div className="flex flex-col h-full w-full text-slate-100">
      <div
        className={`flex items-center justify-between px-4 py-3 border-b border-slate-800 ${
          !isMobile ? "coringa-drag-handle cursor-grab active:cursor-grabbing" : ""
        }`}
      >
        <div className="flex items-center gap-2">
          {!isCommandMode && (
            <button
              onClick={() => setActiveWidget("command")}
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              className="coringa-no-drag p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <span className="font-bold text-sm uppercase tracking-wider flex items-center gap-2 text-emerald-400">
            {!isMobile && <GripHorizontal size={16} className="opacity-50" />}
            {isCommandMode ? "Acesso Rápido" : getWidgetTitle(activeWidget)}
          </span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          className="coringa-no-drag p-1 hover:bg-rose-500/20 hover:text-rose-400 rounded-md text-slate-400 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {isCommandMode ? <CommandList /> : <WidgetHost />}
      </div>
    </div>
  );
}

function getWidgetTitle(widget: string | null) {
  switch (widget) {
    case "add-income":
      return "Nova Entrada";
    case "add-expense":
      return "Nova Saída";
    case "calculator":
      return "Calculadora";
    case "notes":
      return "Notas Rápidas";
    case "income-sources":
      return "Fontes de Renda";
    case "categories":
      return "Categorias";
    case "compare-months":
      return "Comparativo Mensal";
    case "product-analytics":
      return "Pesquisa de Preços";
    case "tools":
      return "Ferramentas";
    case "calculator-page":
      return "Calculadora";
    case "notes-page":
      return "Notas";
    case "calendar-page":
      return "Calendário";
    case "bank":
      return "Carteira";
    case "payment-methods":
      return "Formas de Pagamento";
    case "account":
      return "Minha Conta";
    default:
      return "Widget";
  }
}
