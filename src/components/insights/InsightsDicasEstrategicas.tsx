import { type Expense, type Income } from "../../contexts/FinanceContext";
import { formatCurrency } from "../../utils/formatters";

type Props = {
  expenses: Expense[];
  incomes: Income[];
  totalSaidas: number;
  totalAvulsos: number;
};

type Tip = {
  title: string;
  message: string;
  icon?: string;
};

export default function InsightsDicasEstrategicas({
  expenses,
  incomes,
  totalSaidas,
  totalAvulsos,
}: Props) {
  const tips: Tip[] = [];
  const avulsoPercent =
    totalSaidas > 0 ? (totalAvulsos / totalSaidas) * 100 : null;

  if (avulsoPercent !== null && avulsoPercent > 60 && tips.length < 2) {
    const economiaAnual = totalAvulsos * 0.15 * 12;
    tips.push({
      title: "Gastos avulsos em alta",
      message: `Este mes, gastos avulsos sao ${avulsoPercent.toFixed(
        1
      )}% das suas saidas. Se voce cortar 15% deles, economiza ${formatCurrency(
        economiaAnual
      )} por ano.`,
      icon: "💡",
    });
  }

  if (tips.length < 2 && incomes.length) {
    const totalEntradas = incomes.reduce((acc, inc) => acc + inc.amount, 0);
    const porFonte = incomes.reduce<Record<string, number>>((acc, inc) => {
      acc[inc.source] = (acc[inc.source] || 0) + inc.amount;
      return acc;
    }, {});
    const [mainSource, sourceTotal] =
      Object.entries(porFonte).sort((a, b) => b[1] - a[1])[0] || [];
    const sourcePercent =
      totalEntradas > 0 && sourceTotal
        ? (sourceTotal / totalEntradas) * 100
        : null;

    if (sourcePercent !== null && sourcePercent > 80) {
      tips.push({
        title: "Renda concentrada",
        message: `Sua renda depende principalmente de ${mainSource} (${sourcePercent.toFixed(
          1
        )}% das entradas). Considere criar uma segunda fonte para reduzir risco.`,
        icon: "🛡️",
      });
    }
  }

  if (tips.length < 2 && expenses.length) {
    const porCategoria = expenses.reduce<Record<string, number>>((acc, exp) => {
      const value = Math.abs(exp.amount);
      acc[exp.category] = (acc[exp.category] || 0) + value;
      return acc;
    }, {});
    const [categoria, total] =
      Object.entries(porCategoria).sort((a, b) => b[1] - a[1])[0] || [];
    if (categoria && total > 0) {
      const valorSimulado = 300 * 12;
      tips.push({
        title: "Espaco para economizar",
        message: `Voce gastou ${formatCurrency(total)} em ${categoria}. Se reduzir R$ 300,00 por mes, em 12 meses acumula ${formatCurrency(
          valorSimulado
        )}.`,
        icon: "📉",
      });
    }
  }

  if (!tips.length) {
    tips.push({
      title: "Aguarde novas dicas",
      message:
        "Continue registrando suas entradas e saidas. Assim que houver mais historico, vamos sugerir metas e economias.",
    });
  }

  return (
    <div className="grid gap-3">
      {tips.map((tip) => (
        <div
          key={tip.title}
          className="flex gap-3 rounded-lg border border-slate-800 bg-slate-950 p-4"
        >
          {tip.icon && (
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-xl">
              {tip.icon}
            </div>
          )}
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-100">{tip.title}</p>
            <p className="text-sm text-slate-300">{tip.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

