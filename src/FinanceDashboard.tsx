import {
  Bar, CartesianGrid, ComposedChart, LabelList, Line, Pie, PieChart,
  ResponsiveContainer, Tooltip, Legend, XAxis, YAxis, Cell, Sector
} from "recharts";
import { 
  Wallet2, ArrowDownRight, ArrowUpRight, TrendingUp, Filter, Pencil, Trash2, X, Tag, 
  CheckCircle2, CreditCard, ShoppingCart, Search, BarChart3, ChevronRight, Clock,
  MapPin, FileText, Calendar, CheckSquare, Square
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

// --- MODAL DE DETALHES ---
function TransactionModal({ item, type, onClose, onDelete, onEdit }: any) {
  const { paymentMethods } = useFinance();
  if (!item) return null;

  // Tenta buscar o nome do pagamento
  const paymentMethodName = paymentMethods.find((pm: any) => pm.id === item.paymentMethodId)?.name || "Não informado";
  
  // Tenta mostrar o local (mesmo que o Context antigo não mande, deixamos preparado)
  const locationName = item.receiptStore || item.location || "Local não informado";
  const observationText = item.observation || item.obs || null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
        <h3 className="text-lg font-bold text-slate-100 mb-6 text-center border-b border-slate-800 pb-4">
          Detalhes da {type === 'expense' ? 'Saída' : 'Entrada'}
        </h3>
        
        <div className="flex flex-col items-center mb-6">
          <span className={clsx("text-4xl font-black tracking-tight", type === 'expense' ? "text-rose-400" : "text-emerald-400")}>
            {formatCurrency(Math.abs(item.amount))}
          </span>
          {type === 'expense' && (
             <span className={clsx("mt-2 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider", item.status === 'paga' ? "bg-emerald-950/30 text-emerald-400 border-emerald-900" : "bg-amber-950/30 text-amber-400 border-amber-900")}>
                {item.status === 'paga' ? 'PAGO' : 'PENDENTE'}
             </span>
          )}
        </div>

        <div className="mb-6 text-center">
           <p className="text-slate-100 font-medium text-lg leading-tight">{item.description}</p>
           <p className="text-slate-500 text-[10px] uppercase font-bold mt-1">Descrição</p>
        </div>

        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/50 mb-6 grid grid-cols-2 gap-y-5 gap-x-4">
          <div className="flex flex-col gap-1">
             <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase"><Calendar size={12}/> Data</div>
             <p className="text-slate-200 text-sm font-medium">{formatDate(item.date)}</p>
          </div>
          {type === 'expense' && (
            <div className="flex flex-col gap-1">
               <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase"><Tag size={12}/> Categoria</div>
               <p className="text-slate-200 text-sm font-medium truncate">{item.category}</p>
            </div>
          )}
          <div className="flex flex-col gap-1">
             <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase"><MapPin size={12}/> Local</div>
             <p className="text-slate-400 text-sm italic truncate">{locationName}</p>
          </div>
          {type === 'expense' && (
            <div className="flex flex-col gap-1">
               <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase"><CreditCard size={12}/> Pagamento</div>
               <p className="text-slate-200 text-sm font-medium truncate">{paymentMethodName}</p>
            </div>
          )}
        </div>

        {observationText && (
          <div className="mb-6 bg-slate-900/30 p-3 rounded-lg border border-slate-800/30">
             <div className="flex items-center gap-2 text-slate-500 text-[10px] font-black uppercase mb-1"><FileText size={12}/> Observações</div>
             <p className="text-slate-300 text-sm italic leading-relaxed">"{observationText}"</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
            <button onClick={onEdit} className="h-10 rounded-xl border border-slate-700 bg-slate-900/50 text-sky-400 hover:bg-sky-950/30 hover:border-sky-800 font-bold text-sm transition-all flex items-center justify-center gap-2">
                <Pencil size={16}/> Editar
            </button>
            <button onClick={onDelete} className="h-10 rounded-xl border border-slate-700 bg-slate-900/50 text-rose-400 hover:bg-rose-950/30 hover:border-rose-800 font-bold text-sm transition-all flex items-center justify-center gap-2">
                <Trash2 size={16}/> Excluir
            </button>
        </div>
      </div>
    </div>
  )
}

function PriceSummaryWidget() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ count: 0, minPrice: 0, minPriceItem: "-", lastStore: "-", lastDate: "-" });
  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem("sirius-price-research-entries") || "[]");
      const cats = JSON.parse(localStorage.getItem("sirius-price-research-categories") || "[]");
      if (data.length > 0) {
        const cheapest = data.reduce((p: any, c: any) => Number(c.price) < Number(p.price) ? c : p);
        let itemName = "Item";
        cats.forEach((c: any) => { const sub = c.subcategories?.find((s: any) => s.id === cheapest.subcategoryId); if (sub) itemName = sub.name; });
        setStats({ count: data.length, minPrice: Number(cheapest.price), minPriceItem: itemName, lastStore: data[0].store || "Loja", lastDate: data[0].date ? formatDate(data[0].date) : "-" });
      }
    } catch {}
  }, []);
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 mt-6 shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2"><Search size={18} className="text-purple-400"/> Rastreamento de Preços</h2>
        <button onClick={() => navigate("/analise-produtos")} className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors font-bold uppercase tracking-wider">Ver Painel <ChevronRight size={14} /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => navigate("/analise-produtos")} className="cursor-pointer bg-slate-950 border border-slate-800 p-4 rounded-xl hover:border-purple-500/50 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20"><ShoppingCart size={40} className="text-purple-500"/></div>
          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Itens Rastreados</p><p className="text-2xl font-bold text-slate-100">{stats.count}</p>
        </div>
        <div onClick={() => navigate("/analise-produtos")} className="cursor-pointer bg-slate-950 border border-slate-800 p-4 rounded-xl hover:border-emerald-500/50 transition-all relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20"><Tag size={40} className="text-emerald-500"/></div>
          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Menor Preço ({stats.minPriceItem})</p><p className="text-2xl font-bold text-emerald-400">{formatCurrency(stats.minPrice)}</p>
        </div>
        <div onClick={() => navigate("/analise-produtos")} className="cursor-pointer bg-slate-950 border border-slate-800 p-4 rounded-xl hover:border-blue-500/50 transition-all relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20"><Clock size={40} className="text-blue-500"/></div>
           <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Última Loja</p><span className="text-lg font-bold text-slate-100 truncate block">{stats.lastStore}</span>
        </div>
        <div onClick={() => navigate("/analise-produtos")} className="cursor-pointer bg-slate-900 border-2 border-dashed border-slate-700 p-4 rounded-xl flex items-center justify-center gap-3 hover:bg-slate-800 transition-all">
            <BarChart3 size={20} className="text-slate-400 group-hover:text-white"/><span className="font-bold text-xs text-slate-400 group-hover:text-white uppercase">Abrir Análise</span>
        </div>
      </div>
    </div>
  );
}

