import { useMemo } from "react";
import { useFinance } from "../contexts/FinanceContext";
import { useCategories } from "../contexts/CategoriesContext";

export type ProductMonthlyStat = {
  mes: string; // YYYY-MM
  totalQtd: number;
  totalGasto: number;
  precoMedio: number;
  diffValor?: number;
  diffPercent?: number;
};

export type ProductSummary = {
  produto: string;
  totalQtdPeriodo: number;
  totalGastoPeriodo: number;
  precoMedioPeriodo: number;
  numCompras: number;
};

type Params = {
  produtoTerm?: string;
  dataInicio: string;
  dataFim: string;
  categoriaIds?: string[];
};

/**
 * Calcula estatísticas de compra por produto usando os itens de cupom já salvos dentro das saídas.
 * Usa somente dados locais (expenses + receiptItems).
 */
export function useProductAnalytics({ produtoTerm, dataInicio, dataFim, categoriaIds = [] }: Params) {
  const { expenses } = useFinance();
  const { categories } = useCategories();

  const normalizedTerm = produtoTerm?.trim().toLowerCase() ?? "";

  const categoryIdByName = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.name.toLowerCase(), c.id));
    return map;
  }, [categories]);

  const isExpenseInCategories = (expenseCategoryId?: string, expenseCategoryName?: string) => {
    if (!categoriaIds.length) return true;
    if (expenseCategoryId && categoriaIds.includes(expenseCategoryId)) return true;
    if (expenseCategoryName) {
      const mappedId = categoryIdByName.get(expenseCategoryName.toLowerCase());
      if (mappedId && categoriaIds.includes(mappedId)) return true;
    }
    return false;
  };

  const { summary, monthly } = useMemo(() => {
    if (!normalizedTerm) {
      const emptySummary: ProductSummary = {
        produto: "",
        totalQtdPeriodo: 0,
        totalGastoPeriodo: 0,
        precoMedioPeriodo: 0,
        numCompras: 0,
      };
      return { summary: emptySummary, monthly: [] as ProductMonthlyStat[] };
    }

    const startTs = Date.parse(dataInicio);
    const endTs = Date.parse(dataFim);
    const monthMap = new Map<
      string,
      { totalQtd: number; totalGasto: number; monthsWithProduct: Set<string> }
    >();
    let totalQtdPeriodo = 0;
    let totalGastoPeriodo = 0;
    const comprasSet = new Set<string>();

    expenses.forEach((expense) => {
      if (!expense.date) return;
      const ts = Date.parse(expense.date);
      if (Number.isFinite(startTs) && ts < startTs) return;
      if (Number.isFinite(endTs) && ts > endTs) return;
      if (!isExpenseInCategories(expense.categoryId, expense.category)) return;
      if (!expense.receiptItems?.length) return;

      const monthKey = expense.date.slice(0, 7);
      let hasProductInExpense = false;

      expense.receiptItems.forEach((item) => {
        const desc = item.description?.toLowerCase() ?? "";
        if (normalizedTerm && !desc.includes(normalizedTerm)) return;
        const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
        const total = item.total ?? 0;

        hasProductInExpense = true;
        totalQtdPeriodo += quantity;
        totalGastoPeriodo += total;

        const current = monthMap.get(monthKey) ?? {
          totalQtd: 0,
          totalGasto: 0,
          monthsWithProduct: new Set<string>(),
        };
        current.totalQtd += quantity;
        current.totalGasto += total;
        current.monthsWithProduct.add(expense.id);
        monthMap.set(monthKey, current);
      });

      if (hasProductInExpense) {
        comprasSet.add(expense.id);
      }
    });

    const monthlySorted = Array.from(monthMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mes, data]) => {
        const precoMedio = data.totalQtd ? data.totalGasto / data.totalQtd : 0;
        return {
          mes,
          totalQtd: data.totalQtd,
          totalGasto: data.totalGasto,
          precoMedio,
        } as ProductMonthlyStat;
      })
      .map((stat, idx, arr) => {
        if (idx === 0) return stat;
        const prev = arr[idx - 1];
        const diffValor = stat.precoMedio - prev.precoMedio;
        const diffPercent =
          prev.precoMedio > 0 ? (diffValor / prev.precoMedio) * 100 : undefined;
        return { ...stat, diffValor, diffPercent };
      });

    const precoMedioPeriodo =
      totalQtdPeriodo > 0 ? totalGastoPeriodo / totalQtdPeriodo : 0;

    const summary: ProductSummary = {
      produto: produtoTerm?.trim() ?? "",
      totalQtdPeriodo,
      totalGastoPeriodo,
      precoMedioPeriodo,
      numCompras: comprasSet.size,
    };

    return { summary, monthly: monthlySorted };
  }, [categoriaIds, categoryIdByName, dataFim, dataInicio, expenses, normalizedTerm, produtoTerm]);

  return {
    summary,
    monthly,
  };
}
