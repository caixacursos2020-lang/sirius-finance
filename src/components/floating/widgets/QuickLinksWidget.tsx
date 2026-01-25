import { ExternalLink, X, Calendar as CalendarIcon } from "lucide-react";

type Props = {
  onClose: () => void;
};

const links = [
  { label: "Google Calendar", url: "https://calendar.google.com", icon: <CalendarIcon className="h-4 w-4" /> },
  { label: "Docs", url: "https://docs.google.com", icon: <ExternalLink className="h-4 w-4" /> },
  { label: "Sheets", url: "https://sheets.google.com", icon: <ExternalLink className="h-4 w-4" /> },
];

export default function QuickLinksWidget({ onClose }: Props) {
  return (
    <div className="flex h-full w-full flex-col gap-3">
      <div className="flex items-center justify-between text-slate-100">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-sky-400" />
          <span className="text-sm font-semibold">Atalhos</span>
        </div>
        <button
          className="text-slate-400 hover:text-slate-100"
          onClick={onClose}
          aria-label="Fechar atalhos"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-2">
        {links.map((link) => (
          <button
            key={link.url}
            onClick={() => window.open(link.url, "_blank")}
            className="flex w-full items-center justify-between rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 hover:border-emerald-400 hover:bg-slate-800"
          >
            <span className="flex items-center gap-2">
              {link.icon}
              {link.label}
            </span>
            <ExternalLink className="h-4 w-4 text-slate-400" />
          </button>
        ))}
      </div>
    </div>
  );
}

