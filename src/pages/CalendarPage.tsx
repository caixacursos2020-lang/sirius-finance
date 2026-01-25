import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ExternalLink } from "lucide-react";

const CALENDAR_URL = "https://calendar.google.com";

export default function CalendarPage() {
  const navigate = useNavigate();

  useEffect(() => {
    window.open(CALENDAR_URL, "_blank", "noopener,noreferrer");
  }, []);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold text-slate-100">Calendário</h1>
      <p className="text-slate-400">
        Estamos abrindo o Google Calendar em uma nova aba. Se nada acontecer,
        use o botão abaixo.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => window.open(CALENDAR_URL, "_blank", "noopener,noreferrer")}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          <ExternalLink size={16} /> Abrir Google Calendar
        </button>
        <button
          type="button"
          onClick={() => navigate("/ferramentas")}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
        >
          Voltar para Ferramentas
        </button>
      </div>
    </div>
  );
}
