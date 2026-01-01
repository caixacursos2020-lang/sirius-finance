import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  Line,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  LabelList,
} from "recharts";
import clsx from "clsx";

// Tipos básicos
type Subcategory = {
  id: string;
  name: string;
};

type Category = {
  id: string;
  name: string;
  color: string;
  subcategories: Subcategory[];
};

type PriceEntry = {
  id: string;
  categoryId: string;
  subcategoryId: string;
  price: number;
  date: string; // ISO yyyy-MM-dd
  store?: string;
};

// Storage keys
const CATEGORIES_STORAGE_KEY = "sirius-price-research-categories";
const ENTRIES_STORAGE_KEY = "sirius-price-research-entries";
const ESTABLISHMENTS_STORAGE_KEY = "sirius-price-research-establishments";
const MONTHS_LABEL = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const palette = [
  "#22c55e",
  "#38bdf8",
  "#f97316",
  "#a855f7",
  "#eab308",
  "#ec4899",
  "#f43f5e",
  "#10b981",
  "#3b82f6",
  "#f59e0b",
];

// Categorias/subcategorias padrão
const defaultCategories: Category[] = [
  {
    id: "carne-bovina",
    name: "Carne bovina",
    color: palette[0],
    subcategories: [
      { id: "miolo-paleta", name: "Miolo da paleta" },
      { id: "contrafile", name: "Contrafilé" },
      { id: "musculo", name: "Músculo" },
    ],
  },
  {
    id: "carne-frango",
    name: "Carne de frango",
    color: palette[1],
    subcategories: [{ id: "coxa-sobrecoxa", name: "Coxa e sobrecoxa" }],
  },
  {
    id: "carne-suina",
    name: "Carne suína",
    color: palette[2],
    subcategories: [{ id: "bisteca", name: "Bisteca" }],
  },
  {
    id: "ovos",
    name: "Ovos",
    color: palette[3],
    subcategories: [{ id: "duzia", name: "Dúzia" }],
  },
  {
    id: "queijos",
    name: "Queijos",
    color: palette[4],
    subcategories: [{ id: "mussarela", name: "Mussarela" }],
  },
  {
    id: "gasolina",
    name: "Gasolina",
    color: palette[5],
    subcategories: [{ id: "comum", name: "Comum" }],
  },
];

// Helpers de persistência
function loadCategories(): Category[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!raw) return defaultCategories;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return defaultCategories;
    // Normaliza estrutura legada (cuts -> subcategories)
    const normalized = parsed.map((c: any, idx: number) => ({
      id: c.id ?? `cat-${idx}`,
      name: c.name ?? c.nome ?? "Categoria",
      color: c.color ?? palette[idx % palette.length],
      subcategories: Array.isArray(c.subcategories)
        ? c.subcategories.map((s: any, sIdx: number) => ({
            id: s.id ?? `sub-${idx}-${sIdx}`,
            name: s.name ?? s.nome ?? "Subcategoria",
          }))
        : Array.isArray(c.cuts)
          ? c.cuts.map((s: any, sIdx: number) => ({
              id: s.id ?? `sub-${idx}-${sIdx}`,
              name: s.name ?? s.nome ?? s.label ?? "Subcategoria",
            }))
          : [],
    }));
    return normalized;
  } catch {
    return defaultCategories;
  }
}

function saveCategories(categories: Category[]) {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categories));
  } catch {
    // ignore
  }
}

function loadEntries(): PriceEntry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Normaliza estrutura legada (cutId -> subcategoryId)
    return parsed.map((e: any, idx: number) => ({
      id: e.id ?? `entry-${idx}`,
      categoryId: e.categoryId ?? e.categoriaId ?? "",
      subcategoryId: e.subcategoryId ?? e.cutId ?? e.corteId ?? "",
      price: Number(e.price ?? e.valor ?? 0),
      date: e.date ?? e.data ?? new Date().toISOString().slice(0, 10),
      store: e.store ?? e.mercado ?? e.posto ?? undefined,
    }));
  } catch {
    return [];
  }
}

function saveEntries(entries: PriceEntry[]) {
  try {
    localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore
  }
}

