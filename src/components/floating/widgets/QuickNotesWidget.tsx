import { useLocalStorageState } from "../../../hooks/useLocalStorageState";

export default function QuickNotesWidget() {
  const [note, setNote] = useLocalStorageState("coringa.quick-note", "");

  return (
    <div className="h-full flex flex-col p-4">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="flex-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-slate-200 resize-none focus:outline-none focus:border-yellow-500/50 placeholder:text-slate-600 leading-relaxed"
        placeholder="Digite suas notas rápidas aqui..."
      />
    </div>
  );
}
