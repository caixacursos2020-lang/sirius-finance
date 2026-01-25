import { useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useFinance } from "../../../contexts/FinanceContext";
import { useCategories } from "../../../contexts/CategoriesContext";
import { formatCurrency } from "../../../utils/formatters";

export default function QuickExpenseTool() {
  const { addExpense, getActivePaymentMethods } = useFinance();
  const { categories } = useCategories();
  const paymentMethods = getActivePaymentMethods();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState<string>("");
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [status, setStatus] = useState<"paga" | "pendente">("paga");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useMemo(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
    if (!paymentMethodId && paymentMethods.length > 0) {
      setPaymentMethodId(paymentMethods[0].id);
    }
  }, [categories, categoryId, paymentMethods, paymentMethodId]);

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
      setFeedback("Descreva a saída.");
      return;
    }
    const value = parseNumber(amount);
    if (value <= 0) {
      setFeedback("Valor inválido.");
      return;
    }
    if (!categoryId) {
      setFeedback("Escolha uma categoria.");
      return;
    }
    setSaving(true);
    setFeedback(null);
    const { error } = await addExpense({
      date,
      description,
      amount: -Math.abs(value),
      category: categories.find((c) => c.id === categoryId)?.name ?? "Saída",
      categoryId,
      paymentMethodId,
      status,
      isFixed: false,
      isRecurring: false,
    });
    setSaving(false);
    if (error) {
      setFeedback(error);
    } else {
      setFeedback("Saída salva!");
      setDescription("");
      setAmount("");
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 text-sm text-slate-100">
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold">Saída rápida</p>
        {feedback && (
          <span className="text-[11px] text-emerald-300">{feedback}</span>
        )}
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
        <label className="text-xs text-slate-400">Status</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 focus:border-emerald-500 outline-none col-span-1"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 focus:border-emerald-500 outline-none col-span-1"
        >
          <option value="paga">Paga</option>
          <option value="pendente">Pendente</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-2">
        <label className="text-xs text-slate-400">Categoria</label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 focus:border-emerald-500 outline-none"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <label className="text-xs text-slate-400">Forma de pagamento</label>
        <select
          value={paymentMethodId ?? ""}
          onChange={(e) => setPaymentMethodId(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 focus:border-emerald-500 outline-none"
        >
          {paymentMethods.map((pm) => (
            <option key={pm.id} value={pm.id}>
              {pm.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-rose-500 px-4 py-2 font-semibold text-slate-950 shadow-lg shadow-rose-900/30 hover:bg-rose-400 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={16} />}
        Salvar saída
      </button>

      {amount && (
        <p className="text-[11px] text-slate-400">
          Prévia: {formatCurrency(-Math.abs(parseNumber(amount)))}
        </p>
      )}
    </div>
  );
}
