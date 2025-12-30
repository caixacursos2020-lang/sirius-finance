import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  ComposedChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import { useFinance } from "../contexts/FinanceContext";
import { useCategories } from "../contexts/CategoriesContext";
import { formatCurrency } from "../utils/formatters";
import {
  ENTRADAS_COLOR,
  SAIDAS_COLOR,
} from "../constants/chartColors";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

type MonthStat = {
  mes: string; // YYYY-MM
  entradas: number;
  saidas: number;
  saldo: number;
  diffEntradasPercent?: number;
  diffSaidasPercent?: number;
  pctEntradasMes: number;
  pctSaidasMes: number;
};


const renderSaldoLabel = (props: any) => {
  const { x, y, value } = props;
  if (value == null) return null;
  return (
    <text
      x={x}
      y={y}
      dy={-6}
      textAnchor="middle"
      fill="#facc15"
      fontSize={11}
      filter="url(#saldoLabelShadow)"
    >
      {formatCurrency(Number(value ?? 0))}
    </text>
  );
};

type MonthlyPoint = {
  key: string;
  label: string;
  month: number;
  year: number;
  entradas: number;
  saidas: number;
  saldo: number;
  diffEntradasPercent?: number;
  diffSaidasPercent?: number;
};

export default function CompareMonthsPage() {
  const { expenses, incomes } = useFinance();
  const { categories } = useCategories();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [startMonth, setStartMonth] = useState(0);
  const [endMonth, setEndMonth] = useState(now.getMonth());
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  const categoryIdByName = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.name.toLowerCase(), c.id));
    return map;
  }, [categories]);

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  useEffect(() => {
    if (endMonth < startMonth) {
      setEndMonth(startMonth);
    }
  }, [endMonth, startMonth]);

  const monthsRange = useMemo(() => {
    const list: { label: string; month: number; year: number }[] = [];
    for (let m = startMonth; m <= endMonth; m++) {
      list.push({
        label: `${year}-${String(m + 1).padStart(2, "0")}`,
        month: m,
        year,
      });
    }
    return list;
  }, [startMonth, endMonth, year]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (!e.date) return false;
      const d = new Date(e.date);
      if (d.getFullYear() !== year) return false;
      const m = d.getMonth();
      if (m < startMonth || m > endMonth) return false;
      if (!selectedCategoryIds.length) return true;
      if (e.categoryId && selectedCategoryIds.includes(e.categoryId)) return true;
      if (e.category) {
        const mappedId = categoryIdByName.get(e.category.toLowerCase());
        if (mappedId && selectedCategoryIds.includes(mappedId)) return true;
      }
      return false;
    });
  }, [categoryIdByName, endMonth, expenses, selectedCategoryIds, startMonth, year]);

  const filteredIncomes = useMemo(() => {
    return incomes.filter((i) => {
      if (!i.date) return false;
      const d = new Date(i.date);
      if (d.getFullYear() !== year) return false;
      const m = d.getMonth();
      return m >= startMonth && m <= endMonth;
    });
  }, [endMonth, incomes, startMonth, year]);

  const monthlyStats: MonthStat[] = useMemo(() => {
    const map = new Map<string, MonthStat>();
    monthsRange.forEach((m) => {
      map.set(m.label, {
        mes: m.label,
        entradas: 0,
        saidas: 0,
        saldo: 0,
        pctEntradasMes: 0,
        pctSaidasMes: 0,
      });
    });

    filteredExpenses.forEach((e) => {
      if (!e.date) return;
      const key = e.date.slice(0, 7);
      const month = map.get(key);
      if (!month) return;
      month.saidas += Math.abs(e.amount);
    });

    filteredIncomes.forEach((i) => {
      if (!i.date) return;
      const key = i.date.slice(0, 7);
      const month = map.get(key);
      if (!month) return;
      month.entradas += i.amount;
    });

    const sorted = Array.from(map.values()).sort((a, b) => a.mes.localeCompare(b.mes));
    return sorted.map((m, idx, arr) => {
      const saldo = m.entradas - m.saidas;
      if (idx === 0) return { ...m, saldo };
      const prev = arr[idx - 1];
      const diffEntradasPercent = prev.entradas ? ((m.entradas - prev.entradas) / prev.entradas) * 100 : undefined;
      const diffSaidasPercent = prev.saidas ? ((m.saidas - prev.saidas) / prev.saidas) * 100 : undefined;
      return { ...m, saldo, diffEntradasPercent, diffSaidasPercent };
    });
  }, [filteredExpenses, filteredIncomes, monthsRange]);

  const totalEntradas = monthlyStats.reduce((acc, m) => acc + m.entradas, 0);
  const totalSaidas = monthlyStats.reduce((acc, m) => acc + m.saidas, 0);
  const saldoPeriodo = totalEntradas - totalSaidas;

  const chartData: MonthlyPoint[] = monthlyStats.map((m) => {
    const monthIdx = Number(m.mes.slice(5, 7)) - 1;
    const yearNum = Number(m.mes.slice(0, 4));
    const totalMes = m.entradas + m.saidas;
    const pctEntradasMes = totalMes > 0 ? (m.entradas / totalMes) * 100 : 0;
    const pctSaidasMes = totalMes > 0 ? (m.saidas / totalMes) * 100 : 0;
    return {
      key: m.mes,
      label: `${MONTHS[monthIdx]}/${String(yearNum).slice(-2)}`,
      month: monthIdx,
      year: yearNum,
      entradas: m.entradas,
      saidas: m.saidas,
      saldo: m.saldo,
      diffEntradasPercent: m.diffEntradasPercent,
      diffSaidasPercent: m.diffSaidasPercent,
      pctEntradasMes,
      pctSaidasMes,
    };
  });

  const totalIncomesFiltered = useMemo(
    () => filteredIncomes.reduce((acc, inc) => acc + inc.amount, 0),
    [filteredIncomes]
  );

  const totalExpensesFiltered = useMemo(
    () => filteredExpenses.reduce((acc, exp) => acc + Math.abs(exp.amount), 0),
    [filteredExpenses]
  );

  const saldoFiltered = useMemo(
    () => totalIncomesFiltered - totalExpensesFiltered,
    [totalExpensesFiltered, totalIncomesFiltered]
  );

  const percentSaidasSobreEntradas = useMemo(() => {
    if (totalIncomesFiltered === 0 && totalExpensesFiltered === 0) return 0;
    if (totalIncomesFiltered === 0 && totalExpensesFiltered > 0) return Infinity;
    return (totalExpensesFiltered / totalIncomesFiltered) * 100;
  }, [totalExpensesFiltered, totalIncomesFiltered]);

  const renderTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const entry = payload[0].payload as (typeof chartData)[0];
    return (
      <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100">
        <p className="font-semibold mb-1">{label}</p>
        <p>Entradas: {formatCurrency(entry.entradas)}</p>
        <p>Saídas: {formatCurrency(entry.saidas)}</p>
        <p>Saldo: {formatCurrency(entry.saldo)}</p>
        {entry.diffEntradasPercent !== undefined && (
          <p>Var. Entradas: {entry.diffEntradasPercent >= 0 ? "+" : ""}
            {entry.diffEntradasPercent.toFixed(1)}%</p>
        )}
        {entry.diffSaidasPercent !== undefined && (
          <p>Var. Saídas: {entry.diffSaidasPercent >= 0 ? "+" : ""}
            {entry.diffSaidasPercent.toFixed(1)}%</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Cruzar dados</h1>
          <p className="text-sm text-slate-400">Comparação mensal de entradas e saídas com filtros.</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
          <h2 className="text-lg font-semibold">Ano</h2>
          <input
            type="number"
            className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          />
        </div>

        <MonthRangePicker
          title="Período (meses)"
          startMonth={startMonth}
          endMonth={endMonth}
          onChangeStart={setStartMonth}
          onChangeEnd={setEndMonth}
        />

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
          <h2 className="text-lg font-semibold">Categorias (saídas)</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const checked = selectedCategoryIds.includes(cat.id);
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
                    onChange={() => toggleCategory(cat.id)}
                  />
                  <span className="text-slate-100">{cat.name}</span>
                </label>
              );
            })}
            {!categories.length && (
              <p className="text-sm text-slate-500">Nenhuma categoria cadastrada.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Entradas (período filtrado)"
          value={formatCurrency(totalIncomesFiltered)}
          subtitle="Somando todas as entradas que respeitam os filtros atuais."
        />
        <MetricCard
          title="Saídas (período filtrado)"
          value={formatCurrency(totalExpensesFiltered)}
          subtitle="Somando todas as saídas que respeitam os filtros atuais."
        />
        <MetricCard
          title="Saldo (Entradas - Saídas)"
          valueClassName={saldoFiltered >= 0 ? "text-emerald-300" : "text-rose-300"}
          value={formatCurrency(saldoFiltered)}
          subtitle={
            saldoFiltered >= 0
              ? "Você está no positivo neste recorte."
              : "Você gastou mais do que entrou neste recorte."
          }
        />
        <MetricCard
          title="Relação saídas x entradas"
          value={
            percentSaidasSobreEntradas === Infinity
              ? "∞% das entradas"
              : `${percentSaidasSobreEntradas.toFixed(1)}% das entradas`
          }
          subtitle={
            percentSaidasSobreEntradas > 100
              ? `As saídas representam ${percentSaidasSobreEntradas === Infinity ? "∞" : percentSaidasSobreEntradas.toFixed(1)}% das entradas (você gastou mais do que entrou).`
              : `As saídas representam ${percentSaidasSobreEntradas === Infinity ? "∞" : percentSaidasSobreEntradas.toFixed(1)}% das entradas (situação equilibrada ou positiva).`
          }
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <MetricCard title="Total de entradas" value={formatCurrency(totalEntradas)} subtitle="Período filtrado" />
        <MetricCard title="Total de saídas" value={formatCurrency(totalSaidas)} subtitle="Categorias selecionadas" />
        <MetricCard title="Saldo" value={formatCurrency(saldoPeriodo)} subtitle="Entradas - Saídas" />
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Gráfico mensal</h2>
          <span className="text-xs text-slate-500">Entradas, saídas e saldo</span>
        </div>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 40, right: 24, bottom: 24, left: 0 }}
            >
              <defs>
                <filter id="saldoLabelShadow" x="-30%" y="-30%" width="160%" height="160%">
                  <feDropShadow
                    dx="0"
                    dy="1.5"
                    stdDeviation="3"
                    floodColor="#000000"
                    floodOpacity="0.9"
                  />
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="label" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" tickFormatter={(val) => `R$ ${val / 1000}k`} />
              <Tooltip content={renderTooltip} />
              <Legend />
              <Bar
                dataKey="saidas"
                name="Saídas"
                fill={SAIDAS_COLOR}
                radius={[4, 4, 0, 0]}
              >
                <LabelList
                  dataKey="saidas"
                  position="top"
                  formatter={(value) =>
                    Number(value ?? 0) > 0 ? formatCurrency(Number(value ?? 0)) : ""
                  }
                  className="text-[11px] fill-slate-100"
                />
                <LabelList
                  dataKey="pctSaidasMes"
                  position="insideBottom"
                  formatter={(value) => `${Number(value ?? 0).toFixed(1)}%`}
                  className="text-[11px] fill-slate-100"
                />
              </Bar>
              <Bar
                dataKey="entradas"
                name="Entradas"
                fill={ENTRADAS_COLOR}
                radius={[4, 4, 0, 0]}
              >
                <LabelList
                  dataKey="entradas"
                  position="top"
                  formatter={(value) =>
                    Number(value ?? 0) > 0 ? formatCurrency(Number(value ?? 0)) : ""
                  }
                  className="text-[11px] fill-slate-100"
                />
                <LabelList
                  dataKey="pctEntradasMes"
                  position="insideBottom"
                  formatter={(value) => `${Number(value ?? 0).toFixed(1)}%`}
                  className="text-[11px] fill-slate-100"
                />
              </Bar>
              <Line
                type="monotone"
                dataKey="saldo"
                name="Saldo"
                stroke="#fbbf24"
                strokeWidth={2}
                dot={{
                  r: 4,
                  stroke: "#fbbf24",
                  strokeWidth: 1,
                  fill: "#0f172a",
                }}
                activeDot={{ r: 5 }}
              >
                <LabelList
                  dataKey="saldo"
                  position="top"
                  content={renderSaldoLabel}
                />
              </Line>
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
                <th className="py-2 text-left">Entradas</th>
                <th className="py-2 text-left">Saídas</th>
                <th className="py-2 text-left">Saldo</th>
                <th className="py-2 text-left">Var. Entradas %</th>
                <th className="py-2 text-left">Var. Saídas %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {monthlyStats.map((m) => (
                <tr key={m.mes}>
                  <td className="py-2">{m.mes}</td>
                  <td className="py-2">{formatCurrency(m.entradas)}</td>
                  <td className="py-2">{formatCurrency(m.saidas)}</td>
                  <td className="py-2">{formatCurrency(m.saldo)}</td>
                  <td className="py-2">
                    {m.diffEntradasPercent === undefined
                      ? "-"
                      : `${m.diffEntradasPercent >= 0 ? "+" : ""}${m.diffEntradasPercent.toFixed(1)}%`}
                  </td>
                  <td className="py-2">
                    {m.diffSaidasPercent === undefined
                      ? "-"
                      : `${m.diffSaidasPercent >= 0 ? "+" : ""}${m.diffSaidasPercent.toFixed(1)}%`}
                  </td>
                </tr>
              ))}
              {!monthlyStats.length && (
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
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  valueClassName,
}: {
  title: string;
  value: string;
  subtitle: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
      <p className="text-xs text-slate-400">{title}</p>
      <p className={`mt-1 text-lg font-semibold text-slate-100 ${valueClassName ?? ""}`}>{value}</p>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

function MonthRangePicker({
  title,
  startMonth,
  endMonth,
  onChangeStart,
  onChangeEnd,
}: {
  title: string;
  startMonth: number;
  endMonth: number;
  onChangeStart: (m: number) => void;
  onChangeEnd: (m: number) => void;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className="space-y-1">
          <label className="block text-sm font-medium">Início</label>
          <select
            className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
            value={startMonth}
            onChange={(e) => onChangeStart(Number(e.target.value))}
          >
            {MONTHS.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium">Fim</label>
          <select
            className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
            value={endMonth}
            onChange={(e) => onChangeEnd(Number(e.target.value))}
          >
            {MONTHS.map((m, idx) => (
              <option key={m} value={idx}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
