import { Calculator, StickyNote, CalendarDays, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

const cards = [
  {
    title: "Calculadora",
    description: "Cálculos rápidos sem sair do Sirius",
    icon: <Calculator className="text-emerald-400" size={22} />,
    action: (nav: ReturnType<typeof useNavigate>) => nav("/ferramentas/calculadora"),
  },
  {
    title: "Notas",
    description: "Rascunhe ideias, listas e lembretes",
    icon: <StickyNote className="text-sky-400" size={22} />,
    action: (nav: ReturnType<typeof useNavigate>) => nav("/ferramentas/notas"),
  },
  {
    title: "Calendário",
    description: "Atalho rápido para organizar seus dias",
    icon: <CalendarDays className="text-amber-300" size={22} />,
    action: (nav: ReturnType<typeof useNavigate>) => nav("/ferramentas/calendario"),
  },
];

export default function ToolsPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-emerald-400">
          Ferramentas
        </p>
        <h1 className="text-2xl font-bold text-slate-50">Atalhos rápidos</h1>
        <p className="text-sm text-slate-400">
          Acesse utilidades do dia a dia sem sair do Sirius.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <button
            key={card.title}
            onClick={() => card.action(navigate)}
            className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-left hover:border-emerald-500/60 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all flex flex-col gap-3 group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-slate-950/70 border border-slate-800 flex items-center justify-center">
                  {card.icon}
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-50">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {card.description}
                  </p>
                </div>
              </div>
              <ExternalLink
                size={16}
                className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
              />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