function loadEstablishments(): string[] {
  try {
    const raw = localStorage.getItem(ESTABLISHMENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((s) => typeof s === "string");
  } catch {
    return [];
  }
}

function saveEstablishments(establishments: string[]) {
  try {
    localStorage.setItem(ESTABLISHMENTS_STORAGE_KEY, JSON.stringify(establishments));
  } catch {
    // ignore
  }
}

// Helpers de formatação
function formatCurrencyBRL(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

function formatShortDate(dateIso: string) {
  try {
    return new Date(dateIso).toLocaleDateString("pt-BR");
  } catch {
    return dateIso;
  }
}

function formatMonthYear(dateIso: string) {
  try {
    return new Date(dateIso).toLocaleDateString("pt-BR", {
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateIso;
  }
}

type ChartPoint = {
  date: string;
  label: string;
  price: number;
  movingAvg: number | null;
  pctChange: number | null;
  store?: string;
};

function PriceTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null;
  const p = payload[0].payload as ChartPoint;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-lg">
      <div className="font-semibold text-slate-100 mb-1">{label}</div>
      <div className="text-slate-200">Preço: {formatCurrencyBRL(p.price)}</div>
      {p.movingAvg !== null && (
        <div className="text-slate-300">Média móvel: {formatCurrencyBRL(p.movingAvg)}</div>
      )}
      {p.store && <div className="text-slate-400">Local: {p.store}</div>}
    </div>
  );
}

function MetricsCard({
  title,
  value,
  helper,
  className,
}: {
  title: string;
  value: string;
  helper: string;
  className?: string;
}) {
  return (
    <div className={clsx("rounded-lg border border-slate-800 bg-slate-950 px-4 py-3", className)}>
      <p className="text-xs text-slate-400">{title}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
      <p className="text-[11px] text-slate-500 mt-1">{helper}</p>
    </div>
  );
}

export default function PriceResearchPanel() {
  const [categories, setCategories] = useState<Category[]>(() => loadCategories());
  const [entries, setEntries] = useState<PriceEntry[]>(() => loadEntries());

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([]);

  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [priceInput, setPriceInput] = useState<string>("");
  const [store, setStore] = useState<string>("");
  const [establishments, setEstablishments] = useState<string[]>(() => loadEstablishments());
  const [newEstablishment, setNewEstablishment] = useState<string>("");
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [historyLimit, setHistoryLimit] = useState<number>(10);

  const [isConfigOpen, setConfigOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingEntry, setEditingEntry] = useState<PriceEntry | null>(null);
  const [editingDate, setEditingDate] = useState<string>("");
  const [editingPrice, setEditingPrice] = useState<string>("");
  const [editingStore, setEditingStore] = useState<string>("");

  // Persistência
  useEffect(() => {
    saveCategories(categories);
  }, [categories]);

  useEffect(() => {
    saveEntries(entries);
  }, [entries]);

  useEffect(() => {
    saveEstablishments(establishments);
  }, [establishments]);

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) ?? null,
    [categories, selectedCategoryId],
  );

  useEffect(() => {
    // Se nenhuma categoria estiver selecionada, não força seleção automática
    if (!selectedCategory) return;
    // Remove subcategorias que não pertencem mais à categoria
    setSelectedSubcategoryIds((prev) =>
      prev.filter((id) => selectedCategory.subcategories.some((s) => s.id === id)),
    );
  }, [selectedCategory]);

  // Entradas filtradas: primeiro por meses, depois opcional por categoria/subcategoria
  const monthFilteredEntries = useMemo(() => {
    if (!selectedMonths.length) return [...entries].sort((a, b) => b.date.localeCompare(a.date));
    return entries
      .filter((e) => selectedMonths.includes(new Date(e.date).getMonth()))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [entries, selectedMonths]);

  const filteredEntries = useMemo(() => {
    if (selectedCategoryId && selectedSubcategoryIds.length) {
      return monthFilteredEntries.filter(
        (e) => e.categoryId === selectedCategoryId && selectedSubcategoryIds.includes(e.subcategoryId),
      );
    }
    if (selectedCategoryId && !selectedSubcategoryIds.length) {
      return monthFilteredEntries.filter((e) => e.categoryId === selectedCategoryId);
    }
    return monthFilteredEntries;
  }, [monthFilteredEntries, selectedCategoryId, selectedSubcategoryIds]);

  const lastEntry = filteredEntries[0];
  const previousEntry = filteredEntries[1];

  const variation = useMemo(() => {
    if (!lastEntry || !previousEntry) return null;
    const diff = lastEntry.price - previousEntry.price;
    const pct = previousEntry.price ? (diff / previousEntry.price) * 100 : 0;
    return { diff, pct };
  }, [lastEntry, previousEntry]);

  const averageLast30Days = useMemo(() => {
    if (!filteredEntries.length) return null;
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = filteredEntries.filter((e) => new Date(e.date).getTime() >= cutoff);
    if (!recent.length) return null;
    const sum = recent.reduce((acc, e) => acc + e.price, 0);
    return sum / recent.length;
  }, [filteredEntries]);

  const minEntry = useMemo(() => {
    if (!filteredEntries.length) return null;
    return filteredEntries.reduce((min, e) => (e.price < min.price ? e : min), filteredEntries[0]);
  }, [filteredEntries]);

  const maxEntry = useMemo(() => {
    if (!filteredEntries.length) return null;
    return filteredEntries.reduce((max, e) => (e.price > max.price ? e : max), filteredEntries[0]);
  }, [filteredEntries]);

  // Dados do gráfico (ordenados) com média móvel simples de 3 registros
  const chartDataBySubcategory = useMemo(() => {
    // Retorna um mapa subId -> pontos (ordenados asc)
    const map = new Map<string, ChartPoint[]>();
    const grouped = selectedSubcategoryIds.length
      ? selectedSubcategoryIds
      : selectedCategory
        ? selectedCategory.subcategories.map((s) => s.id)
        : [];
    grouped.forEach((subId) => {
      const asc = filteredEntries
        .filter((e) => e.subcategoryId === subId)
        .sort((a, b) => a.date.localeCompare(b.date));
      const data: ChartPoint[] = [];
      const window: number[] = [];
      asc.forEach((entry, idx) => {
        window.push(entry.price);
        if (window.length > 3) window.shift();
        const movingAvg = window.length ? window.reduce((acc, v) => acc + v, 0) / window.length : null;
        const prev = idx > 0 ? asc[idx - 1] : null;
        const pctChange = prev && prev.price !== 0 ? ((entry.price - prev.price) / prev.price) * 100 : null;
        data.push({
          date: entry.date,
          label: formatShortDate(entry.date),
          price: entry.price,
          movingAvg,
          pctChange,
          store: entry.store,
        });
      });
      map.set(subId, data);
    });
    return map;
  }, [filteredEntries, selectedCategory, selectedSubcategoryIds]);

  const insight = useMemo(() => {
    if (!lastEntry || !averageLast30Days) return null;
    const diff = lastEntry.price - averageLast30Days;
    const pct = (diff / averageLast30Days) * 100;
    if (Math.abs(pct) < 3) {
      return "Preço atual está alinhado à média recente. Sem grandes oscilações.";
    }
    if (pct > 0) {
      return `Preço atual ${pct.toFixed(1)}% acima da média dos últimos 30 dias. Se puder, avalie esperar uma queda.`;
    }
    return `Preço atual ${Math.abs(pct).toFixed(1)}% abaixo da média dos últimos 30 dias. Pode ser um bom momento para comprar.`;
  }, [averageLast30Days, lastEntry]);

  // Resumo mensal para comparação mês a mês
  const monthlySummary = useMemo(() => {
    if (!filteredEntries.length) return null;
    const monthMap = new Map<string, { sum: number; count: number }>();
    filteredEntries.forEach((e) => {
      const key = e.date.slice(0, 7);
      const current = monthMap.get(key) ?? { sum: 0, count: 0 };
      current.sum += e.price;
      current.count += 1;
      monthMap.set(key, current);
    });
    const sorted = Array.from(monthMap.entries()).sort((a, b) => b[0].localeCompare(a[0]));
    if (!sorted.length) return null;
    const [currentKey, currentVal] = sorted[0];
    const prev = sorted[1];
    const mediaAtual = currentVal.sum / currentVal.count;
    const mediaAnterior = prev ? prev[1].sum / prev[1].count : null;
    const variacao =
      mediaAnterior && mediaAnterior !== 0 ? ((mediaAtual - mediaAnterior) / mediaAnterior) * 100 : null;
    return {
      mediaAtual,
      mediaAnterior,
      variacao,
      currentLabel: currentKey,
      prevLabel: prev?.[0],
    };
  }, [filteredEntries]);

  const summaryText = useMemo(() => {
    if (!filteredEntries.length) {
      return "Ainda não há registros para esta categoria e subcategoria. Registre preços para começar.";
    }

    const subName = selectedSubcategoryIds.length
      ? selectedCategory?.subcategories
          .filter((s) => selectedSubcategoryIds.includes(s.id))
          .map((s) => s.name)
          .join(", ")
      : "todas subcategorias";
    const catName = selectedCategory?.name ?? "";

    const ultimoMes = monthlySummary?.currentLabel
      ? formatMonthYear(`${monthlySummary.currentLabel}-01`)
      : "";
    const mediaAtual = monthlySummary?.mediaAtual ?? null;
    const variacao = monthlySummary?.variacao ?? null;

    const variacaoTexto =
      variacao === null
        ? "Sem referência do mês anterior."
        : variacao > 0
          ? `Alta de ${variacao.toFixed(1)}% vs mês anterior.`
          : `Queda de ${Math.abs(variacao).toFixed(1)}% vs mês anterior.`;

    const maxTxt = maxEntry
      ? `Maior: ${formatCurrencyBRL(maxEntry.price)} (${formatShortDate(maxEntry.date)}${maxEntry.store ? ` · ${maxEntry.store}` : ""
        })`
      : "";
    const minTxt = minEntry
      ? `Menor: ${formatCurrencyBRL(minEntry.price)} (${formatShortDate(minEntry.date)}${minEntry.store ? ` · ${minEntry.store}` : ""
        })`
      : "";

    if (!monthlySummary?.prevLabel) {
      return `No último mês (${ultimoMes}), o preço médio de ${catName} · ${subName} foi ${
        mediaAtual !== null ? formatCurrencyBRL(mediaAtual) : "—"
      }. ${maxTxt}${maxTxt && minTxt ? " · " : ""}${minTxt}`;
    }

    return `No último mês (${ultimoMes}), o preço médio de ${catName} · ${subName} foi ${
      mediaAtual !== null ? formatCurrencyBRL(mediaAtual) : "—"
    }. ${variacaoTexto} ${maxTxt}${maxTxt && minTxt ? " · " : ""}${minTxt}`;
  }, [filteredEntries.length, maxEntry, minEntry, monthlySummary, selectedCategory, selectedSubcategoryIds]);

  const handleRegisterPrice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !selectedSubcategoryIds.length) return;

    const value = Number(priceInput.replace(".", "").replace(",", "."));
    if (!value || value <= 0) return;

    const targetSubcategoryId = selectedSubcategoryIds[0];

    const newEntry: PriceEntry = {
      id: `${Date.now()}`,
      categoryId: selectedCategory.id,
      subcategoryId: targetSubcategoryId,
      price: value,
      date,
      store: store.trim() || undefined,
    };

    setEntries((prev) => [newEntry, ...prev]);
    if (newEntry.store) {
      const newStore = newEntry.store;
      setEstablishments((prev) => (prev.includes(newStore) ? prev : [...prev, newStore]));
    }
    setPriceInput("");
    setStore("");
  };

  const handleAddEstablishment = () => {
    const name = newEstablishment.trim();
    if (!name) return;
    setEstablishments((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setStore(name);
    setNewEstablishment("");
  };

  // CRUD categorias/subcategorias
  const handleAddCategory = () => {
    const newCategory: Category = {
      id: `cat-${Date.now()}`,
      name: "Nova categoria",
      color: palette[(categories.length + 1) % palette.length],
      subcategories: [{ id: `sub-${Date.now()}`, name: "Nova subcategoria" }],
    };
    setCategories((prev) => [...prev, newCategory]);
    setEditingCategory(newCategory);
    setConfigOpen(true);
  };

  const handleUpdateCategory = (updated: Category) => {
    setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const handleDeleteCategory = (id: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    if (selectedCategoryId === id) {
      setSelectedCategoryId(null);
      setSelectedSubcategoryIds([]);
    }
  };

  const handleAddSubcategory = (category: Category) => {
    const newSub: Subcategory = { id: `sub-${Date.now()}`, name: "Nova subcategoria" };
    const updated: Category = { ...category, subcategories: [...category.subcategories, newSub] };
    handleUpdateCategory(updated);
    setEditingCategory(updated);
  };

  const handleUpdateSubcategoryName = (category: Category, subId: string, name: string) => {
    const updated: Category = {
      ...category,
      subcategories: category.subcategories.map((s) => (s.id === subId ? { ...s, name } : s)),
    };
    handleUpdateCategory(updated);
    setEditingCategory(updated);
  };

  const handleRemoveSubcategory = (category: Category, subId: string) => {
    const updated: Category = {
      ...category,
      subcategories: category.subcategories.filter((s) => s.id !== subId),
    };
    handleUpdateCategory(updated);
    setEditingCategory(updated);
    setSelectedSubcategoryIds((prev) => prev.filter((id) => id !== subId));
  };

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleEditEntry = (entry: PriceEntry) => {
    setEditingEntry(entry);
    setEditingDate(entry.date);
    setEditingPrice(String(entry.price));
    setEditingStore(entry.store ?? "");
  };

  const handleCloseEdit = () => {
    setEditingEntry(null);
    setEditingDate("");
    setEditingPrice("");
    setEditingStore("");
  };

  const handleSaveEdit = () => {
    if (!editingEntry) return;
    const priceNumber = Number(editingPrice.replace(",", "."));
    if (!priceNumber || priceNumber <= 0) return;

    setEntries((prev) =>
      prev.map((e) =>
        e.id === editingEntry.id
          ? {
              ...e,
              date: editingDate || e.date,
              price: priceNumber,
              store: editingStore || undefined,
            }
          : e,
      ),
    );
    handleCloseEdit();
  };

  const toggleMonthFilter = (monthIndex: number) => {
    setSelectedMonths((prev) =>
      prev.includes(monthIndex) ? prev.filter((m) => m !== monthIndex) : [...prev, monthIndex],
    );
  };

  const clearMonthFilter = () => setSelectedMonths([]);

  const toggleSubcategory = (subId: string) => {
    setSelectedSubcategoryIds((prev: string[]) =>
      prev.includes(subId) ? prev.filter((id) => id !== subId) : [...prev, subId],
    );
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Pesquisa de preços (Itens recorrentes)</h2>
          <p className="text-sm text-slate-400">
            Compare categorias e subcategorias para decidir quando comprar.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setConfigOpen(true)}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-emerald-500 hover:text-emerald-300"
        >
          Gerenciar categorias
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setSelectedCategoryId(null);
            setSelectedSubcategoryIds([]);
          }}
          className={clsx(
            "rounded-full px-4 py-1.5 text-sm transition-colors",
            !selectedCategoryId ? "bg-emerald-600 text-slate-900" : "bg-slate-800 text-slate-200 hover:bg-slate-700",
          )}
        >
          Todas
        </button>
        {categories.map((category) => {
          const active = category.id === selectedCategoryId;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                setSelectedCategoryId(category.id);
                setSelectedSubcategoryIds([]);
              }}
              className={clsx(
                "rounded-full px-4 py-1.5 text-sm transition-colors",
                active ? "bg-emerald-600 text-slate-900" : "bg-slate-800 text-slate-200 hover:bg-slate-700",
              )}
            >
              {category.name}
            </button>
          );
        })}
        {!categories.length && (
          <p className="text-sm text-slate-500">Nenhuma categoria cadastrada.</p>
        )}
      </div>

      {selectedCategory && (
        <div className="flex flex-wrap gap-2">
          {selectedCategory.subcategories.map((sub) => {
            const active = selectedSubcategoryIds.includes(sub.id);
            return (
              <button
                key={sub.id}
                type="button"
                onClick={() => toggleSubcategory(sub.id)}
                className={clsx(
                  "rounded-full px-3 py-1 text-xs transition-colors",
                  active ? "bg-emerald-500 text-slate-900" : "bg-slate-800 text-slate-200 hover:bg-slate-700",
                )}
              >
                {sub.name}
              </button>
            );
          })}
          {!selectedCategory.subcategories.length && (
            <p className="text-sm text-slate-500">Nenhuma subcategoria cadastrada para esta categoria.</p>
          )}
        </div>
      )}

      <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-100">Filtrar meses</p>
          <button
            type="button"
            onClick={clearMonthFilter}
            className="text-xs text-emerald-300 hover:text-emerald-200"
          >
            Limpar
          </button>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {MONTHS_LABEL.map((m, idx) => {
            const active = selectedMonths.includes(idx);
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleMonthFilter(idx)}
                className={clsx(
                  "rounded-full border px-3 py-1 transition",
                  active
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                    : "border-slate-700 bg-slate-800 text-slate-300 hover:border-emerald-500/60",
                )}
              >
                {m}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricsCard
          title="Último preço"
          value={lastEntry ? formatCurrencyBRL(lastEntry.price) : "—"}
          helper={
            lastEntry
              ? `${formatShortDate(lastEntry.date)}${lastEntry.store ? ` · ${lastEntry.store}` : ""}`
              : "Registre o primeiro preço para começar."
          }
        />
        <MetricsCard
          title="Variação vs anterior"
          value={
            variation
              ? `${variation.diff > 0 ? "+" : ""}${formatCurrencyBRL(variation.diff)} (${
                  variation.pct > 0 ? "+" : ""
                }${variation.pct.toFixed(1)}%)`
              : "—"
          }
          helper={
            variation
              ? "Comparação com o registro imediatamente anterior."
              : filteredEntries.length === 1
                ? "Precisa de pelo menos dois registros."
                : "Sem dados suficientes."
          }
          className={
            variation
              ? variation.diff > 0
                ? "border-rose-700/60"
                : "border-emerald-700/60"
              : undefined
          }
        />
        <MetricsCard
          title="Média últimos 30 dias"
          value={averageLast30Days ? formatCurrencyBRL(averageLast30Days) : "—"}
          helper={
            averageLast30Days
              ? "Baseada nos registros dos últimos 30 dias."
              : "Sem dados suficientes nos últimos 30 dias."
          }
        />
        <MetricsCard
          title="Maior / menor preço"
          value={
            minEntry && maxEntry
              ? `${formatCurrencyBRL(minEntry.price)} · ${formatCurrencyBRL(maxEntry.price)}`
              : "—"
          }
          helper={
            minEntry && maxEntry
              ? `${formatShortDate(minEntry.date)} · ${formatShortDate(maxEntry.date)}`
              : "Registre mais preços para ver a faixa histórica."
          }
        />
      </div>

      {insight && (
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-100">
          <span className="font-semibold text-emerald-300 mr-1">Insight:</span>
          {insight}
        </div>
      )}

      <form onSubmit={handleRegisterPrice} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Valor (R$)</label>
            <input
              type="text"
              inputMode="decimal"
              placeholder="Ex.: 34,90"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400">Local (Estabelecimento)</label>
            <input
              type="text"
              list="establishments"
              placeholder="Nome do estabelecimento"
              value={store}
              onChange={(e) => setStore(e.target.value)}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
            />
            <datalist id="establishments">
              {establishments.map((est) => (
                <option key={est} value={est} />
              ))}
            </datalist>
            <div className="mt-2 space-y-2 rounded-md border border-slate-800 bg-slate-950/60 p-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Cadastrar novo estabelecimento"
                  value={newEstablishment}
                  onChange={(e) => setNewEstablishment(e.target.value)}
                  className="flex-1 min-w-[160px] rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddEstablishment}
                  className="rounded-md border border-slate-700 px-3 py-1 text-[11px] text-slate-200 hover:border-emerald-500"
                >
                  Salvar estabelecimento
                </button>
              </div>
              {!!establishments.length && (
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                  {establishments.map((est) => (
                    <div
                      key={est}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1"
                    >
                      <button
                        type="button"
                        onClick={() => setStore(est)}
                        className="text-slate-200 hover:text-emerald-300"
                        title="Usar este estabelecimento"
                      >
                        {est}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEstablishments((prev) => prev.filter((s) => s !== est))}
                        className="text-rose-300 hover:text-rose-200"
                        title="Excluir"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={!selectedCategory || !selectedSubcategoryIds.length || !priceInput.trim()}
          className={clsx(
            "mt-1 w-full rounded-md py-2 text-sm font-semibold transition-colors",
            !selectedCategory || !selectedSubcategoryIds.length || !priceInput.trim()
              ? "bg-slate-700 text-slate-300 cursor-not-allowed"
              : "bg-emerald-600 text-slate-900 hover:bg-emerald-500",
          )}
        >
          Registrar preço
        </button>
      </form>

      <div className="grid gap-6 lg:grid-cols-[2fr,1.3fr]">
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-100">Evolução do preço</h3>
            <span className="text-[11px] text-slate-500">
              {selectedCategory?.name ?? "Todas"} ·{" "}
              {selectedSubcategoryIds.length
                ? selectedCategory?.subcategories
                    .filter((s) => selectedSubcategoryIds.includes(s.id))
                    .map((s) => s.name)
                    .join(", ")
                : "Nenhuma subcategoria selecionada"}
            </span>
          </div>
          <div className="space-y-4">
            {selectedSubcategoryIds.length === 0 && (
              <div className="flex h-[120px] items-center justify-center text-sm text-slate-500">
                Selecione subcategorias para visualizar o gráfico.
              </div>
            )}
            {selectedSubcategoryIds.map((subId) => {
              const sub = selectedCategory?.subcategories.find((s) => s.id === subId);
              const data = chartDataBySubcategory.get(subId) ?? [];
              return (
                <div key={subId} className="h-[220px] rounded-lg border border-slate-800 bg-slate-900/60 p-2">
                  <div className="mb-1 text-xs text-slate-300">{sub ? sub.name : subId}</div>
                  {data.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data} margin={{ top: 28, right: 12, left: -4, bottom: 14 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: "#cbd5e1", fontSize: 11 }}
                          tickLine={false}
                          axisLine={{ stroke: "#334155" }}
                        />
                        <YAxis
                          tick={{ fill: "#cbd5e1", fontSize: 11 }}
                          tickLine={false}
                          axisLine={{ stroke: "#334155" }}
                          width={70}
                          domain={[0, (dataMax: number) => (dataMax ? dataMax * 1.25 : 10)]}
                          tickFormatter={(value: any) => formatCurrencyBRL(Number(value ?? 0))}
                        />
                        <RechartsTooltip content={<PriceTooltip />} />
                        <Bar dataKey="price" name="Preço" radius={[6, 6, 0, 0]}>
                          <LabelList
                            dataKey="price"
                            position="top"
                            formatter={(value: any) =>
                              Number(value ?? 0) > 0 ? formatCurrencyBRL(Number(value ?? 0)) : ""
                            }
                            className="text-[14px] fill-slate-100 font-semibold"
                          />
                          {data.map((entry, idx) => (
                            <Cell
                              key={`${subId}-${idx}`}
                              fill={
                                entry.pctChange && entry.pctChange > 0
                                  ? "#ef4444"
                                  : "#22c55e"
                              }
                            />
                          ))}
                        </Bar>
                        <Line
                          type="monotone"
                          dataKey="movingAvg"
                          name="Média móvel (3 registros)"
                          stroke="#38bdf8"
                          strokeWidth={2}
                          dot={{
                            r: 4,
                            strokeWidth: 2,
                            stroke: "#38bdf8",
                            fill: "#020617",
                          }}
                          activeDot={{ r: 5 }}
                          connectNulls
                        >
                          <LabelList
                            dataKey="pctChange"
                            position="bottom"
                            formatter={(value: any) =>
                              value === null || value === undefined
                                ? ""
                                : `${value > 0 ? "+" : ""}${Number(value).toFixed(1)}%`
                            }
                            className="text-[16px] fill-slate-100 font-semibold"
                            style={{
                              textShadow:
                                "0 0 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.9)",
                            }}
                          />
                        </Line>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-slate-500">
                      Sem dados para esta subcategoria.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-100 mb-2">Histórico recente</h3>
          <div className="mb-2 flex items-center justify-end text-[11px] text-slate-300">
            <label className="flex items-center gap-2">
              Limite de linhas:
              <select
                value={historyLimit}
                onChange={(e) => setHistoryLimit(Number(e.target.value))}
                className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 focus:border-emerald-500"
              >
                {[5, 10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="max-h-[240px] overflow-y-auto">
            {filteredEntries.length ? (
              <table className="min-w-full text-xs">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-1 text-left">Data</th>
                    <th className="py-1 text-left">Categoria</th>
                    <th className="py-1 text-left">Subcategoria</th>
                    <th className="py-1 text-left">Mercado/Posto</th>
                    <th className="py-1 text-right">Preço</th>
                    <th className="py-1 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredEntries.slice(0, historyLimit).map((entry) => {
                    const cat = categories.find((c) => c.id === entry.categoryId);
                    const sub = cat?.subcategories.find((s) => s.id === entry.subcategoryId);
                    return (
                      <tr key={entry.id}>
                        <td className="py-1 text-slate-200">{formatShortDate(entry.date)}</td>
                        <td className="py-1 text-slate-300">{cat?.name ?? entry.categoryId}</td>
                        <td className="py-1 text-slate-300">{sub?.name ?? entry.subcategoryId}</td>
                        <td className="py-1 text-slate-300">{entry.store ?? "-"}</td>
                        <td className="py-1 text-right text-slate-100">
                          {formatCurrencyBRL(entry.price)}
                        </td>
                        <td className="py-1 text-right text-[11px]">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="text-sky-300 hover:text-sky-200"
                              onClick={() => handleEditEntry(entry)}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              className="text-rose-300 hover:text-rose-200"
                              onClick={() => handleDeleteEntry(entry.id)}
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-slate-500">
                Ainda não há registros para esta categoria e subcategoria.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200">
        <h3 className="text-sm font-semibold text-slate-100 mb-1">Resumo automático</h3>
        <p>{summaryText}</p>
      </div>

      {editingEntry && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-100">Editar registro</h3>
              <button
                type="button"
                onClick={handleCloseEdit}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">Categoria · Subcategoria</p>
                <p className="font-semibold text-slate-100">
                  {categories.find((c) => c.id === editingEntry.categoryId)?.name ?? editingEntry.categoryId} ·{" "}
                  {categories
                    .find((c) => c.id === editingEntry.categoryId)
                    ?.subcategories.find((s) => s.id === editingEntry.subcategoryId)?.name ??
                    editingEntry.subcategoryId}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Data</label>
                  <input
                    type="date"
                    value={editingDate}
                    onChange={(e) => setEditingDate(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-400">Preço (R$)</label>
                  <input
                    type="text"
                    value={editingPrice}
                    onChange={(e) => setEditingPrice(e.target.value)}
                    className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Estabelecimento</label>
                <input
                  type="text"
                  value={editingStore}
                  onChange={(e) => setEditingStore(e.target.value)}
                  className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCloseEdit}
                  className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-rose-500 hover:text-rose-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-emerald-500"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isConfigOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-2xl rounded-xl border border-slate-800 bg-slate-950 p-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-100">Gerenciar categorias e subcategorias</h3>
              <button
                type="button"
                onClick={() => {
                  setConfigOpen(false);
                  setEditingCategory(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-4">
              {categories.map((category) => (
                <div
                  key={category.id}
                  className={clsx(
                    "rounded-lg border px-3 py-3",
                    editingCategory?.id === category.id
                      ? "border-emerald-500 bg-slate-900"
                      : "border-slate-800 bg-slate-900/60",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <input
                      type="text"
                      value={category.name}
                      onChange={(e) =>
                        handleUpdateCategory({
                          ...category,
                          name: e.target.value,
                        })
                      }
                      className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs text-slate-100 outline-none focus:border-emerald-500"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddSubcategory(category)}
                        className="rounded-md border border-slate-700 px-2 py-1 text-[11px] text-slate-200 hover:border-emerald-500"
                      >
                        + Subcategoria
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(category.id)}
                        className="rounded-md border border-rose-600 px-2 py-1 text-[11px] text-rose-300 hover:bg-rose-600/10"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>

                  <div className="mt-2 space-y-1">
                    {category.subcategories.map((sub) => (
                      <div key={sub.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={sub.name}
                          onChange={(e) => handleUpdateSubcategoryName(category, sub.id, e.target.value)}
                          className="flex-1 rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSubcategory(category, sub.id)}
                          className="rounded-md border border-slate-700 px-2 py-1 text-[10px] text-slate-300 hover:border-rose-500 hover:text-rose-300"
                        >
                          Remover
                        </button>
                      </div>
                    ))}
                    {!category.subcategories.length && (
                      <p className="text-[11px] text-slate-500">
                        Nenhuma subcategoria cadastrada. Use “+ Subcategoria”.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                type="button"
                onClick={handleAddCategory}
                className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-emerald-500"
              >
                + Nova categoria
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfigOpen(false);
                  setEditingCategory(null);
                }}
                className="rounded-md bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-slate-900 hover:bg-emerald-500"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
