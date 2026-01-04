// src/FinanceDashboard.tsx
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Wallet2, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import {
  useFinance,
  type Expense,
  type ExpenseStatus,
  type Income,
} from "./contexts/FinanceContext";
import { supabase } from "./supabaseClient";
import { useCategories } from "./contexts/CategoriesContext";
import ReceiptImportModal from "./components/receipts/ReceiptImportModal";
import { formatCurrency, formatDate } from "./utils/formatters";
import {
  ENTRADAS_COLOR,
  SAIDAS_COLOR,
  SALDO_COLOR,
} from "./constants/chartColors";
import {
  getMonthlySummary,
  getCategoryMonthComparison,
  getMonthTrend,
  getIncomeCommitment,
} from "./utils/finance";
import type { MonthlySummary } from "./types/finance";
import PriceResearchPanel from "./components/prices/PriceResearchPanel";

type CategoryDonutItem = {
  id: string;
  name: string;
  total: number;
  percent: number;
  color: string;
  date?: string; // opcional – usado no detalhamento
};

const TITLE_SHADOW = {
  textShadow:
    "0 3px 10px rgba(0,0,0,0.95), 0 0 12px rgba(0,0,0,0.75), 0 0 18px rgba(0,0,0,0.6)",
};

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="text-right text-slate-100">{value}</span>
    </div>
  );
}

// --- Modais ---

