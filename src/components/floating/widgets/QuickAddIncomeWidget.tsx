import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useFinance } from "../../../contexts/FinanceContext";
import { useIncomeSources } from "../../../contexts/IncomeSourcesContext";

export default function QuickAddIncomeWidget() {
  const { addIncome, loadIncomes } = useFinance();
  const { sources } = useIncomeSources();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (!source && sources.length) {
      setSource(sources[0].name);
    }
  }, [source, sources]);

  const parseAmount = (value: string) => {
    const num = parseFloat(value.replace(",", "."));
    return Number.isFinite(num) ? num : NaN;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    const parsed = parseAmount(amount);
    if (!description.trim() || !amount || Number.isNaN(parsed) || parsed <= 0) {
      alert("Preencha descrição e um valor maior que zero.");
      return;
    }
    if (!source) {
      alert("Selecione uma fonte.");
      return;
    }

    setLoading(true);
    const result = await addIncome({
      date: today,
      description: description.trim(),
      amount: parsed,
      source,
    });
    if (!result?.error) {
      await loadIncomes();
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setAmount("");
        setDescription("");
      }, 1800);
    } else {
      alert(result.error);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-emerald-400 gap-2">
        <CheckCircle2 size={48} />
        <p className="font-bold">Entrada adicionada!</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-4 h-full flex flex-col">
      <div>
        <label className="text-xs text-slate-400 uppercase font-bold">Valor</label>
        <input
          autoFocus
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xl font-bold text-emerald-400 focus:border-emerald-500 outline-none"
          placeholder="0,00"
        />
      </div>
      <div>
        <label className="text-xs text-slate-400 uppercase font-bold">Descrição</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:border-emerald-500 outline-none"
          placeholder="Ex: Freela"
        />
      </div>
      <div>
        <label className="text-xs text-slate-400 uppercase font-bold">Fonte</label>
        {sources.length ? (
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:border-emerald-500 outline-none"
          >
            {sources.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-amber-400">Cadastre uma fonte para salvar entradas.</p>
        )}
      </div>
      <button
        disabled={loading || !sources.length}
        type="submit"
        className="mt-auto w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
      >
        {loading ? <Loader2 className="animate-spin" /> : "Salvar entrada"}
      </button>
    </form>
  );
}
