import { useState } from "react";
import { Calculator, X } from "lucide-react";
import { formatCurrency } from "../../../utils/formatters";

type Props = {
  onClose: () => void;
};

export default function CalculatorWidget({ onClose }: Props) {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const evaluate = () => {
    try {
      // Avalia usando Function para suportar + - * / ( ) .
      // Não expõe nada além de Math.
      // eslint-disable-next-line no-new-func
      const fn = new Function(`return (${expression.replace(/,/g, ".")})`);
      const val = fn();
      if (typeof val === "number" && Number.isFinite(val)) {
        setResult(formatCurrency(val));
        setError(null);
      } else {
        setResult(null);
        setError("Expressão inválida");
      }
    } catch {
      setResult(null);
      setError("Expressão inválida");
    }
  };

  return (
    <div className="flex h-full w-full flex-col gap-3">
      <div className="flex items-center justify-between text-slate-100">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-emerald-400" />
          <span className="text-sm font-semibold">Calculadora</span>
        </div>
        <button
          className="text-slate-400 hover:text-slate-100"
          onClick={onClose}
          aria-label="Fechar calculadora"
        >
          <X size={14} />
        </button>
      </div>

      <input
        value={expression}
        onChange={(e) => setExpression(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") evaluate();
        }}
        placeholder="Ex.: (1200 - 340) * 1.2"
        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={evaluate}
          className="rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-slate-900 hover:bg-emerald-500"
        >
          Calcular
        </button>
        <button
          onClick={() => {
            setExpression("");
            setResult(null);
            setError(null);
          }}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-sm text-slate-200 hover:border-emerald-400"
        >
          Limpar
        </button>
      </div>

      {result && (
        <div className="rounded-lg border border-emerald-600/50 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100">
          Resultado: {result}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-rose-600/50 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-100">
          {error}
        </div>
      )}
    </div>
  );
}

