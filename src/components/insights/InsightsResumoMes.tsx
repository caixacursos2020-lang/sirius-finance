import { type Expense } from "../../contexts/FinanceContext";
import { formatCurrency, formatDate } from "../../utils/formatters";

type Props = {
  topExpenses: Expense[];
  totalFixed: number;
  totalVariable: number;
  totalPending: number;
  totalSaidas: number;
  selectedCategory: string | "todas";
  onClearCategory: () => void;
};

export default function InsightsResumoMes({
  topExpenses,
  totalFixed,
  totalVariable,
  totalPending,
  totalSaidas,
  selectedCategory,
  onClearCategory,
}: Props) {
  const biggestExpense = topExpenses[0];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <InsightCard
          title="Maior saida do mes"
          value={
            biggestExpense
              ? `${formatCurrency(Math.abs(biggestExpense.amount))} • ${biggestExpense.category}`
              : "-"
          }
          subtitle={
            biggestExpense ? formatDate(biggestExpense.date) : "Sem lancamentos"
          }
        />
        <InsightCard
          title="Contas fixas do mes"
          value={formatCurrency(totalFixed)}
          subtitle="Soma de saidas fixas"
        />
        <InsightCard
          title="Gastos avulsos"
          value={`${formatCurrency(totalVariable)} • ${
            totalSaidas ? ((totalVariable / totalSaidas) * 100).toFixed(1) : "0.0"
          }%`}
          subtitle="Soma de saidas avulsas e % do mes"
        />
        <InsightCard
          title="Ainda pendente de pagamento"
          value={formatCurrency(totalPending)}
          subtitle={
            totalSaidas
              ? `${((totalPending / totalSaidas) * 100).toFixed(
                  1
                )}% das saidas estao pendentes`
              : "Sem saidas"
          }
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between pt-2">
          <h3 className="text-sm font-semibold">Top 5 saidas do mes</h3>
          {selectedCategory !== "todas" && (
            <button
              className="text-xs text-emerald-300 hover:text-emerald-200"
              onClick={onClearCategory}
            >
              Filtrando por: {selectedCategory} (clique para limpar)
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-2 text-left">Data</th>
                <th className="py-2 text-left">Descricao</th>
                <th className="py-2 text-left">Categoria</th>
                <th className="py-2 text-right">Valor</th>
                <th className="py-2 text-right">% do mes</th>
                <th className="py-2 text-right">Situacao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {topExpenses.map((expense) => (
                <tr key={expense.id}>
                  <td className="py-2">{formatDate(expense.date)}</td>
                  <td className="py-2">{expense.description}</td>
                  <td className="py-2">{expense.category}</td>
                  <td className="py-2 text-right text-rose-300">
                    - {formatCurrency(Math.abs(expense.amount))}
                  </td>
                  <td className="py-2 text-right">
                    {totalSaidas
                      ? `${((Math.abs(expense.amount) / totalSaidas) * 100).toFixed(1)}%`
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
                      {expense.status === "paga" ? "Paga" : "Pendente"}
                    </span>
                  </td>
                </tr>
              ))}
              {!topExpenses.length && (
                <tr>
                  <td colSpan={6} className="py-3 text-center text-slate-400">
                    Sem saidas neste mes.
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

function InsightCard({
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