function ExpenseDetailModal({
  expense,
  onClose,
  onToggleStatus,
  onConfirm,
  onEdit,
}: {
  expense: Expense;
  onClose: () => void;
  onToggleStatus: (status: ExpenseStatus) => void;
  onConfirm: () => void;
  onEdit: () => void;
}) {
  const { paymentMethods } = useFinance();

  const getPaymentMethodName = (id: string | null | undefined): string => {
    if (!id) return "Não informado / Outro";
    const method = paymentMethods.find((m) => m.id === id);
    return method?.name ?? "Não informado / Outro";
  };

  const nextStatus: ExpenseStatus =
    expense.status === "paga" ? "pendente" : "paga";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3
            className="text-lg font-semibold text-slate-100"
            style={TITLE_SHADOW}
          >
            Detalhes da saída
          </h3>
          <button
            className="text-sm text-slate-400 hover:text-slate-200"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <DetailRow label="Descrição" value={expense.description} />
          {expense.receiptStore && (
            <DetailRow label="Loja" value={expense.receiptStore} />
          )}
          <DetailRow label="Categoria" value={expense.category} />
          <DetailRow
            label="Valor"
            value={
              <span className="text-rose-300">
                - {formatCurrency(Math.abs(expense.amount))}
              </span>
            }
          />
          <DetailRow label="Data da saída" value={formatDate(expense.date)} />
          <DetailRow
            label="Data de vencimento"
            value={expense.dueDate ? formatDate(expense.dueDate) : "-"}
          />
          <DetailRow
            label="Tipo"
            value={expense.isFixed ? "Conta fixa" : "Gasto avulso"}
          />
          <DetailRow
            label="Situação"
            value={
              <span
                className={
                  expense.status === "paga"
                    ? "text-emerald-300"
                    : "text-amber-300"
                }
              >
                {expense.status === "paga" ? "Paga" : "Pendente"}
              </span>
            }
          />
          <DetailRow
            label="Recorrência"
            value={
              expense.isRecurring
                ? `Todo dia ${expense.recurrenceDay ?? "-"}`
                : "Não recorrente"
            }
          />
          <DetailRow
            label="Forma de pagamento"
            value={getPaymentMethodName(expense.paymentMethodId)}
          />

          {(expense.category.toLowerCase() === "gasolina" ||
            expense.fuelLiters ||
            expense.fuelPricePerLiter ||
            expense.fuelStation ||
            expense.fuelType) && (
            <div className="mt-2 space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between text-slate-200">
                <span className="text-sm font-semibold">
                  Detalhes do abastecimento
                </span>
              </div>
              <div className="space-y-1 text-sm">
                {expense.fuelLiters !== undefined && (
                  <DetailRow
                    label="Litros abastecidos"
                    value={`${expense.fuelLiters.toFixed(2)} L`}
                  />
                )}
                {expense.fuelPricePerLiter !== undefined && (
                  <DetailRow
                    label="Preço por litro"
                    value={formatCurrency(expense.fuelPricePerLiter)}
                  />
                )}
                {expense.fuelStation && (
                  <DetailRow
                    label="Posto / Estabelecimento"
                    value={expense.fuelStation}
                  />
                )}
                {expense.fuelType && (
                  <DetailRow
                    label="Tipo de gasolina"
                    value={expense.fuelType}
                  />
                )}
              </div>
            </div>
          )}

          {expense.isReceipt && expense.receiptItems?.length ? (
            <div className="mt-2 space-y-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center justify-between text-slate-200">
                <span className="text-sm font-semibold">
                  Detalhes do cupom
                </span>
                <span className="text-xs text-slate-400">
                  {expense.receiptItems.length} itens
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto overflow-x-hidden">
                <table className="min-w-full text-xs">
                  <thead className="border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="py-1 text-left">Item</th>
                      <th className="py-1 text-right">Qtd</th>
                      <th className="py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {expense.receiptItems.map((item) => (
                      <tr key={item.id}>
                        <td className="max-w-[150px] truncate py-1 pr-2 text-slate-100">
                          {item.description}
                        </td>
                        <td className="py-1 text-right text-slate-200">
                          {item.quantity || 1}
                        </td>
                        <td className="py-1 text-right text-rose-200">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            className="rounded-md border border-emerald-600 px-3 py-2 text-sm text-emerald-300 transition-colors hover:bg-emerald-600/10"
            onClick={() => onToggleStatus(nextStatus)}
          >
            Marcar como {nextStatus === "paga" ? "paga" : "pendente"}
          </button>
          <button
            className="rounded-md border border-sky-600 px-3 py-2 text-sm text-sky-300 transition-colors hover:bg-sky-600/10"
            onClick={onEdit}
          >
            Editar saída
          </button>
          <button
            className="rounded-md border border-rose-600 px-3 py-2 text-sm text-rose-300 transition-colors hover:bg-rose-600/10"
            onClick={onConfirm}
          >
            Excluir saída
          </button>
        </div>
      </div>
    </div>
  );
}

function IncomeDetailModal({
  income,
  onClose,
  onConfirm,
  onEdit,
}: {
  income: Income;
  onClose: () => void;
  onConfirm: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <h3
            className="text-lg font-semibold text-slate-100"
            style={TITLE_SHADOW}
          >
            Detalhes da entrada
          </h3>
          <button
            className="text-sm text-slate-400 hover:text-slate-200"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>

        <div className="mt-4 space-y-3 text-sm">
          <DetailRow label="Descrição" value={income.description} />
          <DetailRow label="Fonte" value={income.source} />
          <DetailRow
            label="Valor"
            value={
              <span className="text-emerald-300">
                {formatCurrency(income.amount)}
              </span>
            }
          />
          <DetailRow label="Data" value={formatDate(income.date)} />
          <DetailRow label="Criado em" value={formatDate(income.createdAt)} />
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button
            className="rounded-md border border-sky-600 px-3 py-2 text-sm text-sky-300 transition-colors hover:bg-sky-600/10"
            onClick={onEdit}
          >
            Editar entrada
          </button>
          <button
            className="rounded-md border border-rose-600 px-3 py-2 text-sm text-rose-300 transition-colors hover:bg-rose-600/10"
            onClick={onConfirm}
          >
            Excluir entrada
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Charts ---

type MonthlyTooltipItem = {
  dataKey?: string | number;
  value?: number | string;
};

const MonthlyEvolutionTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: MonthlyTooltipItem[];
  label?: string | number;
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const entradas = Number(
    payload.find((p) => p.dataKey === "entradas")?.value ?? 0,
  );
  const saidas = Number(
    payload.find((p) => p.dataKey === "saidas")?.value ?? 0,
  );
  const saldo = Number(
    payload.find((p) => p.dataKey === "saldo")?.value ?? 0,
  );

  const percentualEntradasMes = Number(
    payload.find((p) => p.dataKey === "percentualEntradasMes")?.value ?? 0,
  );
  const percentualSaidasMes = Number(
    payload.find((p) => p.dataKey === "percentualSaidasMes")?.value ?? 0,
  );

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-medium text-slate-100">{label}</div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-[11px] text-blue-200">Entradas:</span>
          <span className="text-[11px] text-blue-100">
            {formatCurrency(entradas)}{" "}
            <span className="text-blue-300">
              ({percentualEntradasMes.toFixed(1)}%)
            </span>
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[11px] text-red-200">Saídas:</span>
          <span className="text-[11px] text-red-100">
            {formatCurrency(saidas)}{" "}
            <span className="text-red-300">
              ({percentualSaidasMes.toFixed(1)}%)
            </span>
          </span>
        </div>
        <div className="mt-1 flex justify-between gap-4 border-t border-slate-700 pt-1">
          <span className="text-[11px] text-slate-300">Diferença:</span>
          <span className="text-[11px] text-slate-100">
            {formatCurrency(saldo)}
          </span>
        </div>
      </div>
    </div>
  );
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

// Donut Chart Custom Label
const renderCustomLabel = (props: any) => {
  const { cx, cy, midAngle, outerRadius, fill, payload, value } = props;
  const RADIAN = Math.PI / 180;

  const radius = outerRadius + 28;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <g filter="url(#labelShadow)">
      <text
        x={x}
        y={y}
        fill={fill}
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
      >
        <tspan x={x} dy="-1.1em" fontSize="16" fontWeight="700">
          {payload.name}
        </tspan>
        <tspan x={x} dy="1.2em" fontSize="14" fill="#FFFFFF">
          {formatCurrency(value)}
        </tspan>
        <tspan x={x} dy="1.1em" fontSize="13" fill={fill}>
          {payload.percent.toFixed(1)}%
        </tspan>
      </text>
    </g>
  );
};

const renderDonutTooltip = (props: any) => {
  const { active, payload } = props;
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload as CategoryDonutItem;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl">
      <strong className="mb-1 block text-sm text-slate-100">
        {item.name}
      </strong>
      <div className="text-xs text-slate-300">
        Total: {formatCurrency(item.total)}
      </div>
      <div className="text-xs text-sky-300">
        Participação: {item.percent.toFixed(1)}%
      </div>
    </div>
  );
};

