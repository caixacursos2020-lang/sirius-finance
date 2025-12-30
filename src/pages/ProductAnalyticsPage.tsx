import { useMemo, useState } from "react";
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  LabelList,
} from "recharts";
import { useCategories } from "../contexts/CategoriesContext";
import { useFinance } from "../contexts/FinanceContext";
import { useProductAnalytics } from "../hooks/useProductAnalytics";
import { formatCurrency } from "../utils/formatters";

const todayIso = () => new Date().toISOString().slice(0, 10);
const isoNDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

export default function ProductAnalyticsPage() {
  const { categories } = useCategories();
  const { expenses } = useFinance();

  const [searchText, setSearchText] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [dataInicioInput, setDataInicioInput] = useState(isoNDaysAgo(90));
  const [dataFimInput, setDataFimInput] = useState(todayIso());
  const [categoriaIdsInput, setCategoriaIdsInput] = useState<string[]>([]);

  const [query, setQuery] = useState({
    produtoTerm: "",
    dataInicio: isoNDaysAgo(90),
    dataFim: todayIso(),
    categoriaIds: [] as string[],
  });

  const { summary, monthly } = useProductAnalytics(query);

  const distinctProducts = useMemo(() => {
    const map = new Map<string, string>();
    expenses.forEach((exp) =>
      exp.receiptItems?.forEach((item) => {
        const desc = item.description?.trim();
        if (!desc) return;
        const key = desc.toLowerCase();
        if (!map.has(key)) {
          map.set(key, desc);
        }
      })
    );
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [expenses]);

  const filteredProducts = useMemo(() => {
    const term = searchText.trim().toLowerCase();
    if (!term) return distinctProducts.slice(0, 50);
    return distinctProducts.filter((p) => p.toLowerCase().includes(term)).slice(0, 50);
  }, [distinctProducts, searchText]);

  const shouldShowOptions =
    (searchText.trim().length > 0 || !selectedProduct) && filteredProducts.length > 0;

  const handleSelectProduct = (name: string) => {
    setSelectedProduct(name);
    setSearchText(name);
  };

  const handleClearProduct = () => {
    setSelectedProduct(null);
    setSearchText("");
  };

  const handleSearch = () => {
    setQuery({
      produtoTerm: selectedProduct ?? "",
      dataInicio: dataInicioInput,
      dataFim: dataFimInput,
      categoriaIds: categoriaIdsInput,
    });
  };

  const handleToggleCategory = (id: string) => {
    setCategoriaIdsInput((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const chartData = monthly.map((m) => ({
    mes: m.mes,
    quantidade: Number(m.totalQtd.toFixed(2)),
    precoMedio: Number(m.precoMedio.toFixed(2)),
    totalGasto: Number(m.totalGasto.toFixed(2)),
    diffValor: m.diffValor ?? null,
    diffPercent: m.diffPercent ?? null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Análise de produtos</h1>
          <p className="text-sm text-slate-400">Acompanhe preços e quantidades por item de cupom.</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <h2 className="text-lg font-semibold">Filtros</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm text-slate-300">Produto</label>
            <div className="relative">
              <input
                className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm pr-20"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  if (!e.target.value) setSelectedProduct(null);
                }}
                placeholder="Ex: carne, leite, arroz..."
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {selectedProduct && (
                  <button
                    className="text-xs text-slate-300 hover:text-emerald-300"
                    onClick={handleClearProduct}
                  >
                    Limpar
                  </button>
                )}
              </div>
              {shouldShowOptions && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-md border border-slate-800 bg-slate-900 text-sm shadow-lg">
                  {filteredProducts.map((p) => (
                    <button
                      key={p}
                      className={`block w-full px-3 py-2 text-left hover:bg-slate-800 ${
                        selectedProduct === p ? "bg-slate-800/80" : ""
                      }`}
                      onClick={() => handleSelectProduct(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
              {!filteredProducts.length && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">
                  Nenhum produto encontrado
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-300">Data início</label>
            <input
              type="date"
              className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              value={dataInicioInput}
              onChange={(e) => setDataInicioInput(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-300">Data fim</label>
            <input
              type="date"
              className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              value={dataFimInput}
              onChange={(e) => setDataFimInput(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-slate-200">Categorias</p>
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => {
              const checked = categoriaIdsInput.includes(cat.id);
              return (
                <label
                  key={cat.id}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                    checked ? "border-emerald-500 bg-emerald-500/10" : "border-slate-800 bg-slate-950"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="accent-emerald-500"
                    checked={checked}
                    onChange={() => handleToggleCategory(cat.id)}
                  />
                  <span className="text-slate-100">{cat.name}</span>
                </label>
              );
            })}
            {!categories.length && <p className="text-sm text-slate-500">Nenhuma categoria cadastrada.</p>}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-500"
            onClick={handleSearch}
          >
            Buscar
          </button>
        </div>
      </div>

      {selectedProduct ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <MetricCard
              title="Total comprado"
              value={`${summary.totalQtdPeriodo.toFixed(2)}`}
              subtitle={summary.produto || "Produto"}
            />
            <MetricCard
              title="Total gasto"
              value={formatCurrency(summary.totalGastoPeriodo)}
              subtitle="Período selecionado"
            />
            <MetricCard
              title="Preço médio"
              value={formatCurrency(summary.precoMedioPeriodo)}
              subtitle="Gasto / quantidade"
            />
            <MetricCard
              title="Compras"
              value={summary.numCompras.toString()}
              subtitle="Notas com este item"
            />
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Série mensal</h2>
              <span className="text-xs text-slate-500">Preço médio e quantidade</span>
            </div>
            <div className="mt-4 h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="mes" stroke="#94a3b8" />
                  <YAxis yAxisId="left" stroke="#94a3b8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#c084fc" />
                  <Tooltip
                    formatter={(value, name, entry) => {
                      if (name === "Preço médio") return [formatCurrency(Number(value)), "Preço médio"];
                      if (name === "Total gasto") return [formatCurrency(Number(value)), "Total gasto"];
                      if (name === "Qtd") return [Number(value).toFixed(2), "Qtd"];
                      if (name === "Dif. R$") {
                        const v = entry.payload?.diffValor;
                        return [v === null ? "-" : formatCurrency(Number(v)), "Dif. R$"];
                      }
                      if (name === "Dif. %") {
                        const v = entry.payload?.diffPercent;
                        if (v === null || v === undefined) return ["-", "Dif. %"];
                        return [`${v >= 0 ? "+" : ""}${v.toFixed(1)}%`, "Dif. %"];
                      }
                      return [Number(value).toFixed(2), name];
                    }}
                    contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="quantidade" name="Qtd" fill="#22c55e">
                    <LabelList
                      dataKey="quantidade"
                      position="top"
                      formatter={(value) => Number(value ?? 0).toFixed(2)}
                      fill="#e5e7eb"
                      fontSize={10}
                    />
                  </Bar>
                  <Bar yAxisId="left" dataKey="totalGasto" name="Total gasto" fill="#0ea5e9">
                    <LabelList
                      dataKey="totalGasto"
                      position="top"
                      formatter={(value) => formatCurrency(Number(value ?? 0))}
                      fill="#e5e7eb"
                      fontSize={10}
                    />
                  </Bar>
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="precoMedio"
                    name="Preço médio"
                    stroke="#c084fc"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">Tabela mês a mês</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="py-2 text-left">Mês</th>
                    <th className="py-2 text-left">Qtd total</th>
                    <th className="py-2 text-left">Total gasto</th>
                    <th className="py-2 text-left">Preço médio</th>
                    <th className="py-2 text-left">Dif. R$</th>
                    <th className="py-2 text-left">Dif. %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {monthly.map((m) => (
                    <tr key={m.mes}>
                      <td className="py-2">{m.mes}</td>
                      <td className="py-2">{m.totalQtd.toFixed(2)}</td>
                      <td className="py-2">{formatCurrency(m.totalGasto)}</td>
                      <td className="py-2">{formatCurrency(m.precoMedio)}</td>
                      <td className="py-2">
                        {m.diffValor === undefined ? "-" : formatCurrency(m.diffValor)}
                      </td>
                      <td className="py-2">
                        {m.diffPercent === undefined
                          ? "-"
                          : `${m.diffPercent >= 0 ? "+" : ""}${m.diffPercent.toFixed(1)}%`}
                      </td>
                    </tr>
                  ))}
                  {!monthly.length && (
                    <tr>
                      <td colSpan={6} className="py-3 text-center text-slate-400">
                        Nenhum dado para o filtro selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/50 p-6 text-center text-sm text-slate-400">
          Selecione um produto para ver a análise.
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
      <p className="text-xs text-slate-400">{title}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}
