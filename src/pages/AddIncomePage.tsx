import { useState, type FormEvent, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useFinance } from "../contexts/FinanceContext";
import { useIncomeSources } from "../contexts/IncomeSourcesContext";

export default function AddIncomePage() {
  const { addIncome } = useFinance();
  const { sources } = useIncomeSources();
  const navigate = useNavigate();

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");

  const sourceNames = useMemo(() => sources.map((s) => s.name), [sources]);

  useEffect(() => {
    if (!source && sourceNames.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSource(sourceNames[0]);
    }
  }, [source, sourceNames]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount.replace(",", "."));
    if (!description || !amount || Number.isNaN(value) || value <= 0 || !date) {
      alert("Preencha descrição, data e um valor maior que zero.");
      return;
    }
    if (!source) {
      alert("Selecione uma fonte.");
      return;
    }

    addIncome({
      date,
      description,
      amount: value,
      source,
    });

    navigate("/");
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Adicionar entrada</h1>
        <span className="text-xs text-slate-500">
          Entradas ficam salvas localmente (localStorage)
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <h2 className="text-lg font-semibold">Dados da entrada</h2>
          <div className="space-y-1">
            <label className="block text-sm font-medium">Descrição</label>
            <input
              type="text"
              className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Salário, venda..."
            />
          </div>

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
              <label className="block text-sm font-medium">Data da entrada</label>
              <input
                type="date"
                className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium">Fonte</label>
            {sourceNames.length ? (
              <select
                className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                value={source}
                onChange={(e) => setSource(e.target.value)}
              >
                {sourceNames.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-amber-400">
                Nenhuma fonte cadastrada. Crie uma fonte em “Fontes de entrada”.
              </p>
            )}
          </div>
        </section>

        <button
          type="submit"
          className="w-full rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-medium"
        >
          Salvar entrada
        </button>
      </form>
    </div>
  );
}
