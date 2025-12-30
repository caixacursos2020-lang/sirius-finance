import { useEffect, useMemo, useState } from "react";
import { type Expense, type Income } from "../../types/finance";
import { formatCurrency, formatDate } from "../../utils/formatters";

type DynamicInfoPanelProps = {
  month: number; // 0-11
  year: number;
  expenses: Expense[];
  incomes: Income[];
};

type PanelMessage = {
  id: string;
  title: string;
  description: string;
  emphasis?: "alert" | "ok" | "neutral";
};

export default function DynamicInfoPanel({
  month,
  year,
  expenses,
  incomes,
}: DynamicInfoPanelProps) {
  const messages = useMemo<PanelMessage[]>(() => {
    const totalEntradas = incomes.reduce((acc, inc) => acc + inc.amount, 0);
    const totalSaidas = expenses.reduce((acc, e) => acc + Math.abs(e.amount), 0);
    const saldo = totalEntradas - totalSaidas;
    const percentSaidas =
      totalEntradas > 0 ? (totalSaidas / totalEntradas) * 100 : totalSaidas > 0 ? Infinity : 0;

    const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + Math.abs(e.amount);
      return acc;
    }, {});
    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

    const biggestExpense = expenses
      .slice()
      .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount))[0];

    const list: PanelMessage[] = [];

    if (totalEntradas > 0 || totalSaidas > 0) {
      list.push({
        id: "relacao",
        title: "Relação entradas x saídas",
        description:
          percentSaidas === Infinity
            ? "Ainda não há entradas registradas, mas já existem saídas."
            : `As saídas representam ${percentSaidas.toFixed(1)}% das entradas ${
                percentSaidas > 100 ? "(você gastou mais do que entrou)." : "(situação equilibrada ou positiva)."
              }`,
        emphasis: percentSaidas > 100 ? "alert" : "neutral",
      });
    } else {
      list.push({
        id: "sem-mov",
        title: "Sem movimentações",
        description: "Ainda não há entradas ou saídas registradas neste mês.",
        emphasis: "neutral",
      });
    }

    if (topCategory) {
      list.push({
        id: "top-cat",
        title: "Categoria que mais pesa",
        description: `Neste mês, ${topCategory[0]} representa ${formatCurrency(topCategory[1])} em saídas.`,
        emphasis: "neutral",
      });
    }

    if (biggestExpense) {
      list.push({
        id: "maior-saida",
        title: "Maior saída",
        description: `Maior saída: ${formatCurrency(Math.abs(biggestExpense.amount))} em "${
          biggestExpense.description
        }" no dia ${formatDate(biggestExpense.date)}.`,
        emphasis: "alert",
      });
    }

    list.push({
      id: "saldo",
      title: "Saldo do mês",
      description: `Saldo atual: ${formatCurrency(saldo)} ${saldo >= 0 ? "(positivo)" : "(negativo)"}.`,
      emphasis: saldo >= 0 ? "ok" : "alert",
    });

    return list;
  }, [expenses, incomes]);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!messages.length) return;
    setIndex(0);
    const id = setInterval(() => {
      setIndex((prev) => (prev + 1) % messages.length);
    }, 8000);
    return () => clearInterval(id);
  }, [messages]);

  if (!messages.length) {
    return (
      <div className="text-sm text-slate-400">
        Nenhuma informação para exibir neste mês.
      </div>
    );
  }

  const current = messages[index % messages.length];

  const badge =
    current.emphasis === "alert"
      ? "bg-rose-500/10 text-rose-300 border border-rose-600/40"
      : current.emphasis === "ok"
      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-600/40"
      : "bg-slate-800 text-slate-200 border border-slate-700";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${badge}`}>
          {current.title}
        </span>
        <span className="text-[11px] text-slate-500">
          {month + 1 < 10 ? `0${month + 1}` : month + 1}/{year}
        </span>
      </div>
      <p className="text-sm text-slate-100 leading-relaxed">{current.description}</p>
    </div>
  );
}

