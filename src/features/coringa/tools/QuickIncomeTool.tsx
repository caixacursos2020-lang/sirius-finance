import { useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useFinance } from "../../../contexts/FinanceContext";
import { useCategories } from "../../../contexts/CategoriesContext";
import { formatCurrency } from "../../../utils/formatters";

export default function QuickIncomeTool() {
  const { addIncome } = useFinance();
  const { incomeCategories = [] } = useCategories() as any; // se existir no context

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [source, setSource] = useState("");
  const [category, setCategory] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useMemo(() => {
    if (!category && incomeCategories.length > 0) {
      setCategory(incomeCategories[0].name ?? incomeCategories[0].id);
    }
  }, [incomeCategories, category]);

  const parseNumber = (val: string) => {
    let s = val.replace(/R\$\s?/gi, "").trim();
    const hasComma = s.includes(",");
    const hasDot = s.includes(".");
    if (hasComma && hasDot) s = s.replace(/\./g, "").replace(",", ".");
    else if (hasComma) s = s.replace(",", ".");
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };

  const handleSave = async () => {
    if (!description.trim()) {
      setFeedback("Descreva a entrada.");
      return;
    }
    const value = parseNumber(amount);
    if (value <= 0) {
      setFeedback("Valor inválido.");
      return;
    }
    setSaving(true);
    setFeedback(null);
    const { error } = await addIncome({
      date,
      description,
      amount: Math.abs(value),
      source: source || category || "Entrada",
    } as any);
    setSaving(false);
    if (error) setFeedback(error);
    else {
      setFeedback("Entrada salva!");
      setDescription("");
      setAmount("");
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 text-sm text-slate-100">
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold">Entrada rápida</p>
        {feedback && <span className="text-[11px] text-emerald-300">{feedback}</span>}
      </div>

      <input
        className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 focus:border-emerald-500 outline-none"
        placeholder="Descrição"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <input
        className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 focus:border-emerald-500 outline-none"
        placeholder="Valor (R$)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-slate-400">Data</label>
        <label className="text-xs text-slate-400">Fonte</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 focus:border-emerald-500 outline-none col-span-1"
        />
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Salário, investimento..."
          className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 focus:border-emerald-500 outline-none col-span-1"
        />
      </div>

      <div className="grid grid-cols-1 gap-2">
        <label className="text-xs text-slate-400">Categoria</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 focus:border-emerald-500 outline-none"
        >
          {(incomeCategories.length > 0 ? incomeCategories : [{ id: "income", name: "Entrada" }]).map(
            (c: any) => (
              <option key={c.id ?? c.name} value={c.name ?? c.id}>
                {c.name ?? c.id}
              </option>
            )
          )}
        </select>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 font-semibold text-slate-950 shadow-lg shadow-emerald-900/30 hover:bg-emerald-400 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={16} />}
        Salvar entrada
      </button>

      {amount && (
        <p className="text-[11px] text-slate-400">
          Prévia: {formatCurrency(Math.abs(parseNumber(amount)))}
        </p>
      )}
    </div>
  );
}
