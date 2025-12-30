import { useState } from "react";
import { useIncomeSources } from "../contexts/IncomeSourcesContext";

export default function IncomeSourcesPage() {
  const { sources, addSource, deleteSource } = useIncomeSources();
  const [name, setName] = useState("");

  const handleAdd = () => {
    if (!name.trim()) {
      alert("Informe um nome para a fonte.");
      return;
    }
    addSource(name.trim());
    setName("");
  };

  const handleDelete = (id: string, isDefault: boolean) => {
    if (isDefault) {
      if (!confirm("Esta é uma fonte padrão. Deseja realmente excluir?")) return;
    }
    deleteSource(id);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Fontes de entrada</h1>
        <p className="text-sm text-slate-400">
          Gerencie as fontes usadas ao registrar entradas.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {!sources.length && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
              Nenhuma fonte cadastrada.
            </div>
          )}
          {sources.map((source) => (
            <div
              key={source.id}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4"
            >
              <div>
                <p className="text-sm font-semibold text-slate-100">{source.name}</p>
                <p className="text-xs text-slate-500">
                  {source.isDefault ? "Padrão" : "Personalizada"}
                </p>
              </div>
              <button
                className="rounded-md border border-rose-600 px-3 py-1 text-sm text-rose-300 hover:bg-rose-600/10"
                onClick={() => handleDelete(source.id, source.isDefault)}
              >
                Excluir
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <h2 className="text-lg font-semibold">Nova fonte</h2>
          <div className="space-y-1">
            <label className="block text-sm font-medium">Nome</label>
            <input
              className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Salário, Vendas..."
            />
          </div>
          <button
            className="w-full rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-medium"
            onClick={handleAdd}
            type="button"
          >
            Adicionar fonte
          </button>
        </div>
      </div>
    </div>
  );
}
