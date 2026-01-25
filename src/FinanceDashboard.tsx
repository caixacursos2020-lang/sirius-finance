import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
  Cell,
  Sector,
} from "recharts";
import {
  Wallet2,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  Filter,
  Pencil,
  Trash2,
  X,
  Tag,
  CheckCircle2,
  CreditCard,
  ShoppingCart,
  Search,
  BarChart3,
  ChevronRight,
  Clock,
  MapPin,
  FileText,
  Calendar,
  CheckSquare,
  Square,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { useFinance } from "./contexts/FinanceContext";
import { useCategories } from "./contexts/CategoriesContext";
import ReceiptImportModal from "./components/receipts/ReceiptImportModal";
import { formatCurrency, formatDate } from "./utils/formatters";
import { supabase } from "./supabaseClient"; // Necessário para exclusão em massa

const SOLID_BLUE = "#3b82f6";
const SOLID_RED = "#ef4444";
const COLOR_SALDO = "#FACC15";
const PieAny = Pie as any;
const CellAny = Cell as any;

// Normaliza valores monetários (string pt-BR/EN ou number) para number seguro
function normalizeMoney(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;

  let s = value.trim();
  if (!s) return 0;

  // remove R$, espaços e qualquer coisa "estranha"
  s = s.replace(/R\$\s?/gi, "").replace(/\s/g, "");

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  // pt-BR típico: 1.234,56  -> 1234.56
  if (hasComma && hasDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma && !hasDot) {
    // 1234,56 -> 1234.56
    s = s.replace(",", ".");
  } else {
    // EN típico: 1234.56 (mantém) ou "1234" (ok)
  }

  // remove qualquer coisa que não seja número / sinal / ponto
  s = s.replace(/[^0-9.-]/g, "");

  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

// --- MODAL DE DETALHES ---
function TransactionModal({
  item,
  type,
  onClose,
  onDelete,
  onEdit,
}: {
  item: any;
  type: "expense" | "income";
  onClose: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const { paymentMethods, receipts } = useFinance();
  if (!item) return null;

  // ---------- PAGAMENTO ----------
  // tenta vários formatos possíveis (saída normal + cupom importado)
  const paymentMethodName =
    paymentMethods.find((pm: any) => pm.id === item.paymentMethodId)?.name ||
    item.paymentMethodName ||
    item.paymentMethod ||
    item.receiptPaymentMethod ||
    item.forma_pagamento ||
    "não informado";

  // ---------- LOCAL ----------
  const locationName =
    item.receiptStore ||
    item.location ||
    item.store ||
    item.local ||
    "Local não informado";

  // ---------- OBSERVAÇÃO ----------
  const observationText = item.observation || item.obs || item.notes || null;

  const amountNum = Math.abs(normalizeMoney(item.amount));

  // ---------- ITENS DO CUPOM ----------
  const receiptId: string | null =
    item.receiptId ?? item.receipt_id ?? item.receiptID ?? null;

  const receiptFromContext =
    receiptId && Array.isArray(receipts)
      ? receipts.find((r: any) => r.id === receiptId) ?? null
      : null;

  // Fallback (legado): alguns registros antigos não salvavam receipt_id na tabela expenses.
  // Tentamos casar pelo "store" + data + total para ainda mostrar os itens.
  const receiptFromHeuristic =
    !receiptFromContext && Array.isArray(receipts)
      ? (() => {
          const normalizeKey = (s: unknown) =>
            String(s ?? "")
              .trim()
              .toLowerCase()
              .replace(/\s+/g, " ")
              .replace(/[^a-z0-9 ]/g, "");

          const storeKey = normalizeKey(
            item.receiptStore ?? item.receipt_store ?? item.store ?? item.local
          );
          if (!storeKey) return null;

          const dateKey = String(item.date ?? "").slice(0, 10);
          if (!dateKey) return null;

          const totalKey = amountNum;

          const candidates = receipts.filter((r: any) => {
            const rStore = normalizeKey(r.storeName ?? r.store_name ?? r.store);
            const rDate = String(r.date ?? "").slice(0, 10);
            if (!rStore || !rDate) return false;
            if (rDate !== dateKey) return false;
            // match por store exato ou "quase" (contém)
            if (rStore !== storeKey && !rStore.includes(storeKey) && !storeKey.includes(rStore))
              return false;
            return true;
          });

          // tenta casar por total (melhor), senão pega o primeiro do dia/loja
          const byTotal =
            candidates.find((r: any) => Math.abs(Number(r.total ?? 0) - totalKey) < 0.05) ??
            candidates[0] ??
            null;

          return byTotal;
        })()
      : null;

  // Aceita vários campos possíveis de itens (dependendo de como foi salvo na importação)
  const rawItemsBase =
    item.receiptItems ||
    item.items ||
    item.receipt_items ||
    item.cupomItems ||
    item.itens ||
    [];

  // Fallback: se a despesa estiver vinculada a um cupom, pega os itens do cupom carregado no FinanceContext.
  const rawItems =
    Array.isArray(rawItemsBase) && rawItemsBase.length > 0
      ? rawItemsBase
      : receiptFromContext?.items ?? receiptFromHeuristic?.items ?? [];

  const hasItems = Array.isArray(rawItems) && rawItems.length > 0;

  const normalizedItems = hasItems
    ? rawItems.map((it: any, idx: number) => {
        const name =
          it.name ||
          it.description ||
          it.itemdescription ||
          it.produto ||
          it.item ||
          `Item ${idx + 1}`;

        const quantity = Number(
          it.quantity || it.qtd || it.qtde || it.amount || 1
        );
        const totalRaw = it.total || it.totalPrice || it.price || it.valor || 0;
        const unitRaw =
          it.unitPrice ||
          it.unit_price ||
          it.valor_unitario ||
          (quantity ? totalRaw / quantity : totalRaw);

        return {
          id: it.id ?? idx,
          name,
          quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
          unit: normalizeMoney(unitRaw),
          total: normalizeMoney(totalRaw),
        };
      })
    : [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl relative">
        {/* FECHAR */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* TTULO */}
        <h3 className="text-lg font-bold text-slate-100 mb-6 text-center border-b border-slate-800 pb-4">
          Detalhes da {type === "expense" ? "saída" : "Entrada"}
        </h3>

        {/* VALOR + STATUS */}
        <div className="flex flex-col items-center mb-6">
          <span
            className={clsx(
              "text-4xl font-black tracking-tight",
              type === "expense" ? "text-rose-400" : "text-emerald-400"
            )}
          >
            {formatCurrency(amountNum)}
          </span>

          {type === "expense" && (
            <span
              className={clsx(
                "mt-3 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider inline-flex items-center gap-1",
                item.status === "paga"
                  ? "bg-emerald-950/30 text-emerald-400 border-emerald-900"
                  : "bg-amber-950/30 text-amber-400 border-amber-900"
              )}
            >
              {item.status === "paga" ? (
                <>
                  <CheckCircle2 size={11} /> PAGO
                </>
              ) : (
                "PENDENTE"
              )}
            </span>
          )}
        </div>

        {/* DESCRIÇÃO PRINCIPAL */}
        <div className="mb-6 text-center">
          <p className="text-slate-100 font-medium text-lg leading-tight">
            {item.description}
          </p>
          <p className="text-slate-500 text-[10px] uppercase font-bold mt-1">
            Descrição
          </p>
        </div>

        {/* BLOCO PRINCIPAL DE INFO */}
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50 mb-6 grid grid-cols-2 gap-y-5 gap-x-4">
          {/* DATA */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase">
              <Calendar size={12} /> Data
            </div>
            <p className="text-slate-200 text-sm font-medium">
              {formatDate(item.date)}
            </p>
          </div>

          {/* CATEGORIA (somente saída) */}
          {type === "expense" && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase">
                <Tag size={12} /> Categoria
              </div>
              <p className="text-slate-200 text-sm font-medium truncate">
                {item.category || "Não informado"}
              </p>
            </div>
          )}

          {/* LOCAL */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase">
              <MapPin size={12} /> Local
            </div>
            <p className="text-slate-400 text-sm italic truncate">
              {locationName}
            </p>
          </div>

          {/* PAGAMENTO (somente saída) */}
          {type === "expense" && (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase">
                <CreditCard size={12} /> Pagamento
              </div>
              <p className="text-slate-200 text-sm font-medium truncate">
                {paymentMethodName}
              </p>
            </div>
          )}
        </div>

        {/* OBSERVAÇÕES */}
        {observationText && (
          <div className="mb-6 bg-slate-900/30 p-3 rounded-lg border border-slate-800/30">
            <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase mb-1">
              <FileText size={12} /> Observações
            </div>
            <p className="text-slate-300 text-sm italic leading-relaxed">
              "{observationText}"
            </p>
          </div>
        )}

        {/* ITENS DO CUPOM (SE EXISTIREM) */}
        {hasItems && (
          <div className="mb-6 bg-slate-900/40 p-3 rounded-lg border border-slate-800/50 max-h-52 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase text-slate-400">
                Itens do Cupom ({normalizedItems.length})
              </span>
            </div>

            <table className="w-full text-[11px] text-slate-300">
              <thead>
                <tr className="text-slate-500 uppercase border-b border-slate-800">
                  <th className="py-1 pr-2 text-left font-semibold">Item</th>
                  <th className="py-1 px-2 text-right font-semibold">Qtd</th>
                  <th className="py-1 px-2 text-right font-semibold">Unit.</th>
                  <th className="py-1 pl-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {normalizedItems.map((it) => (
                  <tr key={it.id} className="border-b border-slate-900/60">
                    <td className="py-1 pr-2 text-left truncate max-w-[130px]">
                      {it.name}
                    </td>
                    <td className="py-1 px-2 text-right">
                      {it.quantity.toString()}
                    </td>
                    <td className="py-1 px-2 text-right">
                      {formatCurrency(it.unit)}
                    </td>
                    <td className="py-1 pl-2 text-right font-semibold text-slate-100">
                      {formatCurrency(it.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* BOTÕES DE AÇÃO */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onEdit}
            className="h-10 rounded-xl border border-slate-700 bg-slate-900/50 text-sky-400 hover:bg-sky-950/30 hover:border-sky-800 font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <Pencil size={16} /> Editar
          </button>

          <button
            onClick={onDelete}
            className="h-10 rounded-xl border border-slate-700 bg-slate-900/50 text-rose-400 hover:bg-rose-950/30 hover:border-rose-800 font-bold text-sm transition-all flex items-center justify-center gap-2"
          >
            <Trash2 size={16} /> Excluir
          </button>
        </div>
      </div>
    </div>
  );
}

function PriceSummaryWidget() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    count: 0,
    minPrice: 0,
    minPriceItem: "-",
    lastStore: "-",
    lastDate: "-",
  });

  useEffect(() => {
    try {
      const data = JSON.parse(
        localStorage.getItem("sirius-price-research-entries") || "[]"
      );
      const cats = JSON.parse(
        localStorage.getItem("sirius-price-research-categories") || "[]"
      );

      if (data.length > 0) {
        const cheapest = data.reduce((p: any, c: any) =>
          Number(c.price) < Number(p.price) ? c : p
        );

        let itemName = "Item";
        cats.forEach((c: any) => {
          const sub = c.subcategories?.find(
            (s: any) => s.id === cheapest.subcategoryId
          );
          if (sub) itemName = sub.name;
        });

        setStats({
          count: data.length,
          minPrice: Number(cheapest.price),
          minPriceItem: itemName,
          lastStore: data[0].store || "Loja",
          lastDate: data[0].date ? formatDate(data[0].date) : "-",
        });
      }
    } catch {}
  }, []);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 mt-6 shadow-lg shadow-black/30">
      <div className="flex items-center justify-between mb-6">
        <h2
          className="text-lg font-bold text-slate-100 flex items-center gap-2"
          style={{ textShadow: "0 3px 10px rgba(0,0,0,0.65)" }}
        >
          <Search size={18} className="text-purple-400" /> Rastreamento de
          Preços
        </h2>

        <button
          onClick={() => navigate("/analise-produtos")}
          className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors font-bold uppercase tracking-wider"
        >
          Ver Painel <ChevronRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => navigate("/analise-produtos")}
          className="cursor-pointer bg-slate-950 border border-slate-800 p-4 rounded-xl hover:border-purple-500/50 transition-all relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20">
            <ShoppingCart size={40} className="text-purple-500" />
          </div>
          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">
            Itens Rastreados
          </p>
          <p className="text-2xl font-bold text-slate-100">{stats.count}</p>
        </div>

        <div
          onClick={() => navigate("/analise-produtos")}
          className="cursor-pointer bg-slate-950 border border-slate-800 p-4 rounded-xl hover:border-emerald-500/50 transition-all relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20">
            <Tag size={40} className="text-emerald-500" />
          </div>
          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">
            Menor Preço ({stats.minPriceItem})
          </p>
          <p className="text-2xl font-bold text-emerald-400">
            {formatCurrency(stats.minPrice)}
          </p>
        </div>

        <div
          onClick={() => navigate("/analise-produtos")}
          className="cursor-pointer bg-slate-950 border border-slate-800 p-4 rounded-xl hover:border-blue-500/50 transition-all relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20">
            <Clock size={40} className="text-blue-500" />
          </div>
          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">
            Última Loja
          </p>
          <span className="text-lg font-bold text-slate-100 truncate block">
            {stats.lastStore}
          </span>
        </div>

        <div
          onClick={() => navigate("/analise-produtos")}
          className="cursor-pointer bg-slate-900 border-2 border-dashed border-slate-700 p-4 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all"
        >
          <BarChart3
            size={20}
            className="text-slate-400 group-hover:text-white"
          />
          <span className="font-bold text-xs text-slate-400 group-hover:text-white uppercase">
            Abrir Análise
          </span>
        </div>
      </div>
    </div>
  );
}

function calculateMonthlySummary(expenses: any[], incomes: any[], year: number) {
  const data = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    monthLabel: new Date(year, i, 1)
      .toLocaleDateString("pt-BR", { month: "short" })
      .toUpperCase(),
    entradas: 0,
    Saídas: 0,
    saldo: 0,
    percEntrada: 0,
    percSaída: 0,
  }));

  expenses.forEach((e) => {
    const d = new Date(e.date);
    if (d.getFullYear() === year) {
      data[d.getMonth()].Saídas += Math.abs(normalizeMoney(e.amount));
    }
  });

  incomes.forEach((i) => {
    const d = new Date(i.date);
    if (d.getFullYear() === year) {
      data[d.getMonth()].entradas += normalizeMoney(i.amount);
    }
  });

  data.forEach((d) => {
    d.saldo = d.entradas - d.Saídas;
    const total = d.entradas + d.Saídas;
    if (total > 0) {
      d.percEntrada = Math.round((d.entradas / total) * 100);
      d.percSaída = Math.round((d.Saídas / total) * 100);
    }
  });

  return data;
}

