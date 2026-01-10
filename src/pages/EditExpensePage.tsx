import { useState, useEffect, useMemo, FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Tag, CheckCircle2, Store, X, CreditCard, Banknote, Smartphone, Wallet, AlertCircle, RefreshCw, Settings, ArrowLeft, FileText } from "lucide-react";

import { useFinance } from "../contexts/FinanceContext";
import { useCategories } from "../contexts/CategoriesContext";

const TITLE_SHADOW = {
  textShadow: "0 3px 10px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.75), 0 0 18px rgba(0,0,0,0.6)",
};

export default function EditExpensePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { expenses, updateExpense, paymentMethods, loadPaymentMethods } = useFinance();
  const { categories } = useCategories();

  const expense = useMemo(() => expenses.find(e => e.id === id), [expenses, id]);

  useEffect(() => {
    if (loadPaymentMethods) {
        loadPaymentMethods();
    }
  }, [loadPaymentMethods]);

  const activePaymentMethods = useMemo(() => {
    return paymentMethods.filter(pm => pm.active !== false);
  }, [paymentMethods]);

  // Estados do formulário, inicializados com os dados da despesa
  const [date, setDate] = useState<string>(expense?.date || "");
  const [description, setDescription] = useState<string>(expense?.description || "");
  const [categoryId, setCategoryId] = useState<string>(expense?.categoryId || categories[0]?.id || "");
  const [amountInput, setAmountInput] = useState<string>(expense?.amount ? Math.abs(expense.amount).toString() : "");
  const [store, setStore] = useState<string>(expense?.receiptStore || "");
  const [isFixed, setIsFixed] = useState<boolean>(expense?.isFixed || false);
  const [isRecurring, setIsRecurring] = useState<boolean>(expense?.isRecurring || false);
  const [recurrenceDay, setRecurrenceDay] = useState<string>(expense?.recurrenceDay?.toString() || "");
  const [status, setStatus] = useState<"paga" | "pendente">(expense?.status || "pendente");
  const [observation, setObservation] = useState<string>(expense?.observation || "");
  
  // Estado da Forma de Pagamento
  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(expense?.paymentMethodId || null);

  // Campos de combustível
  const [fuelLiters, setFuelLiters] = useState<string>(expense?.fuelLiters?.toString() || "");
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState<string>(expense?.fuelPricePerLiter?.toString() || "");
  const [fuelStation, setFuelStation] = useState<string>(expense?.fuelStation || "");
  const [fuelType, setFuelType] = useState<string>(expense?.fuelType || "");

  // Lista de estabelecimentos para sugestão
  const [establishments, setEstablishments] = useState<string[]>([]);

  useEffect(() => {
    const savedEst = localStorage.getItem("sirius-price-research-establishments");
    if (savedEst) {
      try {
        setEstablishments(JSON.parse(savedEst));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  const selectedCategory = useMemo(() => categories.find((c) => c.id === categoryId) ?? null, [categories, categoryId]);

  const isFuelCategory = selectedCategory?.name.toLowerCase() === "gasolina" || selectedCategory?.name.toLowerCase() === "combustível";

  function parseNumber(input: string): number {
    if (!input) return 0;
    const normalized = input.replace(/\./g, "").replace(",", ".");
    return Number(normalized);
  }

  // --- CÁLCULO AUTOMÁTICO DE COMBUSTÍVEL NA EDIÇÃO ---
  useEffect(() => {
    if (!isFuelCategory) return;
    const totalValue = parseNumber(amountInput);
    const price = parseNumber(fuelPricePerLiter);
    if (totalValue > 0 && price > 0) {
      const calculatedLiters = totalValue / price;
      // Evita loop infinito de renderização se o valor for o mesmo
      const currentLiters = parseNumber(fuelLiters);
      if (Math.abs(calculatedLiters - currentLiters) > 0.01) {
         setFuelLiters(calculatedLiters.toFixed(3).replace(".", ","));
      }
    }
  }, [amountInput, fuelPricePerLiter, isFuelCategory]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id || !expense) return;

    const value = parseNumber(amountInput);

    if (!description.trim()) { alert("Preencha a descrição."); return; }
    if (!selectedCategory) { alert("Selecione uma categoria."); return; }
    if (!value || isNaN(value)) { alert("Preencha um valor válido."); return; }

    const finalStore = isFuelCategory ? fuelStation : store;

    const baseData: any = {
      date,
      description: description.trim(),
      category: selectedCategory!.name,
      categoryId: selectedCategory!.id,
      amount: -Math.abs(value),
      isFixed,
      isRecurring,
      recurrenceDay: isRecurring && recurrenceDay ? Number(recurrenceDay) : undefined,
      status,
      paymentMethodId: paymentMethodId ?? null,
      receiptStore: finalStore || undefined,
      observation: observation.trim()
    };

    if (isFuelCategory) {
      const liters = parseNumber(fuelLiters);
      const pricePerLiter = parseNumber(fuelPricePerLiter);
      if (liters > 0) baseData.fuelLiters = liters;
      if (pricePerLiter > 0) baseData.fuelPricePerLiter = pricePerLiter;
      if (fuelStation.trim()) baseData.fuelStation = fuelStation.trim();
      if (fuelType) baseData.fuelType = fuelType;
    } else {
        // Limpa dados de combustível se mudou a categoria
        baseData.fuelLiters = null;
        baseData.fuelPricePerLiter = null;
        baseData.fuelStation = null;
        baseData.fuelType = null;
    }

    updateExpense(id, baseData);
    navigate("/saidas");
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'dinheiro': return <Banknote size={16} />;
      case 'pix': return <Smartphone size={16} />;
      case 'debito': return <CreditCard size={16} />;
      case 'credito': return <CreditCard size={16} />;
      default: return <Wallet size={16} />;
    }
  };

  const handleRefresh = () => {
    if (loadPaymentMethods) loadPaymentMethods();
  };

  if (!expense) {
      return (
          <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-slate-400 animate-pulse">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
              <p className="font-medium">Carregando despesa...</p>
          </div>
      );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate("/saidas")} className="p-2 rounded-lg border border-slate-800 hover:bg-slate-900 transition-colors text-slate-400">
            <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-slate-100" style={TITLE_SHADOW}>Editar saída</h1>
          <p className="text-sm text-slate-400">Altere os dados do lançamento.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-slate-800 bg-slate-900 p-6">
        
        {/* Dados Básicos */}
        <div className="grid gap-4 md:grid-cols-[140px,1.5fr,1fr]">
          <div>
            <label className="block text-xs font-medium text-slate-300">Data</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">Descrição</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Mercado, Almoço..." className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">Valor (R$)</label>
            <input type="text" value={amountInput} onChange={(e) => setAmountInput(e.target.value)} placeholder="0,00" className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none" />
          </div>
        </div>

        {/* Local e Categoria */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-300">Local / Loja</label>
            <div className="relative mt-1">
              <input type="text" list="store-suggestions" value={store} onChange={(e) => setStore(e.target.value)} placeholder="Onde foi?" className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 pl-8 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none" />
              <Store size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
              <datalist id="store-suggestions">{establishments.map((est) => <option key={est} value={est} />)}</datalist>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">Categoria</label>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none">
              {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
        </div>

        {/* --- SELETOR DE PAGAMENTO --- */}
        <div className="animate-in fade-in slide-in-from-left-2 duration-500">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-medium text-slate-300">Forma de Pagamento</label>
            {activePaymentMethods.length === 0 && (
                <button 
                  type="button" 
                  onClick={handleRefresh} 
                  className="flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                    <RefreshCw size={12} /> Tentar recarregar
                </button>
            )}
          </div>
          
          {activePaymentMethods.length === 0 ? (
            <div className="flex flex-col gap-2">
                <div className="p-3 border border-rose-900/50 bg-rose-950/20 rounded-lg flex items-center gap-3 text-rose-300">
                    <AlertCircle size={18} />
                    <span className="text-xs">Nenhuma forma de pagamento encontrada.</span>
                </div>
                <button 
                    type="button"
                    onClick={() => navigate("/configuracoes/pagamentos")}
                    className="flex items-center justify-center gap-2 p-3 rounded-lg border border-dashed border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all text-xs"
                >
                    <Settings size={14} />
                    Ir para Configurações e cadastrar pagamentos
                </button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
                {activePaymentMethods.map((pm) => {
                const isSelected = paymentMethodId === pm.id;
                return (
                    <button
                    key={pm.id}
                    type="button"
                    onClick={() => setPaymentMethodId(pm.id)}
                    className={`group relative flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-all duration-200 ${
                        isSelected
                        ? "border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.15)] translate-y-[-1px]"
                        : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600 hover:bg-slate-900"
                    }`}
                    >
                    <div 
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm transition-transform ${isSelected ? "scale-110" : "opacity-80 group-hover:scale-105"}`}
                        style={{ backgroundColor: pm.color || "#64748b" }}
                    >
                        {getIcon(pm.type)}
                    </div>
                    <div className="flex flex-col items-start pr-1">
                        <span className={`text-xs font-bold leading-tight ${isSelected ? "text-white" : "text-slate-300"}`}>{pm.name}</span>
                        <span className="text-[9px] opacity-60 uppercase tracking-wider">{pm.type}</span>
                    </div>
                    {isSelected && (
                        <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-black rounded-full p-0.5 border-2 border-slate-950">
                            <CheckCircle2 size={10} strokeWidth={4} />
                        </div>
                    )}
                    </button>
                );
                })}
                {paymentMethodId && (
                    <button 
                        type="button" 
                        onClick={() => setPaymentMethodId(null)}
                        className="flex items-center justify-center w-8 h-full rounded-lg border border-dashed border-slate-700 text-slate-500 hover:text-rose-400 hover:border-rose-400/50 hover:bg-rose-950/20 transition-all"
                        title="Limpar seleção"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
          )}
        </div>

        {/* Opções Extras */}
        <div className="grid gap-4 md:grid-cols-3 pt-2">
          <div className="flex items-center gap-2 p-3 rounded-lg border border-slate-800 bg-slate-950/50">
            <input id="isFixed" type="checkbox" checked={isFixed} onChange={(e) => setIsFixed(e.target.checked)} className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500" />
            <label htmlFor="isFixed" className="text-xs font-medium text-slate-200 cursor-pointer select-none">Conta fixa</label>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg border border-slate-800 bg-slate-950/50">
            <input id="isRecurring" type="checkbox" checked={isRecurring} onChange={(e) => setIsRecurring(e.target.checked)} className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500" />
            <label htmlFor="isRecurring" className="text-xs font-medium text-slate-200 cursor-pointer select-none">Recorrente</label>
            {isRecurring && (
              <input type="number" min={1} max={31} value={recurrenceDay} onChange={(e) => setRecurrenceDay(e.target.value)} placeholder="Dia" className="ml-2 w-12 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 text-center" />
            )}
          </div>
          <div>
            <select value={status} onChange={(e) => setStatus(e.target.value as "paga" | "pendente")} className="w-full h-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none">
              <option value="pendente">Pendente</option>
              <option value="paga">Paga</option>
            </select>
          </div>
        </div>

        {/* Campo de Observação (NOVO) */}
        <div>
           <label className="block text-xs font-medium text-slate-300 mb-1">Observação</label>
           <div className="relative">
             <textarea 
               value={observation} 
               onChange={(e) => setObservation(e.target.value)} 
               rows={2} 
               placeholder="Detalhes adicionais..." 
               className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 pl-9 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none resize-none"
             />
             <FileText size={14} className="absolute left-3 top-3 text-slate-500" />
           </div>
        </div>

        {/* Detalhes do Abastecimento (COM CÁLCULO AUTOMÁTICO) */}
        {isFuelCategory && (
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 animate-in slide-in-from-top-2">
            <p className="mb-2 text-xs font-semibold text-slate-200">Detalhes do abastecimento</p>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-slate-300">Litros</label>
                <input type="text" value={fuelLiters} onChange={(e) => setFuelLiters(e.target.value)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 placeholder-slate-600" placeholder="Calc. auto..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">Preço/Litro</label>
                <input type="text" value={fuelPricePerLiter} onChange={(e) => setFuelPricePerLiter(e.target.value)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100" placeholder="Ex: 5,89" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">Tipo</label>
                <select value={fuelType} onChange={(e) => setFuelType(e.target.value)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100">
                  <option value="">Selecione</option>
                  <option value="gasolina_comum">Gasolina comum</option>
                  <option value="gasolina_aditivada">Gasolina aditivada</option>
                  <option value="etanol">Etanol</option>
                  <option value="diesel">Diesel</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">Posto</label>
                <input type="text" value={fuelStation} onChange={(e) => setFuelStation(e.target.value)} className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100" placeholder="Nome do posto"/>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate("/saidas")} className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800">Cancelar</button>
          <button type="submit" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-500">Salvar alterações</button>
        </div>
      </form>
    </div>
  );
}