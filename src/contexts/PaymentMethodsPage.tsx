import { useState } from "react";
import { useFinance, type PaymentMethod, type PaymentMethodType } from "../contexts/FinanceContext";

const PAYMENT_TYPES: { value: PaymentMethodType; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "Pix" },
  { value: "debito", label: "Débito" },
  { value: "credito", label: "Crédito" },
  { value: "outro", label: "Outro" },
];

export default function PaymentMethodsPage() {
  const {
    paymentMethods,
    addPaymentMethod,
    updatePaymentMethod,
    archivePaymentMethod,
    restorePaymentMethod,
    deletePaymentMethod,
  } = useFinance();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    type: PaymentMethodType;
    color: string;
    description: string;
  }>({
    name: "",
    type: "credito",
    color: "#6366f1",
    description: "",
  });
  const [message, setMessage] = useState<string | null>(null);

  const handleOpenModal = (method?: PaymentMethod) => {
    if (method) {
      setEditingId(method.id);
      setFormData({
        name: method.name,
        type: method.type,
        color: method.color || "#6366f1",
        description: method.description || "",
      });
    } else {
      setEditingId(null);
      setFormData({
        name: "",
        type: "credito",
        color: "#6366f1",
        description: "",
      });
    }
    setIsModalOpen(true);
    setMessage(null);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      setMessage("O nome é obrigatório.");
      return;
    }

    if (editingId) {
      updatePaymentMethod(editingId, formData);
    } else {
      addPaymentMethod(formData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    const result = deletePaymentMethod(id);
    if (!result.success) {
      alert(result.reason);
    }
  };

  // Ordenar: Ativos primeiro, depois por nome
  const sortedMethods = [...paymentMethods].sort((a, b) => {
    if (a.active === b.active) return a.name.localeCompare(b.name);
    return a.active ? -1 : 1;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Formas de Pagamento</h1>
          <p className="text-sm text-slate-400">Gerencie seus cartões, contas e meios de pagamento.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
        >
          Nova Forma de Pagamento
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedMethods.map((pm) => (
          <div
            key={pm.id}
            className={`relative flex flex-col justify-between rounded-xl border p-4 transition-colors ${
              pm.active
                ? "border-slate-800 bg-slate-900"
                : "border-slate-800/50 bg-slate-900/50 opacity-70"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: pm.color || "#6366f1" }}
                  >
                    {pm.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">{pm.name}</h3>
                    <p className="text-xs text-slate-400 capitalize">{pm.type}</p>
                  </div>
                </div>
                {!pm.active && (
                  <span className="rounded bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-400">
                    Arquivado
                  </span>
                )}
              </div>
              {pm.description && (
                <p className="mt-3 text-sm text-slate-400 line-clamp-2">{pm.description}</p>
              )}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                onClick={() => handleOpenModal(pm)}
                className="text-xs font-medium text-sky-400 hover:text-sky-300"
              >
                Editar
              </button>
              {pm.active ? (
                <button
                  onClick={() => archivePaymentMethod(pm.id)}
                  className="text-xs font-medium text-amber-400 hover:text-amber-300"
                >
                  Arquivar
                </button>
              ) : (
                <button
                  onClick={() => restorePaymentMethod(pm.id)}
                  className="text-xs font-medium text-emerald-400 hover:text-emerald-300"
                >
                  Reativar
                </button>
              )}
              {!pm.active && (
                <button
                  onClick={() => handleDelete(pm.id)}
                  className="text-xs font-medium text-rose-400 hover:text-rose-300 ml-2"
                  title="Excluir permanentemente (apenas se não estiver em uso)"
                >
                  Excluir
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Edição/Criação */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <h2 className="mb-4 text-lg font-semibold text-slate-100">
              {editingId ? "Editar Forma de Pagamento" : "Nova Forma de Pagamento"}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs text-slate-400">Nome</label>
                <input
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Nubank Crédito"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Tipo</label>
                  <select
                    className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as PaymentMethodType })}
                  >
                    {PAYMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">Cor</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      className="h-9 w-12 cursor-pointer rounded border border-slate-800 bg-transparent p-0.5"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />
                    <span className="text-xs text-slate-500">{formData.color}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-slate-400">Descrição (opcional)</label>
                <textarea
                  className="w-full rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {message && <p className="text-xs text-rose-400">{message}</p>}

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
