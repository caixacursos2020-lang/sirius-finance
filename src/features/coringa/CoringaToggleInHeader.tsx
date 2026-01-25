import { Sparkles } from "lucide-react";
import { useCoringa } from "../../components/floating/CoringaContext";

export default function CoringaToggleInHeader() {
  const { isEnabled, setIsEnabled, setIsOpen, setActiveWidget } = useCoringa();

  return (
    <button
      type="button"
      aria-label="Ativar Bubble"
      onClick={() => {
        const next = !isEnabled;
        setIsEnabled(next);
        if (!next) {
          setIsOpen(false);
        } else {
          setActiveWidget("command");
          setIsOpen(true);
        }
      }}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold transition ${
        isEnabled
          ? "bg-gradient-to-r from-emerald-500 to-sky-500 text-slate-900 shadow-lg shadow-emerald-900/40"
          : "border border-slate-700 text-slate-300 hover:border-emerald-400"
      }`}
    >
      <Sparkles className="h-4 w-4" />
      {isEnabled ? "Bubble ON" : "Bubble OFF"}
    </button>
  );
}
