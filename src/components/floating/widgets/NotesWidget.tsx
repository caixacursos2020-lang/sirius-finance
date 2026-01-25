import { useEffect, useState } from "react";
import { NotebookPen, X } from "lucide-react";

type Props = {
  onClose: () => void;
};

const STORAGE_KEY = "curinga-notes";

export default function NotesWidget({ onClose }: Props) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) setText(raw);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, text);
  }, [text]);

  return (
    <div className="flex h-full w-full flex-col gap-3">
      <div className="flex items-center justify-between text-slate-100">
        <div className="flex items-center gap-2">
          <NotebookPen className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-semibold">Notas rápidas</span>
        </div>
        <button
          className="text-slate-400 hover:text-slate-100"
          onClick={onClose}
          aria-label="Fechar notas"
        >
          <X size={14} />
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Anote ideias, lembretes ou tarefas rápidas..."
        className="h-36 w-full resize-none rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
      />
      <p className="text-[11px] text-slate-500">
        As notas ficam salvas automaticamente no seu navegador.
      </p>
    </div>
  );
}

