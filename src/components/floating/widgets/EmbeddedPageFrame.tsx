import type { ReactNode } from "react";
import { ArrowLeft, X } from "lucide-react";
import { useCoringa } from "../CoringaContext";

type Tone =
  | "emerald"
  | "rose"
  | "sky"
  | "amber"
  | "slate"
  | "blue"
  | "yellow"
  | "violet";

const toneClass: Record<Tone, string> = {
  emerald: "text-emerald-300",
  rose: "text-rose-300",
  sky: "text-sky-300",
  amber: "text-amber-300",
  slate: "text-slate-300",
  blue: "text-blue-300",
  yellow: "text-yellow-300",
  violet: "text-violet-300",
};

export default function EmbeddedPageFrame({
  title,
  tone = "emerald",
  children,
}: {
  title: string;
  tone?: Tone;
  children: ReactNode;
}) {
  const { setActiveWidget, setIsOpen } = useCoringa();

  return (
    <div className="h-full overflow-y-auto bg-slate-950">
      <div className="sticky top-0 z-10 flex items-center justify-between bg-slate-900/90 backdrop-blur px-3 py-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveWidget("command")}
            className="coringa-no-drag p-2 rounded-md hover:bg-slate-800 text-slate-200"
            aria-label="Voltar para comandos"
          >
            <ArrowLeft size={16} />
          </button>
          <span
            className={`text-xs font-semibold uppercase tracking-wide ${toneClass[tone]}`}
          >
            {title}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="coringa-no-drag p-2 rounded-md hover:bg-rose-500/15 text-slate-300 hover:text-rose-300"
          aria-label="Fechar Acesso Rápido"
        >
          <X size={16} />
        </button>
      </div>
      <div className="pt-2">{children}</div>
    </div>
  );
}
