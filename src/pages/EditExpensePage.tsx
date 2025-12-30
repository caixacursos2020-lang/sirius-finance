import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useFinance,
  type ExpenseStatus,
} from "../contexts/FinanceContext";
import type { Category } from "../types/finance";
import { useCategories } from "../contexts/CategoriesContext";
import { PaymentMethodSelect } from "../contexts/PaymentMethodSelect";

export default function EditExpensePage() {
  const { id } = useParams<{ id: string }>();
  const { expenses, updateExpense } = useFinance();
  const { categories } = useCategories();
  const navigate = useNavigate();

  const expense = expenses.find((e) => e.id === id);
  const [date, setDate] = useState(expense?.date || new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState(expense?.description || "");
  const [amount, setAmount] = useState(
    expense ? String(expense.amount) : ""
  );
  const [category, setCategory] = useState<Category>(expense?.category || "");
  const [type, setType] = useState<"fixa" | "avulsa">(
    expense?.isFixed ? "fixa" : "avulsa"
  );
  const [dueDate, setDueDate] = useState(expense?.dueDate || new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<ExpenseStatus>(expense?.status || "pendente");
  const [isRecurring, setIsRecurring] = useState(expense?.isRecurring || false);
  const [recurrenceDay, setRecurrenceDay] = useState<number | "">(
    expense?.recurrenceDay ?? ""
  );
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(expense?.paymentMethodId ?? null);

  const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);

  useEffect(() => {
    if (!category && categoryNames.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategory(categoryNames[0]);
    }
  }, [category, categoryNames]);

  if (!expense) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        SaÃ­da nÃ£o encontrada.
      </div>
    );
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const value = parseFloat(amount.replace(",", "."));

    if (!description || !amount || Number.isNaN(value) || value <= 0 || !date) {
      alert("Preencha descriÃ§Ã£o, data e um valor maior que zero.");
      return;
    }

    if (!category) {
      alert("Selecione uma categoria.");
      return;
    }

    updateExpense(expense.id, {
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
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Editar saÃ­da</h1>
        <span className="text-xs text-slate-500">
          EdiÃ§Ã£o salva localmente (localStorage)
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <h2 className="text-lg font-semibold">IdentificaÃ§Ã£o da saÃ­da</h2>
          <div className="space-y-1">
            <label className="block text-sm font-medium">DescriÃ§Ã£o da saÃ­da</label>
            <input
              type="text"
              className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Mercado do mÃªs, gasolina, presente..."
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
                Nenhuma categoria cadastrada. VÃ¡ atÃ© o menu Categorias para criar pelo menos uma.
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
              <label className="block text-sm font-medium">Data da saÃ­da</label>
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
          <h2 className="text-lg font-semibold">Tipo de saÃ­da</h2>
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
                (para contas fixas; em gastos avulsos pode ser a mesma da saÃ­da)
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
            <label className="block text-sm font-medium">SituaÃ§Ã£o da conta</label>
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
          <h2 className="text-lg font-semibold">RecorrÃªncia</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
            />
            Repetir todo mÃªs
          </label>

          {isRecurring && (
            <div className="space-y-1">
              <label className="block text-sm font-medium">
                Dia do vencimento todo mÃªs (1â€“31)
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
          Salvar alteraÃ§Ãµes
        </button>
      </form>
    </div>
  );
}


