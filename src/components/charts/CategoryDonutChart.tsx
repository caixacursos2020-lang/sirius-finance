import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Label,
  LabelList,
} from "recharts";

type CategorySummary = {
  id: string;
  name: string; // nome da categoria
  color: string; // cor da categoria
  total: number; // valor total gasto na categoria no mês
  percentage: number; // percentual da categoria no mês (0-100)
  count: number; // nº de lançamentos
};

type CategoryDonutChartProps = {
  data: CategorySummary[];
  monthLabel: string; // ex: "dezembro de 2025"
  currencySymbol?: string; // padrão "R$"
};

// Utilitário simples para formatar moeda PT-BR
function formatCurrency(value: number, currencySymbol = "R$"): string {
  return `${currencySymbol} ${value.toFixed(2).replace(".", ",")}`;
}

// Tooltip customizado
const CategoryTooltip: React.FC<{
  active?: boolean;
  payload?: any[];
}> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const item = payload[0]?.payload as CategorySummary;
  if (!item) return null;

  return (
    <div
      style={{
        backgroundColor: "#020617",
        border: "1px solid #1e293b",
        borderRadius: 8,
        padding: "8px 12px",
        fontSize: 12,
        color: "#e2e8f0",
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{item.name}</div>
      <div>Valor: {formatCurrency(item.total)}</div>
      <div>Percentual: {item.percentage.toFixed(1)}%</div>
      <div>Lançamentos: {item.count}</div>
    </div>
  );
};

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  data,
  monthLabel,
  currencySymbol = "R$",
}) => {
  const total = data.reduce((acc, item) => acc + item.total, 0);

  const renderPercentLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    payload,
  }: any) => {
    if (!payload || payload.percentage === undefined) return null;
    const RAD = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * RAD);
    const y = cy + radius * Math.sin(-midAngle * RAD);
    const textStyle = {
      fill: "#ffffff",
      fontWeight: 700,
      textShadow: "0 0 6px rgba(0,0,0,0.9)",
      paintOrder: "stroke" as const,
      stroke: "rgba(0,0,0,0.9)",
      strokeWidth: 2,
      filter: "url(#categoryLabelShadow)",
    };
    const valueLabel = formatCurrency(payload.total, currencySymbol);

    return (
      <text
        x={x}
        y={y}
        style={textStyle}
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={13}
      >
        <tspan x={x} dy="-0.8em">
          {payload.name}
        </tspan>
        <tspan x={x} dy="1.2em" style={{ ...textStyle, fontSize: 12 }}>
          {valueLabel}
        </tspan>
        <tspan
          x={x}
          dy="1.2em"
          style={{ ...textStyle, fill: "#38bdf8", fontWeight: 800, fontSize: 13 }}
        >
          {`${payload.percentage.toFixed(0)}%`}
        </tspan>
      </text>
    );
  };

  return (
    <div
      style={{
        width: "100%",
        height: 340,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          padding: "4px 4px 0 4px",
          gap: 2,
        }}
      >
        <span style={{ fontSize: 24, fontWeight: 600, color: "#e5e7eb" }}>
          {formatCurrency(total, currencySymbol)}
        </span>
        <span style={{ fontSize: 12, color: "#9ca3af" }}>{monthLabel}</span>
      </div>

      <div style={{ flex: 1 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <defs>
              <filter id="categoryLabelShadow" x="-50%" y="-50%" width="200%" height="200%">
                <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#000000" floodOpacity="0.9" />
              </filter>
            </defs>
            <Pie
              data={data}
              dataKey="total"
              nameKey="name"
              innerRadius={95}
              outerRadius={125}
              paddingAngle={3}
              cornerRadius={10}
              stroke="#020617"
              strokeWidth={4}
              labelLine={false}
              label={renderPercentLabel}
            >
              {data.map((entry) => (
                <Cell key={entry.id} fill={entry.color} />
              ))}

              <Label
                position="center"
                content={(props: any) => {
                  const { viewBox } = props;
                  if (!viewBox || !("cx" in viewBox) || !("cy" in viewBox)) return null;
                  const { cx, cy } = viewBox;
                  const textStyle = {
                    fill: "#ffffff",
                    fontWeight: 700,
                    textShadow: "0 0 6px rgba(0,0,0,0.9)",
                    paintOrder: "stroke" as const,
                    stroke: "rgba(0,0,0,0.9)",
                    strokeWidth: 2,
                    filter: "url(#categoryLabelShadow)",
                  };

                  return (
                    <g>
                      <text
                        x={cx}
                        y={cy - 12}
                        textAnchor="middle"
                        style={{ ...textStyle, fill: "#e2e8f0", fontSize: 12 }}
                      >
                        Gastos no mês
                      </text>
                      <text
                        x={cx}
                        y={cy + 10}
                        textAnchor="middle"
                        style={{ ...textStyle, fontSize: 17 }}
                      >
                        {formatCurrency(total, currencySymbol)}
                      </text>
                      <text
                        x={cx}
                        y={cy + 28}
                        textAnchor="middle"
                        style={{ ...textStyle, fill: "#cbd5e1", fontSize: 11, fontWeight: 600 }}
                      >
                        {monthLabel}
                      </text>
                    </g>
                  );
                }}
              />
              <LabelList dataKey="percentage" content={() => null} />
            </Pie>

            <Tooltip content={<CategoryTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};