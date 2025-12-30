import { type Expense, type Income, type MonthlySummary } from "../types/finance";

const getMonthLabel = (monthIndex: number, year: number) => {
  const label = new Date(year, monthIndex, 1).toLocaleDateString("pt-BR", {
    month: "short",
  });
  return `${label}/${String(year).slice(-2)}`;
};

export function getMonthlySummary(
  expenses: Expense[],
  incomes: Income[],
  year: number
): MonthlySummary[] {
  const summaries: MonthlySummary[] = Array.from(
    { length: 12 },
    (_, monthIndex) => ({
      year,
      month: monthIndex,
      monthLabel: getMonthLabel(monthIndex, year),
      entradas: 0,
      saidas: 0,
      saldo: 0,
      percentualEntradasAno: 0,
      percentualSaidasAno: 0,
      percentualEntradasMes: 0,
      percentualSaidasMes: 0,
    })
  );

  expenses.forEach((expense) => {
    if (!expense.date) return;
    const date = new Date(expense.date);
    if (date.getFullYear() !== year) return;
    const month = date.getMonth();
    summaries[month].saidas += Math.abs(expense.amount);
  });

  incomes.forEach((income) => {
    if (!income.date) return;
    const date = new Date(income.date);
    if (date.getFullYear() !== year) return;
    const month = date.getMonth();
    summaries[month].entradas += income.amount;
  });

  const totalEntradasAno = summaries.reduce(
    (acc, item) => acc + item.entradas,
    0
  );
  const totalSaidasAno = summaries.reduce(
    (acc, item) => acc + item.saidas,
    0
  );

  return summaries.map((item) => {
    const saldo = item.entradas - item.saidas;
    const totalMes = item.entradas + item.saidas;
    const percentualEntradasAno =
      totalEntradasAno > 0 ? (item.entradas / totalEntradasAno) * 100 : 0;
    const percentualSaidasAno =
      totalSaidasAno > 0 ? (item.saidas / totalSaidasAno) * 100 : 0;
    const percentualEntradasMes =
      totalMes > 0 ? (item.entradas / totalMes) * 100 : 0;
    const percentualSaidasMes =
      totalMes > 0 ? (item.saidas / totalMes) * 100 : 0;

    return {
      ...item,
      saldo,
      percentualEntradasAno,
      percentualSaidasAno,
      percentualEntradasMes,
      percentualSaidasMes,
    };
  });
}

export function getCategoryMonthComparison(
  expenses: Expense[],
  selectedYear: number,
  selectedMonth: number
) {
  const currentTotals = new Map<string, number>();
  const previousTotals = new Map<string, number>();

  const currentKey = `${selectedYear}-${selectedMonth}`;
  const prevDate = new Date(selectedYear, selectedMonth, 1);
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevKey = `${prevDate.getFullYear()}-${prevDate.getMonth()}`;

  expenses.forEach((expense) => {
    if (!expense.date) return;
    const date = new Date(expense.date);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const amount = Math.abs(expense.amount);
    if (key === currentKey) {
      currentTotals.set(expense.category, (currentTotals.get(expense.category) ?? 0) + amount);
    } else if (key === prevKey) {
      previousTotals.set(expense.category, (previousTotals.get(expense.category) ?? 0) + amount);
    }
  });

  const totalMesAtual = Array.from(currentTotals.values()).reduce((acc, v) => acc + v, 0);

  return Array.from(currentTotals.entries())
    .map(([category, totalAtual]) => {
      const totalAnterior = previousTotals.get(category) ?? 0;
      const diferencaValor = totalAtual - totalAnterior;
      const diferencaPercentual =
        totalAnterior > 0 ? (diferencaValor / totalAnterior) * 100 : totalAtual > 0 ? 100 : 0;
      const participacaoNoMes = totalMesAtual > 0 ? (totalAtual / totalMesAtual) * 100 : 0;

      return {
        category,
        totalAtual,
        totalAnterior,
        diferencaValor,
        diferencaPercentual,
        participacaoNoMes,
      };
    })
    .sort((a, b) => b.totalAtual - a.totalAtual);
}

export function getMonthTrend(
  expenses: Expense[],
  selectedYear: number,
  selectedMonth: number,
  windowSize = 3
) {
  const totalAtual = expenses.reduce((acc, expense) => {
    if (!expense.date) return acc;
    const d = new Date(expense.date);
    if (d.getFullYear() === selectedYear && d.getMonth() === selectedMonth) {
      return acc + Math.abs(expense.amount);
    }
    return acc;
  }, 0);

  let somaHistorica = 0;
  let mesesConsiderados = 0;
  for (let i = 1; i <= windowSize; i++) {
    const prev = new Date(selectedYear, selectedMonth, 1);
    prev.setMonth(prev.getMonth() - i);
    const keyYear = prev.getFullYear();
    const keyMonth = prev.getMonth();
    const totalMes = expenses.reduce((acc, expense) => {
      if (!expense.date) return acc;
      const d = new Date(expense.date);
      if (d.getFullYear() === keyYear && d.getMonth() === keyMonth) {
        return acc + Math.abs(expense.amount);
      }
      return acc;
    }, 0);
    somaHistorica += totalMes;
    mesesConsiderados += 1;
  }

  const mediaHistorica = mesesConsiderados > 0 ? somaHistorica / mesesConsiderados : 0;
  const diferencaValor = totalAtual - mediaHistorica;
  const diferencaPercentual =
    mediaHistorica > 0 ? (diferencaValor / mediaHistorica) * 100 : totalAtual > 0 ? 100 : 0;

  return {
    totalAtual,
    mediaHistorica,
    diferencaValor,
    diferencaPercentual,
  };
}

export function getIncomeCommitment(
  incomes: Income[],
  expenses: Expense[],
  selectedYear: number,
  selectedMonth: number
) {
  const totalEntradasMes = incomes.reduce((acc, income) => {
    if (!income.date) return acc;
    const d = new Date(income.date);
    if (d.getFullYear() === selectedYear && d.getMonth() === selectedMonth) {
      return acc + income.amount;
    }
    return acc;
  }, 0);

  let totalSaidasMes = 0;
  let totalFixas = 0;
  let totalAvulsas = 0;
  expenses.forEach((expense) => {
    if (!expense.date) return;
    const d = new Date(expense.date);
    if (d.getFullYear() === selectedYear && d.getMonth() === selectedMonth) {
      const amount = Math.abs(expense.amount);
      totalSaidasMes += amount;
      if (expense.isFixed) {
        totalFixas += amount;
      } else {
        totalAvulsas += amount;
      }
    }
  });

  const rendaComprometidaPercentual =
    totalEntradasMes > 0 ? (totalSaidasMes / totalEntradasMes) * 100 : 0;

  return {
    totalEntradasMes,
    totalSaidasMes,
    totalFixas,
    totalAvulsas,
    rendaComprometidaPercentual,
  };
}
