import { useMemo, useState } from "react";
import { useCategories } from "../contexts/CategoriesContext";
import { useFinance } from "../contexts/FinanceContext";

export default function CategoriesPage() {
  const { categories, addCategory, deleteCategory, updateCategory } = useCategories();
  const { expenses } = useFinance();

  const [name, setName] = useState("");
  const [color, setColor] = useState("#22c55e");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingColor, setEditingColor] = useState("#22c55e");

  const hasExpensesByCategory = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e) => {
      map.set(e.category, (map.get(e.category) || 0) + 1);
    });
    return map;
  }, [expenses]);

  const handleAdd = () => {
    if (!name.trim()) {
      alert("Informe um nome para a categoria.");
      return;
    }
    addCategory(name.trim(), color);
    setName("");
    setColor("#22c55e");
  };

  const handleDelete = (id: string, catName: string) => {
    if ((hasExpensesByCategory.get(catName) || 0) > 0) {
      alert("Não é possível excluir: existem saídas usando esta categoria.");
      return;
    }
    deleteCategory(id);
    if (editingId === id) {
      setEditingId(null);
    }
  };

  const startEdit = (id: string, catName: string, catColor: string) => {
    setEditingId(id);
    setEditingName(catName);
    setEditingColor(catColor);
  };

  const saveEdit = () => {
    if (!editingId) return;
    if (!editingName.trim()) {
      alert("Informe um nome para a categoria.");
      return;
    }
    updateCategory(editingId, { name: editingName.trim(), color: editingColor });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categorias</h1>
          <p className="text-sm text-slate-400">
            Crie, edite ou remova categorias usadas nas saídas.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {!categories.length && (
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-400">
              Nenhuma categoria cadastrada.
            </div>
          )}
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className="h-3 w-3 rounded-full border border-slate-700"
                  style={{ background: cat.color }}
                />
                {editingId === cat.id ? (
                  <div className="flex flex-col gap-2">
                    <input
                      className="rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                    />
                    <input
                      type="color"
                      className="h-10 w-16 rounded-md border border-slate-800 bg-slate-950"
                      value={editingColor}
                      onChange={(e) => setEditingColor(e.target.value)}
                    />
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{cat.name}</p>
                    <p className="text-xs text-slate-500">
                      {cat.isDefault ? "Padrão" : "Personalizada"}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {editingId === cat.id ? (
                  <>
                    <button
                      className="rounded-md border border-emerald-600 px-3 py-1 text-sm text-emerald-300 hover:bg-emerald-600/10"
                      onClick={saveEdit}
                    >
                      Salvar
                    </button>
                    <button
                      className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
                      onClick={() => setEditingId(null)}
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="rounded-md border border-slate-700 px-3 py-1 text-sm text-slate-200 hover:border-emerald-500 hover:text-emerald-300"
                      onClick={() => startEdit(cat.id, cat.name, cat.color)}
                    >
                      Editar
                    </button>
                    <button
                      className="rounded-md border border-rose-600 px-3 py-1 text-sm text-rose-300 hover:bg-rose-600/10"
                      onClick={() => handleDelete(cat.id, cat.name)}
                    >
                      Excluir
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
          <h2 className="text-lg font-semibold">Nova categoria</h2>
          <div className="space-y-1">
            <label className="block text-sm font-medium">Nome</label>
            <input
              className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Viagem, Lazer..."
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium">Cor</label>
            <input
              type="color"
              className="h-10 w-16 rounded-md border border-slate-800 bg-slate-950"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
          <button
            className="w-full rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-sm font-medium"
            onClick={handleAdd}
            type="button"
          >
            Adicionar categoria
          </button>
        </div>
      </div>
    </div>
  );
}