function calculateMonthlySummary(expenses: any[], incomes: any[], year: number) {
  const data = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, monthLabel: new Date(year, i, 1).toLocaleDateString("pt-BR", { month: "short" }).toUpperCase(), entradas: 0, saidas: 0, saldo: 0, percEntrada: 0, percSaida: 0 }));
  expenses.forEach((e) => { if (new Date(e.date).getFullYear() === year) data[new Date(e.date).getMonth()].saidas += Math.abs(e.amount); });
  incomes.forEach((i) => { if (new Date(i.date).getFullYear() === year) data[new Date(i.date).getMonth()].entradas += i.amount; });
  data.forEach((d) => { d.saldo = d.entradas - d.saidas; const total = d.entradas + d.saidas; if (total > 0) { d.percEntrada = Math.round((d.entradas / total) * 100); d.percSaida = Math.round((d.saidas / total) * 100); } });
  return data;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload; 
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-md">
        <p className="mb-2 font-bold text-slate-100 uppercase text-xs tracking-wider border-b border-slate-700 pb-1">{label}</p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4"><span className="text-slate-300">Entradas</span><span className="font-bold text-blue-400">{formatCurrency(data.entradas)} ({data.percEntrada}%)</span></div>
          <div className="flex justify-between gap-4"><span className="text-slate-300">Saídas</span><span className="font-bold text-red-400">{formatCurrency(data.saidas)} ({data.percSaida}%)</span></div>
          <div className="flex justify-between gap-4 pt-1 border-t border-slate-800 mt-1"><span className="text-slate-200">Saldo</span><span className="font-bold text-yellow-400">{formatCurrency(data.saldo)}</span></div>
        </div>
      </div>
    );
  }
  return null;
};