function CategoryDetailsPanel({
  category,
  monthLabel,
  expenses,
  onClear,
  onExpenseClick,
}: {
  category: string;
  monthLabel: string;
  expenses: Expense[];
  onClear: () => void;
  onExpenseClick: (expense: Expense) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2
            className="text-sm font-semibold text-slate-100"
            style={TITLE_SHADOW}
          >
            Detalhes da Categoria
          </h2>
          <p className="text-xs text-slate-400">
            Categoria selecionada: {category} · {monthLabel}
          </p>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-emerald-400 hover:text-emerald-300"
        >
          Limpar seleção
        </button>
      </div>

      <div className="max-h-[320px] space-y-2 overflow-y-auto pr-2">
        {expenses.map((expense) => (
          <button
            key={expense.id}
            onClick={() => onExpenseClick(expense)}
            className="w-full cursor-pointer rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 text-left transition-colors hover:bg-slate-800/60"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-100">
                  {expense.description}
                </p>
                <p className="text-xs text-slate-500">
                  {formatDate(expense.date)}
                </p>
              </div>
              <p className="text-sm font-semibold text-rose-300">
                - {formatCurrency(Math.abs(expense.amount))}
              </p>
            </div>
          </button>
        ))}
        {expenses.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-500">
            Nenhuma saída nesta Categoria.
          </p>
        )}
      </div>
    </div>
  );
}

// --- Componente principal ---

