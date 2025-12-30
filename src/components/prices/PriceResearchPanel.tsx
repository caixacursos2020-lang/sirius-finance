import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useSupplyPrices } from "../../contexts/SupplyPricesContext";
import {
  SUPPLY_VARIANTS,
  getVariantsByCategory,
} from "../../types/finance";
import type {
  SupplyCategory,
  SupplyVariantId,
} from "../../types/finance";
import { formatCurrency } from "../../utils/formatters";

type FamilyOption = {
  key: SupplyCategory;
  label: string;
};

type VariantOption = {
  key: SupplyVariantId;
  label: string;
};

type MonthlyPoint = {
  monthLabel: string;
  avgPrice: number;
};

export default function PriceResearchPanel() {
  const { addSample, getLastTwoPrices, getHistory } = useSupplyPrices();
  const CUSTOM_KEY = "sirius_price_research_custom_variants_v1";
  const [customVariants, setCustomVariants] = useState<
    Record<SupplyCategory, { id: SupplyVariantId; label: string }[]>
  >(() => ({} as Record<SupplyCategory, { id: SupplyVariantId; label: string }[]>));

  const families: FamilyOption[] = useMemo(() => {
    const map = new Map<SupplyCategory, string>();
    SUPPLY_VARIANTS.forEach((v) => {
      if (!map.has(v.category)) {
        map.set(v.category, familyLabel(v.category));
      }
    });
    return Array.from(map.entries()).map(([key, label]) => ({
      key,
      label,
    }));
  }, []);

  const [selectedFamily, setSelectedFamily] = useState<SupplyCategory | null>(
    families.length ? families[0].key : null
  );

  const [selectedVariant, setSelectedVariant] = useState<SupplyVariantId | null>(null);

  const [formDate, setFormDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });
  const [formValue, setFormValue] = useState<string>("");
  const [formSource, setFormSource] = useState<string>("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_KEY);
      if (raw) {
        setCustomVariants(JSON.parse(raw));
      }
    } catch (err) {
      console.error("Erro ao carregar variações personalizadas", err);
    }
  }, []);

  
  const priceHistory = useMemo(
    () => (selectedVariant ? getHistory(selectedVariant) : []),
    [getHistory, selectedVariant]
  );

  const monthlyData: MonthlyPoint[] = useMemo(() => {
    const byMonth = new Map<string, { total: number; count: number }>();
    priceHistory.forEach((s) => {
      const key = s.date.slice(0, 7);
      const current = byMonth.get(key) ?? { total: 0, count: 0 };
      current.total += s.price;
      current.count += 1;
      byMonth.set(key, current);
    });
    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, agg]) => {
        const [year, month] = key.split("-");
        const date = new Date(Number(year), Number(month) - 1, 1);
        const monthLabel = date.toLocaleDateString("pt-BR", {
          month: "short",
          year: "numeric",
        });
        return { monthLabel, avgPrice: agg.total / agg.count };
      });
  }, [priceHistory]);

  const { last, previous } = useMemo(
    () => (selectedVariant ? getLastTwoPrices(selectedVariant) : { last: undefined, previous: undefined }),
    [getLastTwoPrices, selectedVariant]
  );

  const variationAbs =
    last && previous ? last.price - previous.price : null;
  const variationPercent =
    last && previous && previous.price !== 0
      ? (variationAbs! / previous.price) * 100
      : null;

  const handleSubmit = (ev: FormEvent) => {
    ev.preventDefault();
    if (!selectedVariant || !selectedFamily) return;

    const numeric = Number((formValue || "").replace(",", "."));
    if (!Number.isFinite(numeric) || numeric <= 0) return;

    addSample({
      variantId: selectedVariant,
      category: selectedFamily,
      date: formDate,
      price: numeric,
      place: formSource || undefined,
    });

    setFormValue("");
  };

  const baseVariants = useMemo(
    () => (selectedFamily ? getVariantsByCategory(selectedFamily) : []),
    [selectedFamily]
  );
  const extraVariants = selectedFamily ? customVariants[selectedFamily] ?? [] : [];
  const allVariants: VariantOption[] = useMemo(() => {
    return [
      ...baseVariants.map((v) => ({ key: v.id, label: v.name })),
      ...extraVariants.map((v) => ({ key: v.id, label: v.label })),
    ];
  }, [baseVariants, extraVariants]);

  useEffect(() => {
    if (allVariants.length) {
      setSelectedVariant((prev) =>
        prev && allVariants.some((v) => v.key === prev) ? prev : allVariants[0].key
      );
    } else {
      setSelectedVariant(null);
    }
  }, [allVariants]);

  const handleAddVariant = () => {
    if (!selectedFamily) return;
    const name = window.prompt(`Digite o nome do novo corte/variação para "${familyLabel(selectedFamily)}":`);
    if (!name) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    const slug = `custom_${trimmed.toLowerCase().replace(/\s+/g, "_")}` as SupplyVariantId;
    setCustomVariants((prev) => {
      const current = prev[selectedFamily] ?? [];
      if (current.some((v) => v.label === trimmed)) return prev;
      const next = {
        ...prev,
        [selectedFamily]: [...current, { id: slug, label: trimmed }],
      };
      try {
        localStorage.setItem(CUSTOM_KEY, JSON.stringify(next));
      } catch (err) {
        console.error("Erro ao salvar variações personalizadas", err);
      }
      return next;
    });
  };

  if (!families.length) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 mt-4 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Pesquisa de preços de insumos
          </h2>
          <p className="text-xs text-slate-400">
            Acompanhamento de carnes, ovos, queijos e gasolina por corte/variante.
          </p>
        </div>
      </div>

      {/* Seleção de família */}
      <div className="flex flex-wrap gap-2">
        {families.map((fam) => {
          const active = fam.key === selectedFamily;
          return (
            <button
              key={fam.key}
              onClick={() => {
                setSelectedFamily(fam.key);
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                active
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-700 bg-slate-950 text-slate-300 hover:border-emerald-500/60"
              }`}
            >
              {fam.label}
            </button>
          );
        })}
      </div>

      {/* Seleção de variante */}
      <div className="flex flex-wrap gap-2">
        {allVariants.map((v) => {
          const active = v.key === selectedVariant;
          return (
            <button
              key={v.key}
              onClick={() => setSelectedVariant(v.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium border transition-colors ${
                active
                  ? "border-sky-500 bg-sky-500/10 text-sky-200"
                  : "border-slate-700 bg-slate-950 text-slate-300 hover:border-sky-500/60"
              }`}
            >
              {v.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="mt-2 inline-flex items-center text-xs text-slate-300/80 hover:text-slate-100 underline-offset-2 hover:underline"
        onClick={handleAddVariant}
      >
        + Adicionar corte/variação
      </button>

      {/* Resumo rápido */}
      {selectedVariant && (
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <p className="text-xs text-slate-400">Último preço</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              {last ? formatCurrency(last.price) : "-"}
            </p>
            <p className="text-[11px] text-slate-500">
              {last?.date ? new Date(last.date).toLocaleDateString("pt-BR") : ""}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <p className="text-xs text-slate-400">Preço anterior</p>
            <p className="mt-1 text-sm font-semibold text-slate-100">
              {previous ? formatCurrency(previous.price) : "-"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
            <p className="text-xs text-slate-400">Variação</p>
            <p className="mt-1 text-sm font-semibold">
              {variationAbs != null ? (
                <span
                  className={
                    variationAbs > 0
                      ? "text-rose-300"
                      : variationAbs < 0
                      ? "text-emerald-300"
                      : "text-slate-100"
                  }
                >
                  {variationAbs > 0 ? "+" : ""}
                  {formatCurrency(variationAbs)} (
                  {variationPercent != null
                    ? `${variationPercent.toFixed(1)}%`
                    : "-"}
                  )
                </span>
              ) : (
                <span className="text-slate-100">-</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Formulário de novo preço */}
      <form
        onSubmit={handleSubmit}
        className="grid gap-3 md:grid-cols-[140px,1fr,140px]"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Data</label>
          <input
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Valor (R$)</label>
          <input
            type="text"
            value={formValue}
            onChange={(e) => setFormValue(e.target.value)}
            placeholder="Ex.: 34,90"
            className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
          />
          <input
            type="text"
            value={formSource}
            onChange={(e) => setFormSource(e.target.value)}
            placeholder="Mercado / posto (opcional)"
            className="mt-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-emerald-500 transition-colors"
          >
            Registrar preço
          </button>
        </div>
      </form>

      {/* Gráfico mensal */}
      <div className="mt-2">
        <h3 className="text-sm font-semibold text-slate-100 mb-2">
          Evolução mensal do preço
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#1f2937"
                vertical={false}
              />
              <XAxis
                dataKey="monthLabel"
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `R$ ${Number(val).toFixed(2)}`}
              />
              <RechartsTooltip
                formatter={(value) => formatCurrency(Number(value ?? 0))}
                labelStyle={{ color: "#e5e7eb" }}
                contentStyle={{
                  backgroundColor: "#020617",
                  borderColor: "#1f2937",
                  fontSize: 12,
                }}
              />
              <Bar
                dataKey="avgPrice"
                name="Preço médio"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              >
                <LabelList
                  dataKey="avgPrice"
                  position="top"
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                  className="text-[10px] fill-slate-100"
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function familyLabel(category: SupplyCategory): string {
  switch (category) {
    case "carne_bovina":
      return "Carne bovina";
    case "carne_frango":
      return "Carne de frango";
    case "carne_suina":
      return "Carne suína";
    case "ovos":
      return "Ovos";
    case "queijo":
      return "Queijos";
    case "gasolina":
      return "Gasolina";
    default:
      return category;
  }
}
