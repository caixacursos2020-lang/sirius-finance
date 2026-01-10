// src/pages/AddExpensePage.tsx (ou caminho equivalente)
import { useState, useEffect, useMemo, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Tag,
  CheckCircle2,
  Plus,
  Store,
  Save,
  X,
  CreditCard,
  Banknote,
  Smartphone,
  Wallet,
} from "lucide-react";

import { useFinance } from "../contexts/FinanceContext";
import { useCategories } from "../contexts/CategoriesContext";
import { useAuth } from "../contexts/AuthContext";
import { savePriceEntryDualWrite } from "../services/priceResearchDb";

const TITLE_SHADOW = {
  textShadow:
    "0 3px 10px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.75), 0 0 18px rgba(0,0,0,0.6)",
};

type PriceCategory = {
  id: string;
  name: string;
  color?: string;
  subcategories: { id: string; name: string }[];
};

export default function AddExpensePage() {
  const { addExpense, getActivePaymentMethods } = useFinance();
  const { categories } = useCategories();
  const { user } = useAuth();
  const navigate = useNavigate();

  const todayStr = new Date().toISOString().slice(0, 10);

  const paymentMethods = getActivePaymentMethods();

  const [date, setDate] = useState<string>(todayStr);
  const [description, setDescription] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [amountInput, setAmountInput] = useState<string>("");
  const [store, setStore] = useState<string>("");
  const [isFixed, setIsFixed] = useState<boolean>(false);
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [recurrenceDay, setRecurrenceDay] = useState<string>("");
  const [status, setStatus] = useState<"paga" | "pendente">("pendente");

  const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null);

  const [fuelLiters, setFuelLiters] = useState<string>("");
  const [fuelPricePerLiter, setFuelPricePerLiter] = useState<string>("");
  const [fuelStation, setFuelStation] = useState<string>("");
  const [fuelType, setFuelType] = useState<string>("");

  const [priceCategories, setPriceCategories] = useState<PriceCategory[]>([]);
  const [establishments, setEstablishments] = useState<string[]>([]);
  const [enablePriceTracking, setEnablePriceTracking] = useState(false);
  const [priceCatId, setPriceCatId] = useState("");
  const [priceSubId, setPriceSubId] = useState("");
  const [isCreatingPriceCat, setIsCreatingPriceCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newSubName, setNewSubName] = useState("");

  useEffect(() => {
    const savedCats = localStorage.getItem("sirius-price-research-categories");
    if (savedCats) {
      try {
        setPriceCategories(JSON.parse(savedCats));
      } catch {
        //
      }
    }
    const savedEst = localStorage.getItem("sirius-price-research-establishments");
    if (savedEst) {
      try {
        setEstablishments(JSON.parse(savedEst));
      } catch {
        //
      }
    }
  }, []);

  const selectedPriceCategory = useMemo(
    () => priceCategories.find((c) => c.id === priceCatId),
    [priceCategories, priceCatId],
  );

  const handleCreateCategory = () => {
    if (!newCatName || !newSubName) return;
    const newSubId = newSubName.toLowerCase().replace(/\s+/g, "-");
    const newCatId = newCatName.toLowerCase().replace(/\s+/g, "-");
    let updatedCategories = [...priceCategories];
    const existingCatIndex = updatedCategories.findIndex((c) => c.id === newCatId);

    if (existingCatIndex >= 0) {
      updatedCategories[existingCatIndex].subcategories.push({
        id: newSubId,
        name: newSubName,
      });
    } else {
      updatedCategories.push({
        id: newCatId,
        name: newCatName,
        color: "#10b981",
        subcategories: [{ id: newSubId, name: newSubName }],
      });
    }

    setPriceCategories(updatedCategories);
    localStorage.setItem(
      "sirius-price-research-categories",
      JSON.stringify(updatedCategories),
    );
    setPriceCatId(newCatId);
    setTimeout(() => setPriceSubId(newSubId), 100);
    setIsCreatingPriceCat(false);
    setNewCatName("");
    setNewSubName("");
  };

  useEffect(() => {
    if (!categoryId && categories.length > 0) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  );

  const isFuelCategory =
    selectedCategory?.name.toLowerCase() === "gasolina" ||
    selectedCategory?.name.toLowerCase() === "combustível";

  function parseNumber(input: string): number {
    if (!input) return 0;
    const normalized = input.replace(/\./g, "").replace(",", ".");
    return Number(normalized);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = parseNumber(amountInput);

    if (!description.trim()) {
      alert("Preencha a descrição.");
      return;
    }
    if (!selectedCategory) {
      alert("Selecione uma categoria.");
      return;
    }
    if (!value || isNaN(value)) {
      alert("Preencha um valor válido.");
      return;
    }

    const finalStore = isFuelCategory ? fuelStation : store;
    if (finalStore && !establishments.includes(finalStore)) {
      const newEst = [...establishments, finalStore];
      setEstablishments(newEst);
      localStorage.setItem(
        "sirius-price-research-establishments",
        JSON.stringify(newEst),
      );
    }

    // -------- PESQUISA DE PREÇOS: igual antes, mas agora com dual-write --------
    if (enablePriceTracking && priceCatId && priceSubId) {
      let priceToTrack = value;
      const pricePerLiter = parseNumber(fuelPricePerLiter);
      if (isFuelCategory && pricePerLiter > 0) {
        priceToTrack = pricePerLiter;
      }

      await savePriceEntryDualWrite({
        id: `manual-${Date.now()}`,
        categoryId: priceCatId,
        subcategoryId: priceSubId,
        price: Math.abs(priceToTrack),
        date,
        store: finalStore || description,
        source: "manual",
        userId: user?.id,
      });
    }

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
    };

    if (isFuelCategory) {
      const liters = parseNumber(fuelLiters);
      const pricePerLiter = parseNumber(fuelPricePerLiter);
      if (liters > 0) baseData.fuelLiters = liters;
      if (pricePerLiter > 0) baseData.fuelPricePerLiter = pricePerLiter;
      if (fuelStation.trim()) baseData.fuelStation = fuelStation.trim();
      if (fuelType) baseData.fuelType = fuelType;
    }

    await addExpense(baseData);
    navigate("/saidas");
  }

  const getIcon = (type: string) => {
    switch (type) {
      case "dinheiro":
        return <Banknote size={16} />;
      case "pix":
        return <Smartphone size={16} />;
      case "debito":
        return <CreditCard size={16} />;
      case "credito":
        return <CreditCard size={16} />;
      default:
        return <Wallet size={16} />;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-xl font-semibold text-slate-100"
            style={TITLE_SHADOW}
          >
            Nova saída
          </h1>
          <p className="text-sm text-slate-400">
            Registre um novo gasto no seu controle financeiro.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-slate-800 bg-slate-900 p-6"
      >
        {/* Dados básicos */}
        <div className="grid gap-4 md:grid-cols-[140px,1.5fr,1fr]">
          <div>
            <label className="block text-xs font-medium text-slate-300">
              Data
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">
              Descrição
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Mercado, Almoço..."
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">
              Valor (R$)
            </label>
            <input
              type="text"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              placeholder="0,00"
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Local e categoria */}
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-slate-300">
              Local / Loja
            </label>
            <div className="relative mt-1">
              <input
                type="text"
                list="store-suggestions"
                value={store}
                onChange={(e) => setStore(e.target.value)}
                placeholder="Onde foi?"
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 pl-8 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
              <Store size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
              <datalist id="store-suggestions">
                {establishments.map((est) => (
                  <option key={est} value={est} />
                ))}
              </datalist>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300">
              Categoria
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Forma de pagamento */}
        <div className="animate-in fade-in slide-in-from-left-2 duration-500">
          <label className="block text-xs font-medium text-slate-300 mb-2">
            Forma de Pagamento
          </label>
          <div className="flex flex-wrap gap-2">
            {paymentMethods.map((pm) => {
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
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm transition-transform ${
                      isSelected ? "scale-110" : "opacity-80 group-hover:scale-105"
                    }`}
                    style={{ backgroundColor: pm.color || "#64748b" }}
                  >
                    {getIcon(pm.type)}
                  </div>
                  <div className="flex flex-col items-start pr-1">
                    <span
                      className={`text-xs font-bold leading-tight ${
                        isSelected ? "text-white" : "text-slate-300"
                      }`}
                    >
                      {pm.name}
                    </span>
                    <span className="text-[9px] opacity-60 uppercase tracking-wider">
                      {pm.type}
                    </span>
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
        </div>

        {/* Opções extras */}
        <div className="grid gap-4 md:grid-cols-3 pt-2">
          <div className="flex items-center gap-2 p-3 rounded-lg border border-slate-800 bg-slate-950/50">
            <input
              id="isFixed"
              type="checkbox"
              checked={isFixed}
              onChange={(e) => setIsFixed(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
            />
            <label
              htmlFor="isFixed"
              className="text-xs font-medium text-slate-200 cursor-pointer select-none"
            >
              Conta fixa
            </label>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg border border-slate-800 bg-slate-950/50">
            <input
              id="isRecurring"
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
            />
            <label
              htmlFor="isRecurring"
              className="text-xs font-medium text-slate-200 cursor-pointer select-none"
            >
              Recorrente
            </label>
            {isRecurring && (
              <input
                type="number"
                min={1}
                max={31}
                value={recurrenceDay}
                onChange={(e) => setRecurrenceDay(e.target.value)}
                placeholder="Dia"
                className="ml-2 w-12 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 text-center"
              />
            )}
          </div>
          <div>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "paga" | "pendente")
              }
              className="w-full h-full rounded-lg border border-slate-800 bg-slate-950 px-3 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            >
              <option value="pendente">Pendente</option>
              <option value="paga">Paga</option>
            </select>
          </div>
        </div>

        {/* Abastecimento */}
        {isFuelCategory && (
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
            <p className="mb-2 text-xs font-semibold text-slate-200">
              Detalhes do abastecimento
            </p>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Litros
                </label>
                <input
                  type="text"
                  value={fuelLiters}
                  onChange={(e) => setFuelLiters(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Preço/Litro
                </label>
                <input
                  type="text"
                  value={fuelPricePerLiter}
                  onChange={(e) => setFuelPricePerLiter(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Tipo
                </label>
                <select
                  value={fuelType}
                  onChange={(e) => setFuelType(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
                >
                  <option value="">Selecione</option>
                  <option value="gasolina_comum">Gasolina comum</option>
                  <option value="gasolina_aditivada">Gasolina aditivada</option>
                  <option value="etanol">Etanol</option>
                  <option value="diesel">Diesel</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-300">
                  Posto
                </label>
                <input
                  type="text"
                  value={fuelStation}
                  onChange={(e) => setFuelStation(e.target.value)}
                  className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
                />
              </div>
            </div>
          </div>
        )}

        {/* PESQUISA DE PREÇOS - igual layout original */}
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 transition-all">
          <div className="flex items-center gap-3 mb-3">
            <button
              type="button"
              onClick={() => setEnablePriceTracking(!enablePriceTracking)}
              className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                enablePriceTracking
                  ? "text-emerald-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <div
                className={`flex h-4 w-4 items-center justify-center rounded border ${
                  enablePriceTracking
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-slate-600 bg-slate-900"
                }`}
              >
                {enablePriceTracking && (
                  <CheckCircle2 size={12} className="text-black" />
                )}
              </div>
              <Tag size={16} /> Vincular à Pesquisa de Preços
            </button>
          </div>
          {enablePriceTracking && (
            <div className="animate-in slide-in-from-top-2 space-y-3">
              {!isCreatingPriceCat ? (
                <div className="grid grid-cols-[1fr,1fr,auto] items-end gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                      Categoria
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
                      value={priceCatId}
                      onChange={(e) => {
                        setPriceCatId(e.target.value);
                        setPriceSubId("");
                      }}
                    >
                      <option value="">Selecione...</option>
                      {priceCategories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300">
                      Item
                    </label>
                    <select
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100"
                      value={priceSubId}
                      onChange={(e) => setPriceSubId(e.target.value)}
                      disabled={!selectedPriceCategory}
                    >
                      <option value="">Selecione...</option>
                      {selectedPriceCategory?.subcategories.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreatingPriceCat(true)}
                    className="flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-emerald-400 hover:border-emerald-500 sm:text-sm"
                  >
                    <Plus size={16} /> <span>Criar</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400">
                      Criar Nova Categoria de Preço
                    </span>
                    <button onClick={() => setIsCreatingPriceCat(false)}>
                      <X size={14} className="text-slate-400" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Ex: Limpeza"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-white"
                    />
                    <input
                      type="text"
                      placeholder="Ex: Sabão Líquido"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm text-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateCategory}
                    disabled={!newCatName || !newSubName}
                    className="flex w-full items-center justify-center gap-2 rounded bg-emerald-600 py-1.5 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                  >
                    <Save size={14} /> <span>Salvar e Selecionar</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate("/saidas")}
            className="rounded-md border border-slate-600 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-500"
          >
            Salvar saída
          </button>
        </div>
      </form>
    </div>
  );
}
