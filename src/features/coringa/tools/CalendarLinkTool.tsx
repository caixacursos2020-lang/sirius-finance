import { ExternalLink } from "lucide-react";

export default function CalendarLinkTool() {
  return (
    <div className="flex h-full flex-col items-start justify-center gap-3 text-sm text-slate-100">
      <p className="text-base font-semibold flex items-center gap-2">
        <ExternalLink className="h-4 w-4 text-sky-400" />
        Google Calendar
      </p>
      <p className="text-slate-400">
        Abra seu calendário para criar eventos rapidamente.
      </p>
      <button
        onClick={() => window.open("https://calendar.google.com", "_blank")}
        className="rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950 shadow-lg shadow-sky-900/30 hover:bg-sky-400"
      >
        Abrir Calendar
      </button>
    </div>
  );
}

