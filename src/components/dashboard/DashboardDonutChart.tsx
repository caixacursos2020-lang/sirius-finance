import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Label,
} from "recharts";
import { formatCurrency } from "../../utils/formatters";

export type DonutSlice = {
  name: string;
  value: number;
  color: string;
};

type DashboardDonutChartProps = {
  data: DonutSlice[];
  monthLabel: string;
  summary: {
    leadingCategory?: DonutSlice & { percent: number };
    categoriesCount: number;
    diffValue?: number;
    diffPercent?: number | null;
  };
};

function CustomTooltip({
  active,
  payload,
  total,
}: {
  active?: boolean;
  payload?: any[];
  total: number;
}) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0].payload as DonutSlice;
  const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : "0";
  return (
    <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-100">
      <p className="font-semibold">{item.name}</p>
      <p className="text-slate-300">{formatCurrency(item.value)}</p>
      <p className="text-slate-400">{percent}% do total</p>
    </div>
  );
}

export default function DashboardDonutChart({ data, monthLabel, summary }: DashboardDonutChartProps) {
  const total = data.reduce((acc, item) => acc + item.value, 0);

  const chartData = data.map((item) => ({
    name: item.name,
    value: item.value,
    color: item.color,
  }));

  if (!chartData.length) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl border border-slate-800 bg-slate-900">
        <div className="text-center text-sm text-slate-400 space-y-2">
          <div className="mx-auto h-16 w-16 rounded-full border-4 border-dashed border-slate-700" />
          <p>Nenhum gasto registrado neste mês.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-[1.3fr,0.7fr] rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius="65%"
              outerRadius="90%"
              paddingAngle={3}
              cornerRadius={8}
              isAnimationActive={false}
            >
              {chartData.map((entry, idx) => (
                <Cell key={`cell-${idx}`} fill={entry.color || "#22c55e"} strokeWidth={1} />
              ))}
              <Label
                position="center"
                content={({ viewBox }) => {
                  if (!viewBox || typeof total !== "number") return null;
                  const { cx, cy } = viewBox as { cx: number; cy: number };
                  return (
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
                      <tspan x={cx} dy="-1.2em" className="fill-slate-400 text-xs">
                        Total do mês
                      </tspan>
                      <tspan x={cx} dy="1.2em" className="fill-slate-50 text-xl font-semibold">
                        {formatCurrency(total)}
                      </tspan>
                      <tspan x={cx} dy="1.2em" className="fill-slate-500 text-xs">
                        {monthLabel}
                      </tspan>
                    </text>
                  );
                }}
              />
            </Pie>
            <Tooltip content={<CustomTooltip total={total} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
          <p className="text-xs uppercase text-slate-500">Categoria líder</p>
          {summary.leadingCategory ? (
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ background: summary.leadingCategory.color }}
                />
                <p className="text-sm font-semibold text-slate-100">{summary.leadingCategory.name}</p>
              </div>
              <div className="text-right text-sm">
                <p className="text-slate-100">{formatCurrency(summary.leadingCategory.value)}</p>
                <p className="text-slate-400 text-xs">
                  {summary.leadingCategory.percent.toFixed(1)}% do total
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-400">Sem dados.</p>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-slate-500">Categorias ativas</p>
            <p className="text-lg font-semibold text-slate-100">{summary.categoriesCount}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-slate-500">Variação vs mês anterior</p>
            <p className="text-sm font-semibold text-slate-100">
              {summary.diffValue !== undefined ? formatCurrency(summary.diffValue) : "-"}
            </p>
            <p className="text-xs text-slate-400">
              {summary.diffPercent === null || summary.diffPercent === undefined
                ? "-"
                : `${summary.diffPercent >= 0 ? "+" : ""}${summary.diffPercent.toFixed(1)}%`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
