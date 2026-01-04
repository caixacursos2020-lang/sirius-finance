import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useFinance, type ExpenseStatus } from "../contexts/FinanceContext";
import type { Category } from "../types/finance";
import { useCategories } from "../contexts/CategoriesContext";
import { PaymentMethodSelect } from "../contexts/PaymentMethodSelect";

export default function AddExpensePage() {
  const { addExpense, loadExpenses, loadIncomes, loading } = useFinance();
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
  const [store, setStore] = useState("");
  const [liters, setLiters] = useState("");
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [fuelType, setFuelType] = useState<"comum" | "aditivada">("comum");
  const [sendToPriceResearch, setSendToPriceResearch] = useState(false);

  const [saving, setSaving] = useState(false);

  const initialLoad = useRef(false);

  useEffect(() => {
    if (initialLoad.current) return;
    initialLoad.current = true;
    loadIncomes();
    loadExpenses();
  }, [loadExpenses, loadIncomes]);

  const categoryNames = useMemo(() => categories.map((c) => c.name), [categories]);

  useEffect(() => {
    if (!category && categoryNames.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCategory(categoryNames[0]);
    }
  }, [category, categoryNames]);

  // Autopreenche litros com base em valor total e preço por litro quando for gasolina
  useEffect(() => {
    if (category.toLowerCase() !== "gasolina") return;
    const total = parseFloat(amount.replace(",", "."));
    const ppl = parseFloat(pricePerLiter.replace(",", "."));
    if (!Number.isNaN(total) && total > 0 && !Number.isNaN(ppl) && ppl > 0) {
      const calcLiters = (total / ppl).toFixed(2);
      setLiters(calcLiters);
    }
  }, [amount, pricePerLiter, category]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;

    const value = parseFloat(amount.replace(",", "."));
    const categoryLower = category.toLowerCase();
    const litersValue =
      categoryLower === "gasolina" && liters.trim() ? Number(liters.replace(",", ".")) : 0;
    const pricePerLiterNumber =
      categoryLower === "gasolina" && pricePerLiter.trim()
        ? Number(pricePerLiter.replace(",", "."))
        : undefined;
    const priceByLiter =
      categoryLower === "gasolina"
        ? pricePerLiterNumber ?? (litersValue > 0 ? value / litersValue : value)
        : undefined;
    const fuelStation = store.trim() || undefined;

    if (!description || !amount || Number.isNaN(value) || value <= 0 || !date) {
      alert("Preencha descrição, data e um valor maior que zero.");
      return;
    }

    if (!category) {
      alert("Selecione uma categoria.");
      return;
    }

    setSaving(true);
    const result = await addExpense({
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
      fuelLiters: categoryLower === "gasolina" && litersValue > 0 ? litersValue : undefined,
      fuelPricePerLiter: categoryLower === "gasolina" ? priceByLiter : undefined,
      fuelStation,
      fuelType: categoryLower === "gasolina" ? fuelType : undefined,
    });
    setSaving(false);

    if (result?.error) {
      alert(result.error);
      return;
    }

    if (sendToPriceResearch && categoryLower === "gasolina") {
      const newEntry = {
        id: `${Date.now()}`,
        categoryId: "gasolina",
        subcategoryId: fuelType,
        price: priceByLiter ?? value,
        date,
        store: fuelStation,
      };

      try {
        const raw = localStorage.getItem("sirius-price-research-entries");
        const parsed = raw ? JSON.parse(raw) : [];
        const next = Array.isArray(parsed) ? parsed : [];
        next.unshift(newEntry);
        localStorage.setItem("sirius-price-research-entries", JSON.stringify(next));
      } catch {
        // ignore falha na persistência
      }

      if (fuelStation) {
        try {
          const rawStations = localStorage.getItem("sirius-price-research-establishments");
          const parsedStations: string[] = rawStations ? JSON.parse(rawStations) : [];
          const nextStations = Array.isArray(parsedStations) ? [...parsedStations] : [];
          if (!nextStations.includes(fuelStation)) {
            nextStations.push(fuelStation);
            localStorage.setItem("sirius-price-research-establishments", JSON.stringify(nextStations));
          }
        } catch {
          // ignore
        }
      }
    }

    navigate("/");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        Carregando dados...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Adicionar saída</h1>
        <span className="text-xs text-slate-500">Saídas ficam salvas localmente (localStorage)</span>
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

          {category.toLowerCase() === "gasolina" && (
            <div className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <label className="block text-sm font-medium">Litros abastecidos</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                    value={liters}
                    onChange={(e) => setLiters(e.target.value)}
                    placeholder="Ex.: 40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium">Preço por litro (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                    value={pricePerLiter}
                    onChange={(e) => setPricePerLiter(e.target.value)}
                    placeholder="Ex.: 5,89"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium">Tipo de gasolina</label>
                  <select
                    className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value as "comum" | "aditivada")}
                  >
                    <option value="comum">Comum</option>
                    <option value="aditivada">Aditivada</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="block text-sm font-medium">Posto / Estabelecimento</label>
                  <input
                    type="text"
                    className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                    value={store}
                    onChange={(e) => setStore(e.target.value)}
                    placeholder="Nome do posto"
                  />
                </div>
              </div>
              <div>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={sendToPriceResearch}
                    onChange={(e) => setSendToPriceResearch(e.target.checked)}
                  />
                  Enviar preço por litro para Pesquisa de preços
                </label>
                <p className="text-xs text-slate-500 mt-1">
                  Registra o valor por litro em Gasolina &gt; Comum ou Aditivada e reaproveita o posto se já existir na pesquisa.
                </p>
              </div>
            </div>
          )}
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
              Data de vencimento <span className="text-xs text-slate-500">(para contas fixas; em gastos avulsos pode ser a mesma da saída)</span>
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
              <label className="block text-sm font-medium">Dia do vencimento todo mês (1-31)</label>
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
          disabled={saving}
          className="w-full rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-medium disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar saída"}
        </button>
      </form>
    </div>
  );
}