function calculateDailySummary(
  expenses: any[],
  incomes: any[],
  year: number,
  monthIndex: number
) {
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const data = Array.from({ length: daysInMonth }, (_, i) => ({
    label: String(i + 1).padStart(2, "0"),
    entradas: 0,
    Saídas: 0,
    saldo: 0,
    percEntrada: 0,
    percSaída: 0,
  }));

  expenses.forEach((e) => {
    const d = new Date(e.date);
    if (d.getFullYear() === year && d.getMonth() === monthIndex) {
      const day = d.getDate();
      if (data[day - 1])
        data[day - 1].Saídas += Math.abs(normalizeMoney(e.amount));
    }
  });

  incomes.forEach((i) => {
    const d = new Date(i.date);
    if (d.getFullYear() === year && d.getMonth() === monthIndex) {
      const day = d.getDate();
      if (data[day - 1]) data[day - 1].entradas += normalizeMoney(i.amount);
    }
  });

  data.forEach((d) => {
    d.saldo = d.entradas - d.Saídas;
    const total = d.entradas + d.Saídas;
    if (total > 0) {
      d.percEntrada = Math.round((d.entradas / total) * 100);
      d.percSaída = Math.round((d.Saídas / total) * 100);
    }
  });

  return data;
}

function calculateWeeklySummary(
  expenses: any[],
  incomes: any[],
  year: number,
  monthIndex: number
) {
  // até 5 semanas (S1..S5) — suficiente para qualquer mês
  const data = Array.from({ length: 5 }, (_, i) => ({
    label: `S${i + 1}`,
    entradas: 0,
    Saídas: 0,
    saldo: 0,
    percEntrada: 0,
    percSaída: 0,
  }));

  expenses.forEach((e) => {
    const d = new Date(e.date);
    if (d.getFullYear() === year && d.getMonth() === monthIndex) {
      const w = Math.floor((d.getDate() - 1) / 7);
      if (data[w]) data[w].Saídas += Math.abs(normalizeMoney(e.amount));
    }
  });

  incomes.forEach((i) => {
    const d = new Date(i.date);
    if (d.getFullYear() === year && d.getMonth() === monthIndex) {
      const w = Math.floor((d.getDate() - 1) / 7);
      if (data[w]) data[w].entradas += normalizeMoney(i.amount);
    }
  });

  data.forEach((d) => {
    d.saldo = d.entradas - d.Saídas;
    const total = d.entradas + d.Saídas;
    if (total > 0) {
      d.percEntrada = Math.round((d.entradas / total) * 100);
      d.percSaída = Math.round((d.Saídas / total) * 100);
    }
  });

  return data;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md">
        <p className="mb-2 font-bold text-slate-100 uppercase text-xs tracking-wider border-b border-slate-700 pb-1">
          {label}
        </p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-slate-300">Entradas</span>
            <span className="font-bold text-blue-400">
              {formatCurrency(data.entradas)} ({data.percEntrada}%)
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-slate-300">saídas</span>
            <span className="font-bold text-red-400">
              {formatCurrency(data.Saídas)} ({data.percSaída}%)
            </span>
          </div>
          <div className="flex justify-between gap-4 pt-1 border-t border-slate-800 mt-1">
            <span className="text-slate-200">Saldo</span>
            <span className="font-bold text-yellow-400">
              {formatCurrency(data.saldo)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

function InfoCard({
  title,
  value,
  icon: Icon,
  type,
  onClick,
  isActive,
}: any) {
  const activeClasses: Record<string, string> = {
    saldo: "bg-blue-900/20 border-blue-500/50",
    entrada: "bg-emerald-900/20 border-emerald-500/50",
    Saída: "bg-rose-900/20 border-rose-500/50",
  };

  const iconBg: Record<string, string> = {
    saldo: "bg-blue-950 text-blue-400",
    entrada: "bg-emerald-950 text-emerald-400",
    Saída: "bg-rose-950 text-rose-400",
  };

  return (
    <div
      onClick={onClick}
      className={clsx(
        "cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:scale-[1.02]",
        isActive ? activeClasses[type] : "bg-slate-900 border-slate-800 hover:border-slate-700"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className={clsx(
            "text-sm font-medium",
            isActive ? "text-slate-200" : "text-slate-400"
          )}
        >
          {title}
        </span>
        <div className={clsx("p-1.5 rounded-lg", iconBg[type])}>
          <Icon size={18} />
        </div>
      </div>
      <div
        className={clsx(
          "text-2xl font-bold tracking-tight",
          value >= 0 ? "text-slate-100" : "text-rose-400"
        )}
      >
        {formatCurrency(value)}
      </div>
    </div>
  );
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } =
    props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="#1e293b"
        strokeWidth={2}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 10}
        outerRadius={outerRadius + 12}
        fill={fill}
      />
    </g>
  );
};

const renderSliceLabel = ({
  cx = 0,
  cy = 0,
  midAngle,
  outerRadius,
  name,
  fill,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  outerRadius?: number;
  name?: string;
  fill?: string;
}) => {
  if (midAngle === undefined || outerRadius === undefined) return null;
  const RAD = Math.PI / 180;
  const cos = Math.cos(-midAngle * RAD);
  const sin = Math.sin(-midAngle * RAD);
  const outer = outerRadius;
  const sx = cx + (outer + 10) * cos;
  const sy = cy + (outer + 10) * sin;
  // Mantem os labels mais "pra dentro" para evitar corte lateral do SVG
  const mx = cx + (outer + 28) * cos;
  const my = cy + (outer + 28) * sin;
  const ex = mx + (cos >= 0 ? 38 : -38);
  const ey = my;
  const anchor = cos >= 0 ? "start" : "end";
  const safeName =
    name && name.length > 18 ? `${name.slice(0, 16)}…` : name;
  const stroke = fill ?? "#94a3b8";

  return (
    <g>
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={stroke}
        strokeWidth={1.6}
        fill="none"
        opacity={0.9}
      />
      <circle cx={ex} cy={ey} r={2.4} fill={stroke} />
      <text
        x={ex + (cos >= 0 ? 8 : -8)}
        y={ey}
        textAnchor={anchor}
        dominantBaseline="middle"
        className="fill-slate-100"
        style={{
          fontSize: 11,
          fontWeight: 800,
          filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.85))",
          pointerEvents: "none",
        }}
      >
        {name && <title>{name}</title>}
        <tspan x={ex + (cos >= 0 ? 8 : -8)} dy="0">
          {safeName}
        </tspan>
      </text>
    </g>
  );
};

