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