export default function FinanceDashboard() {
  const {
    expenses,
    incomes,
    loading,
    loadIncomes,
    loadExpenses,
    updateExpenseStatus,
  } = useFinance();
  const { categories, loading: loadingCategories } = useCategories();
  const navigate = useNavigate();

  const now = new Date();
  const [selectedCategory, setSelectedCategory] =
    useState<string | "todas">("todas");
  const [viewMode, setViewMode] = useState<"geral" | "saidas" | "entradas">(
    "geral",
  );
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(
    null,
  );
  const [selectedIncomeId, setSelectedIncomeId] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [isReceiptModalOpen, setReceiptModalOpen] = useState(false);
  const initialLoad = useRef(false);

  useEffect(() => {
    if (initialLoad.current) return;
    initialLoad.current = true;
    loadIncomes();
    loadExpenses();
  }, [loadExpenses, loadIncomes]);

  const colorFallbacks = [
    "#0EA5E9",
    "#EC4899",
    "#8B5CF6",
    "#22C55E",
    "#EAB308",
    "#F97316",
    "#64748B",
  ];

  const categoryPalette = useMemo(() => {
    const palette = new Map<string, string>();
    categories.forEach((c) => palette.set(c.name, c.color));
    expenses.forEach((e, idx) => {
      if (!palette.has(e.category)) {
        palette.set(e.category, colorFallbacks[idx % colorFallbacks.length]);
      }
    });
    return palette;
  }, [categories, expenses]);

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((expense) => {
        if (!expense.date) return false;
        const d = new Date(expense.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      }),
    [expenses, selectedMonth, selectedYear],
  );

  const incomesDoMes = useMemo(
    () =>
      incomes.filter((income) => {
        if (!income.date) return false;
        const d = new Date(income.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      }),
    [incomes, selectedMonth, selectedYear],
  );

  const totalSaidas = useMemo(
    () =>
      filteredExpenses.reduce(
        (acc, expense) => acc + Math.abs(expense.amount),
        0,
      ),
    [filteredExpenses],
  );

  const totalEntradas = useMemo(
    () => incomesDoMes.reduce((acc, income) => acc + income.amount, 0),
    [incomesDoMes],
  );

  const saldoMes = totalEntradas - totalSaidas;

  // Donut de Categorias
  const categoryStats = useMemo<CategoryDonutItem[]>(() => {
    const map = new Map<string, { total: number; count: number; color: string }>();

    filteredExpenses.forEach((expense) => {
      const current =
        map.get(expense.category) ??
        {
          total: 0,
          count: 0,
          color: categoryPalette.get(expense.category) ?? colorFallbacks[0],
        };
      current.total += Math.abs(expense.amount);
      current.count += 1;
      map.set(expense.category, current);
    });

    const result: CategoryDonutItem[] = [];
    map.forEach((value, key) => {
      if (value.total > 0) {
        result.push({
          id: key,
          name: key,
          total: value.total,
          percent: totalSaidas ? (value.total / totalSaidas) * 100 : 0,
          color: value.color,
        });
      }
    });

    return result.sort((a, b) => b.total - a.total);
  }, [filteredExpenses, categoryPalette, totalSaidas]);

  // Evolução mensal e resumos inteligentes
  const monthlyEvolution: MonthlySummary[] = useMemo(
    () => getMonthlySummary(expenses, incomes, selectedYear),
    [expenses, incomes, selectedYear],
  );

  const categoryComparisons = useMemo(
    () => getCategoryMonthComparison(expenses, selectedYear, selectedMonth),
    [expenses, selectedYear, selectedMonth],
  );

  const [categoryHighlightIndex, setCategoryHighlightIndex] = useState(0);

  useEffect(() => {
    if (!categoryComparisons.length) {
      setCategoryHighlightIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setCategoryHighlightIndex(
        (prev) => (prev + 1) % categoryComparisons.length,
      );
    }, 7000);
    return () => clearInterval(interval);
  }, [categoryComparisons.length]);

  const highlightedCategory =
    categoryComparisons.length > 0
      ? categoryComparisons[categoryHighlightIndex % categoryComparisons.length]
      : null;

  const monthTrend = useMemo(
    () => getMonthTrend(expenses, selectedYear, selectedMonth),
    [expenses, selectedYear, selectedMonth],
  );

  const incomeCommitment = useMemo(
    () => getIncomeCommitment(incomes, expenses, selectedYear, selectedMonth),
    [incomes, expenses, selectedYear, selectedMonth],
  );

  const hasCategorySelected = selectedCategory !== "todas";

  const baseExpenses = useMemo(
    () =>
      hasCategorySelected
        ? filteredExpenses.filter((e) => e.category === selectedCategory)
        : filteredExpenses,
    [filteredExpenses, hasCategorySelected, selectedCategory],
  );

  const despesasOrdenadas = useMemo(
    () =>
      [...baseExpenses].sort((a, b) =>
        (b.date || "").localeCompare(a.date || "", undefined, {
          sensitivity: "base",
        }),
      ),
    [baseExpenses],
  );

  const topExpenses = useMemo(
    () => despesasOrdenadas.slice(0, 5),
    [despesasOrdenadas],
  );

  const selectedExpense = useMemo(
    () => despesasOrdenadas.find((d) => d.id === selectedExpenseId) ?? null,
    [despesasOrdenadas, selectedExpenseId],
  );

  const selectedIncome = useMemo(
    () => incomesDoMes.find((inc) => inc.id === selectedIncomeId) ?? null,
    [incomesDoMes, selectedIncomeId],
  );

  const categoryExpenses = useMemo(
    () =>
      hasCategorySelected
        ? filteredExpenses.filter((e) => e.category === selectedCategory)
        : [],
    [filteredExpenses, hasCategorySelected, selectedCategory],
  );

  const detailedCategoryStats = useMemo<CategoryDonutItem[]>(() => {
    if (!hasCategorySelected) return [];

    const total = categoryExpenses.reduce(
      (acc, expense) => acc + Math.abs(expense.amount),
      0,
    );

    return categoryExpenses
      .map((expense, idx) => ({
        id: expense.id,
        name: expense.description || `Despesa ${idx + 1}`,
        total: Math.abs(expense.amount),
        percent: total ? (Math.abs(expense.amount) / total) * 100 : 0,
        color: colorFallbacks[idx % colorFallbacks.length],
        date: expense.date,
      }))
      .sort((a, b) => b.total - a.total);
  }, [categoryExpenses, colorFallbacks, hasCategorySelected]);

  const handlePrevMonth = () => {
    const date = new Date(selectedYear, selectedMonth, 1);
    date.setMonth(date.getMonth() - 1);
    setSelectedMonth(date.getMonth());
    setSelectedYear(date.getFullYear());
  };

  const handleNextMonth = () => {
    const date = new Date(selectedYear, selectedMonth, 1);
    date.setMonth(date.getMonth() + 1);
    setSelectedMonth(date.getMonth());
    setSelectedYear(date.getFullYear());
  };

  const currentMonthLabel = new Date(
    selectedYear,
    selectedMonth,
    1,
  ).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  if (loading || loadingCategories) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
        Carregando dados...
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto px-4 space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            className="text-xl font-semibold text-slate-100"
            style={TITLE_SHADOW}
          >
            Dashboard
          </h1>
          <p className="text-sm text-slate-400">Visão do mês</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 text-sm text-slate-200">
            <button
              className="rounded-md border border-slate-700 px-2 py-1 transition-colors hover:border-emerald-500 hover:text-emerald-400"
              onClick={handlePrevMonth}
            >
              {"<"}
            </button>
            <span className="min-w-[140px] text-center font-medium capitalize">
              {currentMonthLabel}
            </span>
            <button
              className="rounded-md border border-slate-700 px-2 py-1 transition-colors hover:border-emerald-500 hover:text-emerald-400"
              onClick={handleNextMonth}
            >
              {">"}
            </button>
          </div>
          <button
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-slate-900 transition-colors hover:bg-emerald-500"
            onClick={() => setReceiptModalOpen(true)}
          >
            Importar cupom (beta)
          </button>
        </div>
      </div>

      {/* CARDS RESUMO */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <button
          className={`rounded-xl border px-4 py-3 text-left transition ${
            viewMode === "geral"
              ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
              : "border-slate-800 bg-slate-900 hover:border-emerald-600/60"
          }`}
          onClick={() => setViewMode("geral")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Entradas - Saídas</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">
                {formatCurrency(saldoMes)}
              </p>
              <p className="text-xs text-slate-500">Saldo do mês</p>
            </div>
            <div className="rounded-md bg-slate-800 p-2 text-slate-100">
              <Wallet2 className="h-6 w-6" />
            </div>
          </div>
        </button>

        <button
          className={`rounded-xl border px-4 py-3 text-left transition ${
            viewMode === "entradas"
              ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
              : "border-slate-800 bg-slate-900 hover:border-emerald-600/60"
          }`}
          onClick={() => setViewMode("entradas")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Entradas do período</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">
                {formatCurrency(totalEntradas)}
              </p>
              <p className="text-xs text-slate-500">Total recebido</p>
            </div>
            <div className="rounded-md bg-slate-800 p-2 text-emerald-400">
              <ArrowUpRight className="h-6 w-6" />
            </div>
          </div>
        </button>

        <button
          className={`rounded-xl border px-4 py-3 text-left transition ${
            viewMode === "saidas"
              ? "border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
              : "border-slate-800 bg-slate-900 hover:border-emerald-600/60"
          }`}
          onClick={() => setViewMode("saidas")}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Gastos do período</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">
                {formatCurrency(totalSaidas)}
              </p>
              <p className="text-xs text-slate-500">Total gasto</p>
            </div>
            <div className="rounded-md bg-slate-800 p-2 text-rose-400">
              <ArrowDownRight className="h-6 w-6" />
            </div>
          </div>
        </button>
      </div>

      {/* ÁREA PRINCIPAL */}
      {viewMode === "geral" && (
        <>
          {/* Evolução mensal */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2
                className="text-lg font-semibold text-slate-100"
                style={TITLE_SHADOW}
              >
                Evolução mensal
              </h2>
              <p className="text-xs text-slate-400">
                Entradas x Saídas · Ano de {selectedYear}
              </p>
            </div>
            <div className="mt-4 h-[320px] md:h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={monthlyEvolution}
                  margin={{ top: 24, right: 24, bottom: 16, left: -4 }}
                >
                  <defs>
                    <filter
                      id="saldoLabelShadow"
                      x="-30%"
                      y="-30%"
                      width="160%"
                      height="160%"
                    >
                      <feDropShadow
                        dx="0"
                        dy="1.5"
                        stdDeviation="3"
                        floodColor="#000000"
                        floodOpacity="0.9"
                      />
                    </filter>
                  </defs>
                  <CartesianGrid
                    stroke="#1f2937"
                    strokeDasharray="3 3"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fill: "#cbd5e1", fontSize: 12 }}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                  />
                  <YAxis
                    tick={{ fill: "#cbd5e1", fontSize: 12 }}
                    tickFormatter={(value) =>
                      formatCurrency(Number(value ?? 0))
                    }
                    width={90}
                    tickLine={false}
                    axisLine={{ stroke: "#334155" }}
                  />
                  <RechartsTooltip content={<MonthlyEvolutionTooltip />} />
                  <Legend wrapperStyle={{ color: "#cbd5e1" }} />
                  <Bar
                    dataKey="entradas"
                    name="Entradas"
                    fill={ENTRADAS_COLOR}
                    radius={[6, 6, 0, 0]}
                  >
                    <LabelList
                      dataKey="entradas"
                      position="top"
                      formatter={(value: any) =>
                        Number(value ?? 0) === 0
                          ? ""
                          : formatCurrency(Number(value ?? 0))
                      }
                      className="text-[11px] fill-slate-100"
                    />
                    <LabelList
                      dataKey="percentualEntradasMes"
                      position="insideBottom"
                      formatter={(value: any) =>
                        Number(value ?? 0) === 0
                          ? ""
                          : `${Number(value ?? 0).toFixed(1)}%`
                      }
                      fill="#bfdbfe"
                      className="text-[11px]"
                    />
                  </Bar>
                  <Bar
                    dataKey="saidas"
                    name="Saídas"
                    fill={SAIDAS_COLOR}
                    radius={[6, 6, 0, 0]}
                  >
                    <LabelList
                      dataKey="saidas"
                      position="top"
                      formatter={(value: any) =>
                        Number(value ?? 0) === 0
                          ? ""
                          : formatCurrency(Number(value ?? 0))
                      }
                      className="text-[11px] fill-slate-100"
                    />
                    <LabelList
                      dataKey="percentualSaidasMes"
                      position="insideBottom"
                      formatter={(value: any) =>
                        Number(value ?? 0) === 0
                          ? ""
                          : `${Number(value ?? 0).toFixed(1)}%`
                      }
                      fill="#fecdd3"
                      className="text-[11px]"
                    />
                  </Bar>
                  <Line
                    type="monotone"
                    dataKey="saldo"
                    name="Saldo"
                    stroke={SALDO_COLOR}
                    strokeWidth={2}
                    dot={{
                      r: 4,
                      stroke: SALDO_COLOR,
                      strokeWidth: 2,
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

          {/* Linha 1: Donut + lista de Categorias */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Donut */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-2 flex items-center justify-between">
                <h2
                  className="text-lg font-semibold text-slate-100"
                  style={TITLE_SHADOW}
                >
                  Gastos por Categoria
                </h2>
                <div className="flex flex-col text-right leading-tight">
                  <span className="text-xs text-slate-500 capitalize">
                    {currentMonthLabel}
                  </span>
                  {hasCategorySelected && (
                    <span className="text-xl font-semibold text-emerald-300">
                      {selectedCategory}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex h-full flex-col items-center justify-center">
                <div className="relative h-[380px] w-full overflow-visible">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart
                      margin={{
                        top: 40,
                        right: 60,
                        bottom: 90,
                        left: 60,
                      }}
                    >
                      <defs>
                        <filter
                          id="labelShadow"
                          x="-35%"
                          y="-35%"
                          width="170%"
                          height="170%"
                        >
                          <feDropShadow
                            dx="0"
                            dy="2"
                            stdDeviation="6"
                            floodColor="#000000"
                            floodOpacity="1"
                          />
                        </filter>
                      </defs>

                      <RechartsTooltip content={renderDonutTooltip} />

                      <Pie
                        data={
                          hasCategorySelected
                            ? detailedCategoryStats
                            : categoryStats
                        }
                        dataKey="total"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={72}
                        outerRadius={104}
                        paddingAngle={3}
                        stroke="#0f172a"
                        strokeWidth={4}
                        labelLine={false}
                        label={renderCustomLabel}
                      >
                        {(hasCategorySelected
                          ? detailedCategoryStats
                          : categoryStats
                        ).map((entry) => (
                          <Cell key={entry.id} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Lista de Categorias + detalhes */}
            <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900 p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2
                  className="text-lg font-semibold text-slate-100"
                  style={TITLE_SHADOW}
                >
                  Categorias
                </h2>
                <span className="text-xs text-slate-500 capitalize">
                  {currentMonthLabel}
                </span>
              </div>
              <div className="max-h-[250px] flex-1 space-y-2 overflow-y-auto pr-2">
                <button
                  onClick={() => setSelectedCategory("todas")}
                  className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                    selectedCategory === "todas"
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-slate-800 bg-slate-950 hover:border-emerald-500/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-slate-100" />
                      <span className="text-sm font-medium text-slate-100">
                        Todos
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-100">
                        {formatCurrency(totalSaidas)}
                      </div>
                      <div className="text-xs text-slate-400">100.0%</div>
                    </div>
                  </div>
                </button>

                {categoryStats.map((item) => {
                  const active = selectedCategory === item.name;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedCategory(item.name)}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                        active
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-slate-800 bg-slate-950 hover:border-emerald-500/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ background: item.color }}
                          />
                          <span className="text-sm font-medium text-slate-100">
                            {item.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-slate-100">
                            {formatCurrency(item.total)}
                          </div>
                          <div className="text-xs text-slate-400">
                            {item.percent.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
                {categoryStats.length === 0 && (
                  <p className="py-4 text-center text-sm text-slate-500">
                    Sem dados para exibir.
                  </p>
                )}
              </div>

              <div className="mt-4 border-t border-slate-800/70 pt-4" />

              {selectedCategory && selectedCategory !== "todas" && (
                <CategoryDetailsPanel
                  category={selectedCategory}
                  monthLabel={currentMonthLabel}
                  expenses={categoryExpenses}
                  onClear={() => setSelectedCategory("todas")}
                  onExpenseClick={(expense) =>
                    setSelectedExpenseId(expense.id)
                  }
                />
              )}
            </div>
          </div>

          {/* Linha 2: Resumo do mês + pesquisa de preços */}
          <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="h-full rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="mb-4 text-lg font-semibold text-slate-100">
                <span style={TITLE_SHADOW}>Resumo do mês</span>
              </h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Maior saída */}
                  {(() => {
                    const biggestExpense = topExpenses[0];
                    return (
                      <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
                        <p className="text-xs text-slate-400">
                          Maior saída do mês
                        </p>
                        <p className="mt-1 text-lg font-semibold text-slate-100">
                          {biggestExpense
                            ? `${formatCurrency(
                                Math.abs(biggestExpense.amount),
                              )} · ${biggestExpense.category}`
                            : "-"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {biggestExpense
                            ? formatDate(biggestExpense.date)
                            : "Sem lançamentos"}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Categoria em destaque */}
                  <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
                    {(() => {
                      const isMaiorCategoria =
                        highlightedCategory &&
                        categoryComparisons.length > 0 &&
                        highlightedCategory.category ===
                          categoryComparisons[0].category;
                      const variacaoMaiorGasto =
                        (highlightedCategory?.diferencaValor ?? 0) > 0;
                      const variacaoTexto = variacaoMaiorGasto
                        ? "Gasto subiu"
                        : "Gasto caiu";
                      const variacaoCor = variacaoMaiorGasto
                        ? "text-rose-300"
                        : "text-emerald-300";
                      const variacaoIcon = variacaoMaiorGasto ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      );

                      return (
                        <>
                          <p className="text-xs text-slate-400">
                            {isMaiorCategoria
                              ? "Categoria em destaque · Maior gasto do mês"
                              : "Categoria em destaque"}
                          </p>
                          <p className="mt-1 text-lg font-semibold text-slate-100">
                            {highlightedCategory
                              ? `${highlightedCategory.category} · ${formatCurrency(
                                  highlightedCategory.totalAtual,
                                )}`
                              : "-"}
                          </p>
                          <p
                            className={`flex items-center gap-2 text-xs ${variacaoCor}`}
                          >
                            {variacaoIcon}
                            <span>{variacaoTexto}</span>
                            <span className="text-slate-500">
                              {highlightedCategory
                                ? `${highlightedCategory.diferencaValor >= 0 ? "+" : "-"}${formatCurrency(
                                    Math.abs(
                                      highlightedCategory.diferencaValor,
                                    ),
                                  )} (${
                                    highlightedCategory.diferencaPercentual >= 0
                                      ? "+"
                                      : ""
                                  }${highlightedCategory.diferencaPercentual.toFixed(
                                    1,
                                  )}%) vs mês passado`
                                : "Sem variação"}
                            </span>
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {highlightedCategory
                              ? `${highlightedCategory.participacaoNoMes.toFixed(
                                  1,
                                )}% das Saídas do mês`
                              : ""}
                          </p>
                        </>
                      );
                    })()}
                  </div>

                  {/* Tendência do mês */}
                  <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
                    <p className="text-xs text-slate-400">Tendência do mês</p>
                    <p className="mt-1 text-lg font-semibold text-slate-100">
                      {formatCurrency(monthTrend.totalAtual)} · Saídas
                    </p>
                    {(() => {
                      const acimaMedia =
                        monthTrend.totalAtual > monthTrend.mediaHistorica;
                      const cor = acimaMedia
                        ? "text-rose-300"
                        : "text-emerald-300";
                      const icone = acimaMedia ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      );
                      const label = acimaMedia
                        ? "Acima da média (3m)"
                        : "Abaixo da média (3m)";
                      return (
                        <p className={`flex items-center gap-2 text-xs ${cor}`}>
                          {icone}
                          <span>{label}</span>
                          <span className="text-slate-500">
                            {`${
                              monthTrend.diferencaValor >= 0 ? "+" : "-"
                            }${formatCurrency(
                              Math.abs(monthTrend.diferencaValor),
                            )} (${
                              monthTrend.diferencaPercentual >= 0 ? "+" : ""
                            }${monthTrend.diferencaPercentual.toFixed(
                              1,
                            )}%) vs média últimos 3 meses`}
                          </span>
                        </p>
                      );
                    })()}
                    <p className="mt-1 text-[11px] text-slate-500">
                      Média (3 meses):{" "}
                      {formatCurrency(monthTrend.mediaHistorica)}
                    </p>
                  </div>

                  {/* Renda comprometida */}
                  <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
                    <p className="text-xs text-slate-400">Renda comprometida</p>
                    {(() => {
                      const percentual =
                        incomeCommitment.totalEntradasMes > 0
                          ? (incomeCommitment.totalSaidasMes /
                              incomeCommitment.totalEntradasMes) *
                            100
                          : 0;
                      const percentualClamped = Math.min(
                        100,
                        Math.max(0, percentual),
                      );
                      return (
                        <>
                          <p className="mt-1 text-lg font-semibold text-slate-100">
                            {percentual.toFixed(1)}% da entrada
                          </p>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{ width: `${percentualClamped}%` }}
                            />
                          </div>
                        </>
                      );
                    })()}
                    <p className="text-xs text-slate-500">
                      Fixas: {formatCurrency(incomeCommitment.totalFixas)} ·
                      Avulsas:{" "}
                      {formatCurrency(incomeCommitment.totalAvulsas)}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Renda livre do mês: {formatCurrency(saldoMes)}
                    </p>
                  </div>
                </div>

                {/* Top 5 Saídas */}
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <h3
                      className="text-sm font-semibold text-slate-100"
                      style={TITLE_SHADOW}
                    >
                      Top 5 Saídas do mês
                    </h3>
                    {selectedCategory !== "todas" && (
                      <button
                        className="text-xs text-emerald-300 hover:text-emerald-200"
                        onClick={() => setSelectedCategory("todas")}
                      >
                        Filtrando por: {selectedCategory} (clique para limpar)
                      </button>
                    )}
                    <button
                      className="text-xs text-sky-300 underline underline-offset-4 hover:text-sky-200"
                      onClick={() => setViewMode("saidas")}
                    >
                      Ver todas as Saídas
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="border-b border-slate-800 text-slate-400">
                        <tr>
                          <th className="py-2 text-left">Data</th>
                          <th className="py-2 text-left">Descrição</th>
                          <th className="py-2 text-left">Categoria</th>
                          <th className="py-2 text-right">Valor</th>
                          <th className="py-2 text-right">% do mês</th>
                          <th className="py-2 text-right">Situação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {topExpenses.map((expense) => (
                          <tr
                            key={expense.id}
                            className="cursor-pointer transition-colors hover:bg-slate-800/50"
                            onClick={() => setSelectedExpenseId(expense.id)}
                          >
                            <td className="py-2">
                              {formatDate(expense.date)}
                            </td>
                            <td className="py-2">{expense.description}</td>
                            <td className="py-2">{expense.category}</td>
                            <td className="py-2 text-right text-rose-300">
                              - {formatCurrency(Math.abs(expense.amount))}
                            </td>
                            <td className="py-2 text-right">
                              {totalSaidas
                                ? `${(
                                    (Math.abs(expense.amount) / totalSaidas) *
                                    100
                                  ).toFixed(1)}%`
                                : "-"}
                            </td>
                            <td className="py-2 text-right">
                              <span
                                className={`rounded-full px-2 py-1 text-xs ${
                                  expense.status === "paga"
                                    ? "bg-emerald-500/10 text-emerald-300"
                                    : "bg-amber-500/10 text-amber-300"
                                }`}
                              >
                                {expense.status === "paga"
                                  ? "Paga"
                                  : "Pendente"}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {!topExpenses.length && (
                          <tr>
                            <td
                              colSpan={6}
                              className="py-3 text-center text-slate-400"
                            >
                              Sem Saídas neste mês.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="h-full">
              <PriceResearchPanel />
            </div>
          </div>
        </>
      )}

      {/* TABELA DE ENTRADAS */}
      {viewMode === "entradas" && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2
              className="text-lg font-semibold text-slate-100"
              style={TITLE_SHADOW}
            >
              Entradas
            </h2>
            <span className="text-sm text-slate-400">
              {incomesDoMes.length} itens
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-2 text-left">Data</th>
                  <th className="py-2 text-left">Descrição</th>
                  <th className="py-2 text-left">Fonte</th>
                  <th className="py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {incomesDoMes.map((income) => (
                  <tr
                    key={income.id}
                    className="cursor-pointer transition-colors hover:bg-slate-800/60"
                    onClick={() => setSelectedIncomeId(income.id)}
                  >
                    <td className="py-2 text-slate-200">
                      {formatDate(income.date)}
                    </td>
                    <td className="py-2 text-slate-200">
                      {income.description}
                    </td>
                    <td className="py-2 text-slate-200">
                      {income.source}
                    </td>
                    <td className="py-2 text-right font-medium text-emerald-300">
                      {formatCurrency(income.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TABELA DE SAÍDAS */}
      {viewMode === "saidas" && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2
              className="text-lg font-semibold text-slate-100"
              style={TITLE_SHADOW}
            >
              Todas as Saídas
            </h2>
            <span className="text-sm text-slate-400">
              {despesasOrdenadas.length} itens
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="py-2 text-left">Data</th>
                  <th className="py-2 text-left">Descrição</th>
                  <th className="py-2 text-left">Categoria</th>
                  <th className="py-2 text-right">Valor</th>
                  <th className="py-2 text-right">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {despesasOrdenadas.map((expense) => (
                  <tr
                    key={expense.id}
                    className="cursor-pointer transition-colors hover:bg-slate-800/60"
                    onClick={() => setSelectedExpenseId(expense.id)}
                  >
                    <td className="py-2 text-slate-200">
                      {formatDate(expense.date)}
                    </td>
                    <td className="py-2 text-slate-200">
                      {expense.description}
                    </td>
                    <td className="py-2 text-slate-200">
                      {expense.category}
                    </td>
                    <td className="py-2 text-right font-medium text-rose-300">
                      - {formatCurrency(Math.abs(expense.amount))}
                    </td>
                    <td className="py-2 text-right">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          expense.status === "paga"
                            ? "bg-emerald-500/10 text-emerald-300"
                            : "bg-amber-500/10 text-amber-300"
                        }`}
                      >
                        {expense.status === "paga" ? "Paga" : "Pendente"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAIS */}
      <ReceiptImportModal
        isOpen={isReceiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
      />

      {selectedExpense && (
        <ExpenseDetailModal
          expense={selectedExpense}
          onClose={() => setSelectedExpenseId(null)}
          onToggleStatus={(status) => {
            updateExpenseStatus(selectedExpense.id, status);
            setSelectedExpenseId(null);
          }}
          onConfirm={async () => {
            if (!selectedExpense) return;
            const confirmed = confirm("Confirma excluir esta saída?");
            if (!confirmed) return;

            const { error } = await supabase
              .from("expenses")
              .delete()
              .eq("id", selectedExpense.id);

            if (error) {
              console.error("Erro ao deletar saída no Supabase:", error);
              alert(error.message || "Erro ao deletar saída no Supabase.");
              return;
            }

            await loadExpenses();
            setSelectedExpenseId(null);
          }}
          onEdit={() => navigate(`/saidas/editar/${selectedExpense.id}`)}
        />
      )}

      {selectedIncome && (
        <IncomeDetailModal
          income={selectedIncome}
          onClose={() => setSelectedIncomeId(null)}
          onConfirm={async () => {
            if (!selectedIncome) return;

            const confirmed = confirm("Confirma excluir esta entrada?");
            if (!confirmed) return;

            const { error } = await supabase
              .from("incomes")
              .delete()
              .eq("id", selectedIncome.id);

            if (error) {
              console.error("Erro ao deletar entrada no Supabase:", error);
              alert(error.message || "Erro ao deletar entrada no Supabase.");
              return;
            }

            await loadIncomes();
            setSelectedIncomeId(null);
          }}
          onEdit={() => navigate(`/entradas/editar/${selectedIncome.id}`)}
        />
      )}
    </div>
  );
}