function InfoCard({ title, value, icon: Icon, type, onClick, isActive }: any) {
  const activeClasses = { saldo: "bg-blue-900/20 border-blue-500/50", entrada: "bg-emerald-900/20 border-emerald-500/50", saida: "bg-rose-900/20 border-rose-500/50" };
  const iconBg = { saldo: "bg-blue-950 text-blue-400", entrada: "bg-emerald-950 text-emerald-400", saida: "bg-rose-950 text-rose-400" };
  return (
    <div onClick={onClick} className={clsx("cursor-pointer rounded-xl border p-4 transition-all duration-200 hover:scale-[1.02]", isActive ? activeClasses[type] : "bg-slate-900 border-slate-800 hover:border-slate-700")}>
      <div className="flex items-center justify-between mb-2"><span className={clsx("text-sm font-medium", isActive ? "text-slate-200" : "text-slate-400")}>{title}</span><div className={clsx("p-1.5 rounded-lg", iconBg[type])}><Icon size={18} /></div></div>
      <div className={clsx("text-2xl font-bold tracking-tight", value >= 0 ? "text-slate-100" : "text-rose-400")}>{formatCurrency(value)}</div>
    </div>
  );
}

const renderActiveShape = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (<g><Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 8} startAngle={startAngle} endAngle={endAngle} fill={fill} stroke="#1e293b" strokeWidth={2} /><Sector cx={cx} cy={cy} startAngle={startAngle} endAngle={endAngle} innerRadius={outerRadius + 10} outerRadius={outerRadius + 12} fill={fill} /></g>);
};

const renderCustomizedLabel = (props: any) => {
  const { cx, cy, midAngle, outerRadius, fill, name, value, percent } = props;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 25; 
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const textAnchor = x > cx ? 'start' : 'end';
  return (
    <g>
      <path d={`M${cx + (outerRadius) * Math.cos(-midAngle * RADIAN)},${cy + (outerRadius) * Math.sin(-midAngle * RADIAN)}L${x},${y}`} stroke={fill} fill="none" strokeWidth={2} opacity={0.6} />
      <text x={x + (x > cx ? 5 : -5)} y={y} dy={-14} textAnchor={textAnchor} fill={fill} fontSize={12} fontWeight="800">{name}</text>
      <text x={x + (x > cx ? 5 : -5)} y={y} dy={4} textAnchor={textAnchor} fill="#ffffff" fontSize={11} fontWeight="700">{formatCurrency(value)}</text>
      <text x={x + (x > cx ? 5 : -5)} y={y} dy={20} textAnchor={textAnchor} fill={fill} fontSize={10} fontWeight="800">{`(${(percent * 100).toFixed(1)}%)`}</text>
    </g>
  );
};

