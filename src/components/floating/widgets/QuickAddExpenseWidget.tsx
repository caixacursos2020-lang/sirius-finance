import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useFinance } from "../../../contexts/FinanceContext";
import { useCategories } from "../../../contexts/CategoriesContext";

export default function QuickAddExpenseWidget() {
  const { addExpense, loadExpenses, getActivePaymentMethods } = useFinance();
  const { categories } = useCategories();

  const paymentMethods = getActivePaymentMethods();

  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (!categoryId && categories.length) {
      setCategoryId(categories[0].id);
    }
  }, [categoryId, categories]);

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

    const selectedCategory = categories.find((c) => c.id === categoryId);
    const categoryName = selectedCategory?.name ?? "Outros";

    setLoading(true);
    const result = await addExpense({
      date: today,
      description: description.trim(),
      amount: -Math.abs(parsed),
      category: categoryName,
      categoryId: selectedCategory?.id,
      status: "paga",
      paymentMethodId,
      isFixed: false,
      isRecurring: false,
    });

    if (!result?.error) {
      await loadExpenses();
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
      <div className="flex flex-col items-center justify-center h-full text-rose-400 gap-2">
        <CheckCircle2 size={48} />
        <p className="font-bold">Saída adicionada!</p>
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
          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-xl font-bold text-rose-400 focus:border-rose-500 outline-none"
          placeholder="0,00"
        />
      </div>
      <div>
        <label className="text-xs text-slate-400 uppercase font-bold">Descrição</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:border-rose-500 outline-none"
          placeholder="Ex: Café"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 uppercase font-bold">Categoria</label>
          {categories.length ? (
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:border-rose-500 outline-none"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-amber-400">Cadastre uma categoria.</p>
          )}
        </div>
        <div>
          <label className="text-xs text-slate-400 uppercase font-bold">Forma de pagamento</label>
          <select
            value={paymentMethodId ?? ""}
            onChange={(e) => setPaymentMethodId(e.target.value || null)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-slate-200 focus:border-rose-500 outline-none"
          >
            <option value="">Sem seleção</option>
            {paymentMethods.map((pm) => (
              <option key={pm.id} value={pm.id}>
                {pm.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button
        disabled={loading || !categories.length}
        type="submit"
        className="mt-auto w-full bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
      >
        {loading ? <Loader2 className="animate-spin" /> : "Salvar saída"}
      </button>
    </form>
  );
}
