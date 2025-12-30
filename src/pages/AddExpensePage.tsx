import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  useFinance,
  type ExpenseStatus,
} from "../contexts/FinanceContext";
import type { Category } from "../types/finance";
import { useCategories } from "../contexts/CategoriesContext";
import { PaymentMethodSelect } from "../contexts/PaymentMethodSelect";

export default function AddExpensePage() {
  const { addExpense } = useFinance();
  const navigate = useNavigate();
  const { categories } = useCategories();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("");
  const [type, setType] = useState<"fixa" | "avulsa">("avulsa");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<ExpenseStatus>("pendente");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceDay, setRecurrenceDay] = useState<number | "">("");
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);

  const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);

  useEffect(() => {
    if (!category && categoryNames.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategory(categoryNames[0]);
    }
  }, [category, categoryNames]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const value = parseFloat(amount.replace(",", "."));

    if (!description || !amount || Number.isNaN(value) || value <= 0 || !date) {
      alert("Preencha descrição, data e um valor maior que zero.");
      return;
    }

    if (!category) {
      alert("Selecione uma categoria.");
      return;
    }

    addExpense({
      date,
      description,
      amount: value,
      category,
      paymentMethodId,
      isFixed: type === "fixa",
      isRecurring,
      dueDate,
      recurrenceDay: isRecurring && recurrenceDay !== "" ? Number(recurrenceDay) : undefined,
      status,
    });

    navigate("/");
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Adicionar saída</h1>
        <span className="text-xs text-slate-500">
          Saídas ficam salvas localmente (localStorage)
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <h2 className="text-lg font-semibold">Identificação da saída</h2>
          <div className="space-y-1">
            <label className="block text-sm font-medium">Descrição da saída</label>
            <input
              type="text"
              className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Mercado do mês, gasolina, presente..."
            />
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium">Categoria</label>
            {categoryNames.length ? (
              <select
                className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
              >
                {categoryNames.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-amber-400">
                Nenhuma categoria cadastrada. Vá até o menu Categorias para criar pelo menos uma.
              </p>
            )}
          </div>
          <PaymentMethodSelect value={paymentMethodId} onChange={setPaymentMethodId} />
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <h2 className="text-lg font-semibold">Valores e datas</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="block text-sm font-medium">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium">Data da saída</label>
              <input
                type="date"
                className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <h2 className="text-lg font-semibold">Tipo de saída</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="avulsa"
                checked={type === "avulsa"}
                onChange={() => setType("avulsa")}
              />
              Gasto avulso
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="fixa"
                checked={type === "fixa"}
                onChange={() => setType("fixa")}
              />
              Conta fixa mensal
            </label>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium">
              Data de vencimento{" "}
              <span className="text-xs text-slate-500">
                (para contas fixas; em gastos avulsos pode ser a mesma da saída)
              </span>
            </label>
            <input
              type="date"
              className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <h2 className="text-lg font-semibold">Status</h2>
          <div className="space-y-1">
            <label className="block text-sm font-medium">Situação da conta</label>
            <select
              className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as ExpenseStatus)}
            >
              <option value="pendente">Pendente</option>
              <option value="paga">Paga</option>
            </select>
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <h2 className="text-lg font-semibold">Recorrência</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
            />
            Repetir todo mês
          </label>

          {isRecurring && (
            <div className="space-y-1">
              <label className="block text-sm font-medium">
                Dia do vencimento todo mês (1–31)
              </label>
              <input
                type="number"
                min={1}
                max={31}
                className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                value={recurrenceDay}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setRecurrenceDay(Number.isNaN(v) ? "" : v);
                }}
                placeholder="Dia do vencimento (1-31)"
              />
            </div>
          )}
        </section>

        <button
          type="submit"
          className="w-full rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-medium"
        >
          Salvar saída
        </button>
      </form>
    </div>
  );
}