export default function FinanceDashboard() {
  const { expenses, incomes, loading, loadIncomes, loadExpenses } =
    useFinance();
  const { categories, loading: loadingCategories } = useCategories();
  const navigate = useNavigate();

  const initialLoad = useRef(false);
  const now = new Date();

  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  useEffect(() => {
    const check = () => {
      if (typeof window === "undefined") return;
      setIsNarrowViewport(window.innerWidth < 520);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [viewMode, setViewMode] = useState<"geral" | "Saídas" | "entradas">(
    "geral"
  );
  const [isReceiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<"expense" | "income" | null>(
    null
  );
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // modos do gráfico (um por vez)
  const [evolutionMode, setEvolutionMode] = useState<
    "anual" | "mensal_diario" | "mensal_semanal"
  >("anual");

  // seleção p/ exclusão em massa
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!initialLoad.current) {
      initialLoad.current = true;
      loadIncomes();
      loadExpenses();
    }
  }, [loadIncomes, loadExpenses]);

  const filteredExpenses = useMemo(
    () =>
      expenses.filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      }),
    [expenses, selectedMonth, selectedYear]
  );

  const filteredIncomes = useMemo(
    () =>
      incomes.filter((i) => {
        const d = new Date(i.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      }),
    [incomes, selectedMonth, selectedYear]
  );

  const totalSaídas = filteredExpenses.reduce(
    (acc, e) => acc + Math.abs(normalizeMoney(e.amount)),
    0
  );
  const totalEntradas = filteredIncomes.reduce(
    (acc, i) => acc + normalizeMoney(i.amount),
    0
  );
  const saldoMes = totalEntradas - totalSaídas;

  const categoryPalette = useMemo(() => {
    const palette = new Map<string, string>();
    const fallbacks = [
      "#3b82f6",
      "#ef4444",
      "#10b981",
      "#f59e0b",
      "#8b5cf6",
      "#ec4899",
      "#06b6d4",
      "#f97316",
    ];
    categories.forEach((c, idx) =>
      palette.set(c.name, c.color || fallbacks[idx % fallbacks.length])
    );
    expenses.forEach((e, idx) => {
      if (!palette.has(e.category))
        palette.set(e.category, fallbacks[idx % fallbacks.length]);
    });
    return palette;
  }, [categories, expenses]);

  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    filteredExpenses.forEach((e) => {
      const current = map.get(e.category) ?? 0;
      map.set(e.category, current + Math.abs(normalizeMoney(e.amount)));
    });

    const result: any[] = [];
    map.forEach((total, name) => {
      if (total > 0)
        result.push({
          id: name,
          name,
          total,
          percent: totalSaídas ? total / totalSaídas : 0,
          color: categoryPalette.get(name) ?? "#cbd5e1",
        });
    });

    return result.sort((a, b) => b.total - a.total);
  }, [filteredExpenses, categoryPalette, totalSaídas]);

  const categoryChartData = useMemo(() => {
    const total = categoryStats.reduce((acc, item) => acc + item.total, 0) || 1;
    return categoryStats.map((it) => ({ ...it, percent: it.total / total }));
  }, [categoryStats]);

  // Slice em foco (hover / clique) para mostrar detalhes no centro
  const [focusedSlice, setFocusedSlice] = useState<any | null>(null);

  const categoryHudByName = useMemo(() => {
    const map = new Map<
      string,
      { count: number; total: number; max: number; avg: number }
    >();

    // init to keep stable keys (also for categories with 0 tx after filtering)
    categoryChartData.forEach((c) => {
      map.set(c.name, { count: 0, total: 0, max: 0, avg: 0 });
    });

    filteredExpenses.forEach((e) => {
      const name = e.category;
      const value = Math.abs(normalizeMoney(e.amount));
      const prev = map.get(name) ?? { count: 0, total: 0, max: 0, avg: 0 };
      const next = {
        count: prev.count + 1,
        total: prev.total + value,
        max: Math.max(prev.max, value),
        avg: 0,
      };
      map.set(name, next);
    });

    // finalize averages
    map.forEach((v, k) => {
      map.set(k, { ...v, avg: v.count > 0 ? v.total / v.count : 0 });
    });

    return map;
  }, [categoryChartData, filteredExpenses]);

  const prevMonthCategoryTotals = useMemo(() => {
    const d = new Date(selectedYear, selectedMonth - 1, 1);
    const prevMonth = d.getMonth();
    const prevYear = d.getFullYear();
    const map = new Map<string, number>();

    expenses.forEach((e) => {
      const dt = new Date(e.date);
      if (dt.getFullYear() !== prevYear || dt.getMonth() !== prevMonth) return;
      const current = map.get(e.category) ?? 0;
      map.set(e.category, current + Math.abs(normalizeMoney(e.amount)));
    });

    return map;
  }, [expenses, selectedMonth, selectedYear]);

  const selectedSlice = useMemo(
    () =>
      selectedCategory
        ? categoryChartData.find((c) => c.name === selectedCategory) ?? null
        : null,
    [selectedCategory, categoryChartData]
  );

  const hudSlice = focusedSlice || selectedSlice;
  const hudRank = hudSlice
    ? categoryChartData.findIndex((c) => c.name === hudSlice.name) + 1
    : null;
  const hudStats = hudSlice ? categoryHudByName.get(hudSlice.name) : null;
  const hudValue = hudSlice ? Number(hudSlice.total ?? 0) : totalSaídas || 0;
  const hudAccent = hudSlice?.color ?? "#22c55e";
  const hudCount = hudSlice ? hudStats?.count ?? 0 : filteredExpenses.length;
  const hudTicket = hudSlice
    ? hudStats?.avg ?? 0
    : hudCount > 0
      ? hudValue / hudCount
      : 0;
  const hudMax = hudSlice ? hudStats?.max ?? 0 : 0;
  const prevTotal = hudSlice
    ? prevMonthCategoryTotals.get(hudSlice.name) ?? 0
    : 0;
  const delta = hudSlice ? hudValue - prevTotal : 0;
  const deltaPct =
    hudSlice && prevTotal > 0 ? (delta / prevTotal) * 100 : null;
  const hudDeltaLabel =
    hudSlice && prevTotal > 0 && deltaPct !== null
      ? `${delta >= 0 ? "+" : ""}${formatCurrency(delta)} (${deltaPct >= 0 ? "+" : ""}${Math.round(deltaPct)}%)`
      : null;

  const chartEvolutionData = useMemo(() => {
    if (evolutionMode === "mensal_diario")
      return calculateDailySummary(expenses, incomes, selectedYear, selectedMonth);
    if (evolutionMode === "mensal_semanal")
      return calculateWeeklySummary(
        expenses,
        incomes,
        selectedYear,
        selectedMonth
      );
    return calculateMonthlySummary(expenses, incomes, selectedYear);
  }, [expenses, incomes, selectedYear, selectedMonth, evolutionMode]);

  const xKey = evolutionMode === "anual" ? "monthLabel" : "label";

  const evolutionTitle =
    evolutionMode === "anual"
      ? "Evolução Anual"
      : evolutionMode === "mensal_semanal"
      ? "Evolução Mensal (Semanas)"
      : "Evolução Mensal (Dias)";

  const currentList = useMemo(() => {
    if (viewMode === "entradas") return filteredIncomes;
    if (viewMode === "Saídas") return filteredExpenses;

    let list = [...filteredExpenses];
    if (selectedCategory)
      list = list.filter((e) => e.category === selectedCategory);

    return list.sort(
      (a, b) =>
        Math.abs(normalizeMoney(b.amount)) - Math.abs(normalizeMoney(a.amount))
    );
  }, [viewMode, filteredIncomes, filteredExpenses, selectedCategory]);

  const handlePrevMonth = () => {
    const d = new Date(selectedYear, selectedMonth - 1, 1);
    setSelectedMonth(d.getMonth());
    setSelectedYear(d.getFullYear());
    setSelectedCategory(null);
    setSelectedIds([]);
  };

  const handleNextMonth = () => {
    const d = new Date(selectedYear, selectedMonth + 1, 1);
    setSelectedMonth(d.getMonth());
    setSelectedYear(d.getFullYear());
    setSelectedCategory(null);
    setSelectedIds([]);
  };

  const currentMonthLabel = new Date(selectedYear, selectedMonth, 1).toLocaleDateString(
    "pt-BR",
    {
      month: "long",
      year: "numeric",
    }
  );

  const openItem = (item: any, type: "expense" | "income") => {
    setSelectedItem(item);
    setSelectedType(type);
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    if (confirm("Tem certeza que deseja excluir?")) {
      if (selectedType === "expense") {
        await supabase.from("expenses").delete().eq("id", selectedItem.id);
        loadExpenses();
      } else {
        await supabase.from("incomes").delete().eq("id", selectedItem.id);
        loadIncomes();
      }
      setSelectedItem(null);
    }
  };

  const handleEditItem = () => {
    if (selectedItem) {
      navigate(
        selectedType === "expense"
          ? `/saidas/editar/${selectedItem.id}`
          : `/entradas/editar/${selectedItem.id}`
      );
      setSelectedItem(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === currentList.length) setSelectedIds([]);
    else setSelectedIds(currentList.map((i: any) => i.id));
  };

  const handleBulkDelete = async () => {
    if (confirm(`Deseja excluir ${selectedIds.length} itens selecionados?`)) {
      const table = viewMode === "entradas" ? "incomes" : "expenses";
      for (const id of selectedIds) {
        await supabase.from(table).delete().eq("id", id);
      }
      if (viewMode === "entradas") loadIncomes();
      else loadExpenses();
      setSelectedIds([]);
    }
  };

  if (loading || loadingCategories)
    return (
      <div className="p-10 text-center text-slate-400">Carregando dados...</div>
    );

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6 pb-24">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Dashboard
          </h1>
          <p className="text-sm text-slate-400">VISÃO GERAL do mês</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              {"<"}
            </button>
            <span className="min-w-[120px] text-center text-sm font-semibold capitalize text-slate-200">
              {currentMonthLabel}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
            >
              {">"}
            </button>
          </div>

          <button
            onClick={() => setReceiptModalOpen(true)}
            className="flex-1 sm:flex-none rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 transition-colors"
          >
            Importar Cupom
          </button>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoCard
          title="Saldo"
          value={saldoMes}
          icon={Wallet2}
          type="saldo"
          isActive={viewMode === "geral"}
          onClick={() => {
            setViewMode("geral");
            setSelectedIds([]);
          }}
        />
        <InfoCard
          title="Entradas"
          value={totalEntradas}
          icon={ArrowUpRight}
          type="entrada"
          isActive={viewMode === "entradas"}
          onClick={() => {
            setViewMode("entradas");
            setSelectedIds([]);
          }}
        />
        <InfoCard
          title="saídas"
          value={totalSaídas}
          icon={ArrowDownRight}
          type="Saída"
          isActive={viewMode === "Saídas"}
          onClick={() => {
            setViewMode("Saídas");
            setSelectedIds([]);
          }}
        />
      </div>

      {/* VISÃO GERAL */}
      {viewMode === "geral" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-6 shadow-lg shadow-black/30">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <h2
                className="text-lg font-semibold text-slate-100 flex items-center gap-2"
                style={{ textShadow: "0 3px 10px rgba(0,0,0,0.65)" }}
              >
                <TrendingUp size={18} className="text-blue-400" />{" "}
                {evolutionTitle}
              </h2>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEvolutionMode("anual")}
                  className={clsx(
                    "px-3 py-1 rounded-lg text-xs font-bold border transition-colors",
                    evolutionMode === "anual"
                      ? "bg-slate-950 text-white border-slate-700"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                  )}
                >
                  Anual
                </button>
                <button
                  onClick={() => setEvolutionMode("mensal_semanal")}
                  className={clsx(
                    "px-3 py-1 rounded-lg text-xs font-bold border transition-colors",
                    evolutionMode === "mensal_semanal"
                      ? "bg-slate-950 text-white border-slate-700"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                  )}
                >
                  Mensal (Semanas)
                </button>
                <button
                  onClick={() => setEvolutionMode("mensal_diario")}
                  className={clsx(
                    "px-3 py-1 rounded-lg text-xs font-bold border transition-colors",
                    evolutionMode === "mensal_diario"
                      ? "bg-slate-950 text-white border-slate-700"
                      : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                  )}
                >
                  Mensal (Dias)
                </button>
              </div>
            </div>

            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartEvolutionData}
                  margin={{ top: 34, right: 20, bottom: 28, left: 32 }}
                >
                  <CartesianGrid
                    stroke="#1e293b"
                    vertical={false}
                    strokeDasharray="3 3"
                  />
                  <XAxis
                    dataKey={xKey}
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    hide
                    domain={["dataMin", "dataMax"]}
                    padding={{ top: 22, bottom: 22 }}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: "#ffffff05" }}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => (
                      <span className="text-slate-400 text-xs font-bold uppercase ml-1 mr-3">
                        {value}
                      </span>
                    )}
                  />

                  <Bar
                    dataKey="entradas"
                    name="Entradas"
                    fill={SOLID_BLUE}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  >
                    <LabelList
                      dataKey="entradas"
                      position="top"
                      formatter={(value: any) => {
                        const num = typeof value === "number" ? value : Number(value ?? 0);
                        return num > 0 ? `${(num / 1000).toFixed(1)}k` : "";
                      }}
                      style={{
                        fill: "#60a5fa",
                        fontSize: "10px",
                        fontWeight: 700,
                      }}
                    />
                    <LabelList
                      dataKey="percEntrada"
                      position="insideBottom"
                      formatter={(value: any) => {
                        const num = typeof value === "number" ? value : Number(value ?? 0);
                        return num > 0 ? `${num}%` : "";
                      }}
                      style={{
                        fill: "#ffffff",
                        fontSize: "10px",
                        fontWeight: 600,
                        opacity: 0.8,
                      }}
                    />
                  </Bar>

                  <Bar
                    dataKey="Saídas"
                    name="saídas"
                    fill={SOLID_RED}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  >
                    <LabelList
                      dataKey="Saídas"
                      position="top"
                      formatter={(value: any) => {
                        const num = typeof value === "number" ? value : Number(value ?? 0);
                        return num > 0 ? `${(num / 1000).toFixed(1)}k` : "";
                      }}
                      style={{
                        fill: "#f87171",
                        fontSize: "10px",
                        fontWeight: 700,
                      }}
                    />
                    <LabelList
                      dataKey="percSaída"
                      position="insideBottom"
                      formatter={(value: any) => {
                        const num = typeof value === "number" ? value : Number(value ?? 0);
                        return num > 0 ? `${num}%` : "";
                      }}
                      style={{
                        fill: "#ffffff",
                        fontSize: "10px",
                        fontWeight: 600,
                        opacity: 0.8,
                      }}
                    />
                  </Bar>

                  <Line
                    type="monotone"
                    dataKey="saldo"
                    name="Saldo"
                    stroke={COLOR_SALDO}
                    strokeWidth={3}
                    dot={{
                      r: 4,
                      fill: "#0f172a",
                      stroke: COLOR_SALDO,
                      strokeWidth: 2,
                    }}
                    activeDot={{ r: 6, fill: COLOR_SALDO }}
                  >
                    <LabelList
                      dataKey="saldo"
                      position="top"
                      offset={16}
                      formatter={(value: any) => {
                        const n = normalizeMoney(value);
                        if (!Number.isFinite(n) || n === 0) return "";
                        if (Math.abs(n) >= 1000) {
                          const sign = n < 0 ? "-" : "";
                          return `${sign}${(Math.abs(n) / 1000).toFixed(1)}k`;
                        }
                        return formatCurrency(n);
                      }}
                      style={{
                        fill: COLOR_SALDO,
                        fontSize: "11px",
                        fontWeight: "800",
                        textShadow: "0px 1px 2px rgba(0,0,0,0.8)",
                      }}
                    />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PIE POR CATEGORIA */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-6 flex flex-col shadow-lg shadow-black/30">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-lg font-semibold text-slate-100"
                  style={{ textShadow: "0 3px 10px rgba(0,0,0,0.65)" }}
                >
                  {selectedCategory
                    ? `Filtrado: ${selectedCategory}`
                    : "Por Categoria"}
                </h2>

                {selectedCategory ? (
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 border border-rose-900 bg-rose-950/30 px-2 py-1 rounded"
                  >
                    <X size={12} /> Limpar
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">
                    Clique na fatia
                  </span>
                )}
              </div>

              <div className="w-full h-[360px] relative flex flex-col gap-3 items-center justify-center">
                {categoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 6, right: 28, bottom: 18, left: 28 }}>
                      <defs>
                        <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
                          <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#22d3ee" floodOpacity="0.35" />
                        </filter>
                        <radialGradient id="centerGlass" cx="50%" cy="42%" r="70%">
                          <stop offset="0%" stopColor="#0b1220" stopOpacity="0.85" />
                          <stop offset="55%" stopColor="#030712" stopOpacity="0.55" />
                          <stop offset="100%" stopColor="#020617" stopOpacity="0.25" />
                        </radialGradient>
                      </defs>
                      <PieAny
                        activeIndex={
                          selectedCategory
                            ? categoryChartData.findIndex(
                                (c) => c.name === selectedCategory
                              )
                            : activeIndex
                        }
                        activeShape={renderActiveShape}
                        data={categoryChartData}
                        cx="50%"
                        cy="48%"
                        labelLine={false}
                        // Em telas estreitas, os labels externos sao cortados pelo viewport/SVG.
                        // No mobile, mostramos a legenda/ranking abaixo e desabilitamos labels no grafico.
                        label={isNarrowViewport ? false : renderSliceLabel}
                        // Afina o anel e aumenta o espaço central (HUD)
                        outerRadius={isNarrowViewport ? 96 : 112}
                        innerRadius={isNarrowViewport ? 84 : 100}
                        dataKey="total"
                        paddingAngle={2}
                        minAngle={4}
                        isAnimationActive={false}
                        onMouseEnter={(_: unknown, index: number) =>
                          setActiveIndex(index)
                        }
                        onMouseLeave={() => setFocusedSlice(null)}
                        onClick={(data: any) =>
                          setSelectedCategory(
                            selectedCategory === data.name ? null : data.name
                          )
                        }
                        className="cursor-pointer focus:outline-none"
                      >
                        {categoryChartData.map((entry, index) => (
                          <CellAny
                            key={`cell-${index}`}
                            fill={entry.color}
                            {...({ cornerRadius: 4 } as any)}
                            stroke="none"
                            style={{ outline: "none" }}
                            opacity={
                              selectedCategory &&
                              selectedCategory !== entry.name
                                ? 0.3
                                : 1
                            }
                            filter={focusedSlice?.name === entry.name ? "url(#glow)" : undefined}
                            onMouseEnter={() => setFocusedSlice(entry)}
                          />
                        ))}
                      </PieAny>

                      {/* HUD central agora é renderizado via overlay HTML (mais legível) */}
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500">
                    <p>Sem gastos</p>
                  </div>
                )}

                {/* Overlay central (HUD) - alinhado ao cy="48%" do gráfico */}
                <div className="pointer-events-none absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2">
                  <div
                    className={`relative flex flex-col items-center justify-center rounded-full border shadow-2xl backdrop-blur-xl ${
                      isNarrowViewport ? "h-[124px] w-[124px]" : "h-[150px] w-[150px]"
                    }`}
                    style={{
                      borderColor: `${hudAccent}66`,
                      background:
                        "radial-gradient(circle at 30% 20%, rgba(15,23,42,0.92), rgba(2,6,23,0.74) 55%, rgba(2,6,23,0.44) 100%)",
                      boxShadow: `0 0 28px ${hudAccent}2b`,
                    }}
                  >
                    <div
                      className="absolute inset-2.5 rounded-full border border-white/10"
                      style={{
                        boxShadow: `inset 0 0 18px ${hudAccent}22`,
                      }}
                    />

                    <div className="text-[10px] uppercase tracking-[0.18em] text-slate-300">
                      {hudSlice?.name ?? "Total filtrado"}
                    </div>

                    {hudRank && !isNarrowViewport && (
                      <div className="mt-1 text-[10px] text-slate-400">{`RANK #${hudRank}`}</div>
                    )}

                    <div
                      className={`mt-2 font-black ${
                        isNarrowViewport ? "text-[18px]" : "text-[22px]"
                      }`}
                      style={{
                        color: hudAccent,
                        textShadow: `0 0 18px ${hudAccent}33`,
                      }}
                    >
                      {formatCurrency(hudValue)}
                    </div>

                    {/* Métricas relevantes (sem repetir lista de %/valor abaixo) */}
                    <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 px-3">
                      <span className="rounded-full border border-white/10 bg-slate-950/40 px-2 py-0.5 text-[10px] text-slate-300">
                        {hudSlice ? `Tx ${hudCount}` : `Tx ${filteredExpenses.length}`}
                      </span>
                      <span className="rounded-full border border-white/10 bg-slate-950/40 px-2 py-0.5 text-[10px] text-slate-300">
                        {`Ticket ${formatCurrency(hudTicket)}`}
                      </span>
                      {!!hudMax && (
                        <span className="rounded-full border border-white/10 bg-slate-950/40 px-2 py-0.5 text-[10px] text-slate-300">
                          {`Maior ${formatCurrency(hudMax)}`}
                        </span>
                      )}
                    </div>

                    {hudDeltaLabel && !isNarrowViewport && (
                      <div className="mt-1 text-[10px] text-slate-500">
                        {`Δ mês anterior ${hudDeltaLabel}`}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {categoryChartData.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {categoryChartData.map((item, index) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 transition ${
                        focusedSlice?.name === item.name
                          ? "border-emerald-500/70 bg-emerald-500/10"
                          : "border-slate-800/80 bg-slate-900/60 hover:border-slate-700"
                      }`}
                      onMouseEnter={() => setFocusedSlice(item)}
                      onMouseLeave={() => setFocusedSlice(null)}
                    >
                      <span
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-slate-100 text-[12px] leading-tight">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-slate-300">
                          {formatCurrency(item.total)} •{" "}
                          {(item.percent * 100).toFixed(1)}%
                        </p>
                      </div>
                      <span
                        className={`text-[10px] font-bold ${
                          index === 0
                            ? "text-amber-300"
                            : index === 1
                            ? "text-slate-200"
                            : index === 2
                            ? "text-amber-500/80"
                            : "text-slate-400"
                        }`}
                      >
                        #{index + 1}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MAIORES GASTOS / LISTA */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-6 flex flex-col h-[400px] lg:h-auto shadow-lg shadow-black/30">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-lg font-semibold text-slate-100"
                  style={{ textShadow: "0 3px 10px rgba(0,0,0,0.65)" }}
                >
                  {selectedCategory
                    ? `Gastos em ${selectedCategory}`
                    : "Maiores Gastos"}
                </h2>

                <div className="flex items-center gap-2">
                  {selectedIds.length > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      className="text-xs flex items-center gap-1 bg-rose-600 text-white px-2 py-1 rounded font-bold hover:bg-rose-500"
                    >
                      <Trash2 size={12} /> Excluir ({selectedIds.length})
                    </button>
                  )}
                  <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-md">
                    {currentList.length} itens
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-hidden relative rounded-lg border border-slate-800/50 bg-slate-950/30 transition-all">
                {currentList.length > 0 ? (
                  <div className="absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
                    <table className="w-full text-left">
                      <thead className="sticky top-0 bg-slate-950 text-xs text-slate-500 font-semibold uppercase z-10">
                        <tr>
                          <th className="px-3 py-2 w-8">
                            <button
                              onClick={toggleSelectAll}
                              className="flex items-center text-slate-400 hover:text-white"
                            >
                              {selectedIds.length > 0 &&
                              selectedIds.length === currentList.length ? (
                                <CheckSquare size={16} />
                              ) : (
                                <Square size={16} />
                              )}
                            </button>
                          </th>
                          <th className="px-3 py-2">Data</th>
                          <th className="px-3 py-2">Descrição</th>
                          <th className="px-3 py-2 text-right">Valor</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-800/50">
                        {currentList.map((expense: any) => (
                          <tr
                            key={expense.id}
                            className={clsx(
                              "hover:bg-slate-900/80 transition-colors text-xs sm:text-sm cursor-pointer",
                              selectedIds.includes(expense.id) &&
                                "bg-blue-900/20"
                            )}
                          >
                            <td
                              className="px-3 py-2.5 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSelect(expense.id);
                              }}
                            >
                              <div
                                className={clsx(
                                  "cursor-pointer",
                                  selectedIds.includes(expense.id)
                                    ? "text-blue-400"
                                    : "text-slate-600"
                                )}
                              >
                                {selectedIds.includes(expense.id) ? (
                                  <CheckSquare size={16} />
                                ) : (
                                  <Square size={16} />
                                )}
                              </div>
                            </td>

                            <td
                              className="px-3 py-2.5 text-slate-400 font-mono text-[10px] sm:text-xs"
                              onClick={() => openItem(expense, "expense")}
                            >
                              {formatDate(expense.date).substring(0, 5)}
                            </td>

                            <td
                              className="px-3 py-2.5 text-slate-200"
                              onClick={() => openItem(expense, "expense")}
                            >
                              <div className="font-medium truncate max-w-[120px]">
                                {expense.description}
                              </div>
                              <div className="text-[10px] text-slate-500 truncate">
                                {expense.category}
                              </div>
                            </td>

                            <td
                              className="px-3 py-2.5 text-right font-bold text-rose-400"
                              onClick={() => openItem(expense, "expense")}
                            >
                              {formatCurrency(
                                Math.abs(normalizeMoney(expense.amount))
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-slate-500 gap-2">
                    <Filter size={24} className="opacity-50" />
                    <p className="text-xs">Nenhum gasto.</p>
                    {selectedCategory && (
                      <button
                        onClick={() => setSelectedCategory(null)}
                        className="text-xs text-sky-400 hover:underline"
                      >
                        Ver todos
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <PriceSummaryWidget />
        </div>
      )}

      {/* VISÃO DETALHADA */}
      {(viewMode === "entradas" || viewMode === "Saídas") && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-100">
              {viewMode === "entradas"
                ? "Todas as Entradas"
                : "Todas as saídas"}
            </h2>

            <div className="flex gap-3">
              {selectedIds.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="text-xs flex items-center gap-1 bg-rose-600 text-white px-3 py-1 rounded font-bold hover:bg-rose-500 shadow-lg shadow-rose-900/20"
                >
                  <Trash2 size={14} /> Excluir Selecionados (
                  {selectedIds.length})
                </button>
              )}

              <button
                onClick={() => setViewMode("geral")}
                className="text-sm text-sky-400 hover:text-sky-300"
              >
                Voltar
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/30">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center text-slate-400 hover:text-white"
                    >
                      {selectedIds.length > 0 &&
                      selectedIds.length === currentList.length ? (
                        <CheckSquare size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                  </th>
                  <th className="px-4 py-3 font-semibold">Data</th>
                  <th className="px-4 py-3 font-semibold">Descrição</th>
                  {viewMode === "Saídas" && (
                    <th className="px-4 py-3 font-semibold">Categoria</th>
                  )}
                  <th className="px-4 py-3 font-semibold text-right">Valor</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800">
                {currentList.map((item: any) => (
                  <tr
                    key={item.id}
                    className={clsx(
                      "hover:bg-slate-800/50 transition-colors cursor-pointer",
                      selectedIds.includes(item.id) && "bg-blue-900/10"
                    )}
                  >
                    <td
                      className="px-4 py-3"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.id);
                      }}
                    >
                      <div
                        className={clsx(
                          "cursor-pointer",
                          selectedIds.includes(item.id)
                            ? "text-blue-400"
                            : "text-slate-600"
                        )}
                      >
                        {selectedIds.includes(item.id) ? (
                          <CheckSquare size={18} />
                        ) : (
                          <Square size={18} />
                        )}
                      </div>
                    </td>

                    <td
                      className="px-4 py-3 text-slate-400 font-mono text-xs"
                      onClick={() =>
                        openItem(item, viewMode === "Saídas" ? "expense" : "income")
                      }
                    >
                      {formatDate(item.date)}
                    </td>

                    <td
                      className="px-4 py-3 font-medium text-slate-200"
                      onClick={() =>
                        openItem(item, viewMode === "Saídas" ? "expense" : "income")
                      }
                    >
                      {item.description}
                      {item.source && (
                        <span className="ml-2 text-[10px] text-slate-500 border border-slate-800 px-1 rounded">
                          {item.source}
                        </span>
                      )}
                    </td>

                    {viewMode === "Saídas" && (
                      <td
                        className="px-4 py-3 text-xs text-slate-400"
                        onClick={() => openItem(item, "expense")}
                      >
                        {item.category}
                      </td>
                    )}

                    <td
                      className={clsx(
                        "px-4 py-3 text-right font-bold",
                        viewMode === "entradas"
                          ? "text-emerald-400"
                          : "text-rose-400"
                      )}
                      onClick={() =>
                        openItem(item, viewMode === "Saídas" ? "expense" : "income")
                      }
                    >
                      {formatCurrency(
                        Math.abs(normalizeMoney(item.amount))
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ReceiptImportModal
        isOpen={isReceiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
      />
      <TransactionModal
        item={selectedItem}
        type={selectedType || "expense"}
        onClose={() => setSelectedItem(null)}
        onDelete={handleDeleteItem}
        onEdit={handleEditItem}
      />
    </div>
  );
}







