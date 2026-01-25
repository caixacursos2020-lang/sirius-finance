import { useEffect, useMemo, useState } from "react";
import { CreditCard, Loader2, CheckCircle2 } from "lucide-react";
import { useFinance } from "../../../contexts/FinanceContext";
import { useCategories } from "../../../contexts/CategoriesContext";

export default function DebitCardExpenseTool() {
  const { addExpense, getActivePaymentMethods } = useFinance();
  const { categories } = useCategories();
  const paymentMethods = getActivePaymentMethods();

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState<string>("");
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentMethodId) {
      const debit = paymentMethods.find((pm) => pm.type === "debito");
      setPaymentMethodId(debit?.id ?? paymentMethods[0]?.id ?? null);
    }
  }, [paymentMethods, paymentMethodId]);

  useMemo(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

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
    const value = parseNumber(amount);
    if (!description.trim() || value <= 0 || !categoryId) {
      setFeedback("Preencha descrição, valor e categoria.");
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
      status: "paga",
      receiptStore: "Cartão de débito",
      isFixed: false,
      isRecurring: false,
    });
    setSaving(false);
    setFeedback(error ?? "Pago no débito registrado!");
    if (!error) {
      setDescription("");
      setAmount("");
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 text-sm text-slate-100">
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-sky-400" />
          Pagamento débito
        </p>
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
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-slate-400">Data</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 focus:border-emerald-500 outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-slate-400">Forma</span>
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
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-slate-400">Categoria</span>
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
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-sky-500 px-4 py-2 font-semibold text-slate-950 shadow-lg shadow-sky-900/30 hover:bg-sky-400 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={16} />}
        Registrar débito
      </button>
    </div>
  );
}