export default function FinanceDashboard() {
  const { expenses, incomes, loading, loadIncomes, loadExpenses } = useFinance();
  const { categories, loading: loadingCategories } = useCategories();
  const navigate = useNavigate();
  const initialLoad = useRef(false);
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [viewMode, setViewMode] = useState<"geral" | "saidas" | "entradas">("geral");
  const [isReceiptModalOpen, setReceiptModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedType, setSelectedType] = useState<'expense' | 'income' | null>(null);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // --- AQUI ESTÁ A LÓGICA DE SELEÇÃO QUE VOCÊ QUERIA ---
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => { if (!initialLoad.current) { initialLoad.current = true; loadIncomes(); loadExpenses(); } }, []);

  const filteredExpenses = useMemo(() => expenses.filter(e => { const d = new Date(e.date); return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear; }), [expenses, selectedMonth, selectedYear]);
  const filteredIncomes = useMemo(() => incomes.filter(i => { const d = new Date(i.date); return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear; }), [incomes, selectedMonth, selectedYear]);
  const totalSaidas = filteredExpenses.reduce((acc, e) => acc + Math.abs(e.amount), 0);
  const totalEntradas = filteredIncomes.reduce((acc, i) => acc + i.amount, 0);
  const saldoMes = totalEntradas - totalSaidas;

  const categoryPalette = useMemo(() => {
    const palette = new Map<string, string>();
    const fallbacks = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316"];
    categories.forEach((c, idx) => palette.set(c.name, c.color || fallbacks[idx % fallbacks.length]));
    expenses.forEach((e, idx) => { if (!palette.has(e.category)) palette.set(e.category, fallbacks[idx % fallbacks.length]); });
    return palette;
  }, [categories, expenses]);

  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    filteredExpenses.forEach((e) => { const current = map.get(e.category) ?? 0; map.set(e.category, current + Math.abs(e.amount)); });
    const result: any[] = [];
    map.forEach((total, name) => { if (total > 0) result.push({ id: name, name, total, percent: totalSaidas ? (total/totalSaidas) : 0, color: categoryPalette.get(name) ?? "#cbd5e1" }); });
    return result.sort((a, b) => b.total - a.total);
  }, [filteredExpenses, categoryPalette, totalSaidas]);

  const monthlyEvolution = useMemo(() => calculateMonthlySummary(expenses, incomes, selectedYear), [expenses, incomes, selectedYear]);
  
  // Define a lista que será mostrada
  const currentList = useMemo(() => {
    if (viewMode === "entradas") return filteredIncomes;
    if (viewMode === "saidas") return filteredExpenses;
    let list = [...filteredExpenses];
    if (selectedCategory) list = list.filter(e => e.category === selectedCategory);
    return list.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  }, [viewMode, filteredIncomes, filteredExpenses, selectedCategory]);

  const handlePrevMonth = () => { const d = new Date(selectedYear, selectedMonth - 1, 1); setSelectedMonth(d.getMonth()); setSelectedYear(d.getFullYear()); setSelectedCategory(null); setSelectedIds([]); };
  const handleNextMonth = () => { const d = new Date(selectedYear, selectedMonth + 1, 1); setSelectedMonth(d.getMonth()); setSelectedYear(d.getFullYear()); setSelectedCategory(null); setSelectedIds([]); };
  const currentMonthLabel = new Date(selectedYear, selectedMonth, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const openItem = (item: any, type: 'expense' | 'income') => { setSelectedItem(item); setSelectedType(type); };
  
  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    if (confirm("Tem certeza que deseja excluir?")) {
        if (selectedType === 'expense') { await supabase.from('expenses').delete().eq('id', selectedItem.id); loadExpenses(); } else { await supabase.from('incomes').delete().eq('id', selectedItem.id); loadIncomes(); }
        setSelectedItem(null);
    }
  };
  const handleEditItem = () => { if (selectedItem) { navigate(selectedType === 'expense' ? `/saidas/editar/${selectedItem.id}` : `/entradas/editar/${selectedItem.id}`); setSelectedItem(null); } };

  // --- LÓGICA DE SELEÇÃO E EXCLUSÃO EM MASSA ---
  const toggleSelect = (id: string) => { setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };
  const toggleSelectAll = () => { if (selectedIds.length === currentList.length) setSelectedIds([]); else setSelectedIds(currentList.map(i => i.id)); };
  
  const handleBulkDelete = async () => {
    if (confirm(`Deseja excluir ${selectedIds.length} itens selecionados?`)) {
      const table = viewMode === "entradas" ? "incomes" : "expenses";
      for (const id of selectedIds) { 
          await supabase.from(table).delete().eq('id', id); 
      }
      if (viewMode === "entradas") loadIncomes(); else loadExpenses();
      setSelectedIds([]);
    }
  };

  if (loading || loadingCategories) return <div className="p-10 text-center text-slate-400">Carregando dados...</div>;

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6 pb-24">
      {/* HEADER */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">Dashboard</h1><p className="text-sm text-slate-400">Visão geral do mês</p></div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button onClick={handlePrevMonth} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors">{"<"}</button>
            <span className="min-w-[120px] text-center text-sm font-semibold capitalize text-slate-200">{currentMonthLabel}</span>
            <button onClick={handleNextMonth} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors">{">"}</button>
          </div>
          <button onClick={() => setReceiptModalOpen(true)} className="flex-1 sm:flex-none rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-500 transition-colors">Importar Cupom</button>
        </div>
      </div>

      {/* CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <InfoCard title="Saldo" value={saldoMes} icon={Wallet2} type="saldo" isActive={viewMode === "geral"} onClick={() => { setViewMode("geral"); setSelectedIds([]); }} />
        <InfoCard title="Entradas" value={totalEntradas} icon={ArrowUpRight} type="entrada" isActive={viewMode === "entradas"} onClick={() => { setViewMode("entradas"); setSelectedIds([]); }} />
        <InfoCard title="Saídas" value={totalSaidas} icon={ArrowDownRight} type="saida" isActive={viewMode === "saidas"} onClick={() => { setViewMode("saidas"); setSelectedIds([]); }} />
      </div>

      {/* VISÃO GERAL (GRÁFICOS + LISTA PARCIAL) */}
      {viewMode === "geral" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2"><TrendingUp size={18} className="text-blue-400"/> Evolução Anual</h2>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyEvolution} margin={{ top: 20, right: 10, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="#1e293b" vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="monthLabel" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis hide />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#ffffff05' }} />
                  <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} formatter={(value) => <span className="text-slate-400 text-xs font-bold uppercase ml-1 mr-3">{value}</span>}/>
                  <Bar dataKey="entradas" name="Entradas" fill={SOLID_BLUE} radius={[4, 4, 0, 0]} maxBarSize={40}>
                    <LabelList dataKey="entradas" position="top" formatter={(val: number) => val > 0 ? `${(val/1000).toFixed(1)}k` : ''} style={{ fill: '#60a5fa', fontSize: '10px', fontWeight: 700 }} />
                    <LabelList dataKey="percEntrada" position="insideBottom" formatter={(val: number) => val > 0 ? `${val}%` : ''} style={{ fill: '#ffffff', fontSize: '10px', fontWeight: 600, opacity: 0.8 }} />
                  </Bar>
                  <Bar dataKey="saidas" name="Saídas" fill={SOLID_RED} radius={[4, 4, 0, 0]} maxBarSize={40}>
                     <LabelList dataKey="saidas" position="top" formatter={(val: number) => val > 0 ? `${(val/1000).toFixed(1)}k` : ''} style={{ fill: '#f87171', fontSize: '10px', fontWeight: 700 }} />
                     <LabelList dataKey="percSaida" position="insideBottom" formatter={(val: number) => val > 0 ? `${val}%` : ''} style={{ fill: '#ffffff', fontSize: '10px', fontWeight: 600, opacity: 0.8 }} />
                  </Bar>
                  <Line type="monotone" dataKey="saldo" name="Saldo" stroke={COLOR_SALDO} strokeWidth={3} dot={{ r: 4, fill: '#0f172a', stroke: COLOR_SALDO, strokeWidth: 2 }} activeDot={{ r: 6, fill: COLOR_SALDO }}>
                      <LabelList dataKey="saldo" position="top" offset={15} formatter={(val: any) => Math.abs(val) >= 1000 ? `${(val/1000).toFixed(1)}k` : val} style={{ fill: COLOR_SALDO, fontSize: '11px', fontWeight: '800', textShadow: '0px 1px 2px rgba(0,0,0,0.8)' }} />
                  </Line>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold text-slate-100">{selectedCategory ? `Filtrado: ${selectedCategory}` : "Por Categoria"}</h2>{selectedCategory ? (<button onClick={() => setSelectedCategory(null)} className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 border border-rose-900 bg-rose-950/30 px-2 py-1 rounded"><X size={12}/> Limpar</button>) : (<span className="text-xs text-slate-500">Clique na fatia</span>)}</div>
              <div className="w-full h-[340px] relative flex items-center justify-center -ml-2">
                  {categoryStats.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                        <Pie activeIndex={selectedCategory ? categoryStats.findIndex(c => c.name === selectedCategory) : activeIndex} activeShape={renderActiveShape} data={categoryStats} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={105} innerRadius={65} dataKey="total" paddingAngle={3} onMouseEnter={(_, index) => setActiveIndex(index)} onClick={(data) => setSelectedCategory(selectedCategory === data.name ? null : data.name)} className="cursor-pointer focus:outline-none">
                            {categoryStats.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} cornerRadius={4} stroke="none" style={{ outline: 'none' }} opacity={selectedCategory && selectedCategory !== entry.name ? 0.3 : 1}/>))}
                        </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                  ) : (<div className="flex flex-col items-center justify-center text-slate-500"><p>Sem gastos</p></div>)}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-6 flex flex-col h-[400px] lg:h-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-100">{selectedCategory ? `Gastos em ${selectedCategory}` : "Maiores Gastos"}</h2>
                <div className="flex items-center gap-2">
                  {selectedIds.length > 0 && (
                    <button onClick={handleBulkDelete} className="text-xs flex items-center gap-1 bg-rose-600 text-white px-2 py-1 rounded font-bold hover:bg-rose-500">
                      <Trash2 size={12}/> Excluir ({selectedIds.length})
                    </button>
                  )}
                  <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded-md">{currentList.length} itens</span>
                </div>
              </div>
              <div className="flex-1 overflow-hidden relative rounded-lg border border-slate-800/50 bg-slate-950/30 transition-all">
                {currentList.length > 0 ? (
                    <div className="absolute inset-0 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
                    <table className="w-full text-left">
                        <thead className="sticky top-0 bg-slate-950 text-xs text-slate-500 font-semibold uppercase z-10">
                          <tr>
                            {/* CAIXA DE SELEÇÃO GERAL */}
                            <th className="px-3 py-2 w-8"><button onClick={toggleSelectAll} className="flex items-center text-slate-400 hover:text-white">{selectedIds.length > 0 && selectedIds.length === currentList.length ? <CheckSquare size={16}/> : <Square size={16}/>}</button></th>
                            <th className="px-3 py-2">Data</th>
                            <th className="px-3 py-2">Descrição</th>
                            <th className="px-3 py-2 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {currentList.map((expense) => (
                            <tr key={expense.id} className={clsx("hover:bg-slate-900/80 transition-colors text-xs sm:text-sm cursor-pointer", selectedIds.includes(expense.id) && "bg-blue-900/20")}>
                                {/* CAIXA DE SELEÇÃO INDIVIDUAL */}
                                <td className="px-3 py-2.5 w-8" onClick={(e) => { e.stopPropagation(); toggleSelect(expense.id); }}>
                                  <div className={clsx("cursor-pointer", selectedIds.includes(expense.id) ? "text-blue-400" : "text-slate-600")}>
                                    {selectedIds.includes(expense.id) ? <CheckSquare size={16}/> : <Square size={16}/>}
                                  </div>
                                </td>
                                <td className="px-3 py-2.5 text-slate-400 font-mono text-[10px] sm:text-xs" onClick={() => openItem(expense, 'expense')}>{formatDate(expense.date).substring(0, 5)}</td>
                                <td className="px-3 py-2.5 text-slate-200" onClick={() => openItem(expense, 'expense')}><div className="font-medium truncate max-w-[120px]">{expense.description}</div><div className="text-[10px] text-slate-500 truncate">{expense.category}</div></td>
                                <td className="px-3 py-2.5 text-right font-bold text-rose-400" onClick={() => openItem(expense, 'expense')}>{formatCurrency(Math.abs(expense.amount))}</td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                ) : (<div className="flex h-full flex-col items-center justify-center text-slate-500 gap-2"><Filter size={24} className="opacity-50"/><p className="text-xs">Nenhum gasto.</p>{selectedCategory && (<button onClick={() => setSelectedCategory(null)} className="text-xs text-sky-400 hover:underline">Ver todos</button>)}</div>)}
              </div>
            </div>
          </div>
          <PriceSummaryWidget />
        </div>
      )}

      {/* VISÃO DETALHADA (LISTAS COMPLETAS) */}
      {(viewMode === "entradas" || viewMode === "saidas") && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-100">{viewMode === "entradas" ? "Todas as Entradas" : "Todas as Saídas"}</h2>
            <div className="flex gap-3">
              {selectedIds.length > 0 && (
                <button onClick={handleBulkDelete} className="text-xs flex items-center gap-1 bg-rose-600 text-white px-3 py-1 rounded font-bold hover:bg-rose-500 shadow-lg shadow-rose-900/20">
                  <Trash2 size={14}/> Excluir Selecionados ({selectedIds.length})
                </button>
              )}
              <button onClick={() => setViewMode("geral")} className="text-sm text-sky-400 hover:text-sky-300">Voltar</button>
            </div>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-800 bg-slate-950/30">
             <table className="w-full text-sm text-left">
                <thead className="bg-slate-900 text-slate-400 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 w-10"><button onClick={toggleSelectAll} className="flex items-center text-slate-400 hover:text-white">{selectedIds.length > 0 && selectedIds.length === currentList.length ? <CheckSquare size={18}/> : <Square size={18}/>}</button></th>
                    <th className="px-4 py-3 font-semibold">Data</th>
                    <th className="px-4 py-3 font-semibold">Descrição</th>
                    {viewMode === "saidas" && <th className="px-4 py-3 font-semibold">Categoria</th>}
                    <th className="px-4 py-3 font-semibold text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                   {currentList.map((item: any) => (
                      <tr key={item.id} className={clsx("hover:bg-slate-800/50 transition-colors cursor-pointer", selectedIds.includes(item.id) && "bg-blue-900/10")}>
                         <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}>
                            <div className={clsx("cursor-pointer", selectedIds.includes(item.id) ? "text-blue-400" : "text-slate-600")}>
                              {selectedIds.includes(item.id) ? <CheckSquare size={18}/> : <Square size={18}/>}
                            </div>
                         </td>
                         <td className="px-4 py-3 text-slate-400 font-mono text-xs" onClick={() => openItem(item, viewMode === 'saidas' ? 'expense' : 'income')}>{formatDate(item.date)}</td>
                         <td className="px-4 py-3 font-medium text-slate-200" onClick={() => openItem(item, viewMode === 'saidas' ? 'expense' : 'income')}>{item.description}{item.source && <span className="ml-2 text-[10px] text-slate-500 border border-slate-800 px-1 rounded">{item.source}</span>}</td>
                         {viewMode === "saidas" && <td className="px-4 py-3 text-xs text-slate-400" onClick={() => openItem(item, 'expense')}>{item.category}</td>}
                         <td className={clsx("px-4 py-3 text-right font-bold", viewMode === "entradas" ? "text-emerald-400" : "text-rose-400")} onClick={() => openItem(item, viewMode === 'saidas' ? 'expense' : 'income')}>{formatCurrency(Math.abs(item.amount))}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
        </div>
      )}

      <ReceiptImportModal isOpen={isReceiptModalOpen} onClose={() => setReceiptModalOpen(false)} />
      <TransactionModal item={selectedItem} type={selectedType || 'expense'} onClose={() => setSelectedItem(null)} onDelete={handleDeleteItem} onEdit={handleEditItem} />
    </div>
  );
}




