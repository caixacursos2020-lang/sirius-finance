import { useState } from "react";
import { Calculator, Equal, Loader2 } from "lucide-react";

export default function CalculatorTool() {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const evaluate = () => {
    try {
      setBusy(true);
      // eslint-disable-next-line no-new-func
      const fn = new Function(`return (${expression.replace(/,/g, ".")})`);
      const val = fn();
      if (typeof val === "number" && Number.isFinite(val)) {
        setResult(val.toString());
        setError("");
      } else {
        setError("Expressão inválida");
        setResult("");
      }
    } catch {
      setError("Expressão inválida");
      setResult("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 text-sm text-slate-100">
      <div className="flex items-center gap-2 text-base font-semibold">
        <Calculator className="h-4 w-4 text-emerald-400" />
        Calculadora
      </div>
      <input
        value={expression}
        onChange={(e) => setExpression(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && evaluate()}
        placeholder="(1200 - 340) * 1.2"
        className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 outline-none focus:border-emerald-500"
      />
      <button
        onClick={evaluate}
        disabled={busy}
        className="inline-flex w-fit items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-900/30 hover:bg-emerald-400 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Equal size={14} />}
        Calcular
      </button>
      {result && (
        <div className="rounded-lg border border-emerald-600/40 bg-emerald-500/10 px-3 py-2 text-sm font-bold text-emerald-100">
          {result}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-600/40 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100">
          {error}
        </div>
      )}
    </div>
  );
}

