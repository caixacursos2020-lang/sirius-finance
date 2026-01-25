import { useEffect, useState } from "react";
import { NotebookPen } from "lucide-react";

const KEY = "coringa_notes_v2";

export default function NotesTool() {
  const [text, setText] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(KEY);
    if (raw) setText(raw);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(KEY, text);
  }, [text]);

  return (
    <div className="flex h-full flex-col gap-3 text-sm text-slate-100">
      <div className="flex items-center gap-2 text-base font-semibold">
        <NotebookPen className="h-4 w-4 text-amber-400" />
        Notas rápidas
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Anote ideias, tarefas, rascunhos..."
        className="h-48 w-full resize-none rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 outline-none focus:border-emerald-500"
      />
      <p className="text-[11px] text-slate-500">Salvo automaticamente neste dispositivo.</p>
    </div>
  );
}

