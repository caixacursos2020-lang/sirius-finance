import { useMemo } from "react";
import { type Expense } from "../../contexts/FinanceContext";
import { formatCurrency } from "../../utils/formatters";

type Props = {
  expenses: Expense[];
  selectedMonth: number;
  selectedYear: number;
};

type MonthData = {
  total: number;
  categories: Record<string, number>;
};

const monthKey = (year: number, month: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}`;

export default function InsightsComportamento({
  expenses,
  selectedMonth,
  selectedYear,
}: Props) {
  const expensesByMonth = useMemo(() => {
    const data: Record<string, MonthData> = {};
    expenses.forEach((expense) => {
      if (!expense.date) return;
      const key = expense.date.slice(0, 7);
      const amount = Math.abs(expense.amount);
      if (!data[key]) {
        data[key] = { total: 0, categories: {} };
      }
      data[key].total += amount;
      data[key].categories[expense.category] =
        (data[key].categories[expense.category] || 0) + amount;
    });
    return data;
  }, [expenses]);

  const prevDate = useMemo(
    () => new Date(selectedYear, selectedMonth - 1, 1),
    [selectedMonth, selectedYear]
  );

  const currentKey = monthKey(selectedYear, selectedMonth);
  const prevKey = monthKey(prevDate.getFullYear(), prevDate.getMonth());

  const currentMonthData: MonthData = expensesByMonth[currentKey] || {
    total: 0,
    categories: {},
  };
  const prevMonthData: MonthData = expensesByMonth[prevKey] || {
    total: 0,
    categories: {},
  };

  const variations = useMemo(() => {
    const categories = new Set([
      ...Object.keys(currentMonthData.categories),
      ...Object.keys(prevMonthData.categories),
    ]);
    return Array.from(categories).map((category) => {
      const current = currentMonthData.categories[category] || 0;
      const previous = prevMonthData.categories[category] || 0;
      const changePercent =
        previous > 0 ? ((current - previous) / previous) * 100 : null;
      return {
        category,
        changePercent,
        current,
        previous,
      };
    });
  }, [currentMonthData.categories, prevMonthData.categories]);

  const grewMost = useMemo(
    () =>
      variations
        .filter((v) => v.changePercent !== null && v.changePercent > 0)
        .sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0))[0],
    [variations]
  );

  const droppedMost = useMemo(
    () =>
      variations
        .filter((v) => v.changePercent !== null && v.changePercent < 0)
        .sort((a, b) => (a.changePercent || 0) - (b.changePercent || 0))[0],
    [variations]
  );

  const topCategory = useMemo(() => {
    const entries = Object.entries(currentMonthData.categories);
    if (!entries.length) return null;
    const [name, total] = entries.sort((a, b) => b[1] - a[1])[0];
    return { name, total };
  }, [currentMonthData.categories]);

  const average3Months = useMemo(() => {
    const months: MonthData[] = [];
    for (let i = 0; i < 3; i++) {
      const date = new Date(selectedYear, selectedMonth - i, 1);
      const key = monthKey(date.getFullYear(), date.getMonth());
      months.push(
        expensesByMonth[key] || {
          total: 0,
          categories: {},
        }
      );
    }
    const total = months.reduce((acc, item) => acc + item.total, 0);
    return { value: total / 3, samples: months.length };
  }, [expensesByMonth, selectedMonth, selectedYear]);

  const currentTotal = currentMonthData.total;
  const prevTotal = prevMonthData.total;
  const concentrationPercent =
    currentTotal && topCategory ? (topCategory.total / currentTotal) * 100 : null;
  const mediaDiffPercent =
    average3Months.value > 0
      ? ((currentTotal - average3Months.value) / average3Months.value) * 100
      : null;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <InfoCard
        title="Categoria que mais cresceu"
        value={
          grewMost && prevTotal > 0
            ? grewMost.category
            : "Historico insuficiente"
        }
        subtitle={
          grewMost && prevTotal > 0 && grewMost.changePercent !== null
            ? `+${grewMost.changePercent.toFixed(1)}% vs mes anterior`
            : "Precisa de dados do mes anterior."
        }
      />
      <InfoCard
        title="Categoria que mais caiu"
        value={
          droppedMost && prevTotal > 0
            ? droppedMost.category
            : "Historico insuficiente"
        }
        subtitle={
          droppedMost && prevTotal > 0 && droppedMost.changePercent !== null
            ? `${droppedMost.changePercent.toFixed(1)}% vs mes anterior`
            : "Precisa de dados do mes anterior."
        }
      />
      <InfoCard
        title="Concentracao de gastos"
        value={
          concentrationPercent !== null && topCategory
            ? `${topCategory.name} = ${concentrationPercent.toFixed(1)}% das saidas`
            : "Sem dados do mes"
        }
        subtitle={
          topCategory
            ? `Total: ${formatCurrency(topCategory.total)}`
            : "Registre saidas para medir concentracao."
        }
      />
      <InfoCard
        title="Gasto vs media 3 meses"
        value={
          mediaDiffPercent === null
            ? "Historico insuficiente"
            : `${mediaDiffPercent >= 0 ? "+" : ""}${mediaDiffPercent.toFixed(
                1
              )}% vs media recente`
        }
        subtitle={
          average3Months.value > 0
            ? `Media: ${formatCurrency(average3Months.value)}`
            : currentTotal > 0
            ? "Precisa de meses anteriores para comparar."
            : "Sem gastos recentes."
        }
      />
    </div>
  );
}

function InfoCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
      <p className="text-xs text-slate-400">{title}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}

