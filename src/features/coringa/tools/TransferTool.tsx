import { useState } from "react";
import { ArrowLeftRight, CheckCircle2, Loader2 } from "lucide-react";
import { useFinance } from "../../../contexts/FinanceContext";
import { formatCurrency } from "../../../utils/formatters";

export default function TransferTool() {
  const { addIncome, addExpense, bankAccounts = [] as any[] } = useFinance() as any;

  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const parseNumber = (val: string) => {
    let s = val.replace(/R\$\s?/gi, "").trim();
    const hasComma = s.includes(",");
    const hasDot = s.includes(".");
    if (hasComma && hasDot) s = s.replace(/\./g, "").replace(",", ".");
    else if (hasComma) s = s.replace(",", ".");
    const n = Number.parseFloat(s);
    return Number.isFinite(n) ? n : 0;
  };

  const handleSave = async () => {
    const value = parseNumber(amount);
    if (value <= 0) {
      setFeedback("Valor inválido");
      return;
    }
    setSaving(true);
    setFeedback(null);

    // Registra como saída na conta de origem e entrada na conta destino.
    await addExpense({
      date,
      description: `Transferência para ${to || "destino"}`,
      amount: -Math.abs(value),
      category: "Transferência",
      categoryId: "transferencia",
      paymentMethodId: null,
      observation: note,
      receiptStore: from || undefined,
      status: "paga",
      isFixed: false,
      isRecurring: false,
    });

    await addIncome({
      date,
      description: `Transferência de ${from || "origem"}`,
      amount: Math.abs(value),
      category: "Transferência recebida",
      source: to || "Conta destino",
    });

    setSaving(false);
    setFeedback("Transferência registrada!");
    setAmount("");
  };

  return (
    <div className="flex h-full flex-col gap-3 text-sm text-slate-100">
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold flex items-center gap-2">
          <ArrowLeftRight className="h-4 w-4 text-amber-400" />
          Transferência
        </p>
        {feedback && <span className="text-[11px] text-emerald-300">{feedback}</span>}
      </div>

      <input
        className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 focus:border-emerald-500 outline-none"
        placeholder="Valor (R$)"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
      />

      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-slate-400">De</span>
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 focus:border-emerald-500 outline-none"
          >
            <option value="">Selecione</option>
            {bankAccounts.map((b: any) => (
              <option key={b.id} value={b.name ?? b.bankName ?? b.id}>
                {b.name ?? b.bankName ?? b.id}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[11px] text-slate-400">Para</span>
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 focus:border-emerald-500 outline-none"
          >
            <option value="">Selecione</option>
            {bankAccounts.map((b: any) => (
              <option key={b.id} value={b.name ?? b.bankName ?? b.id}>
                {b.name ?? b.bankName ?? b.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-[11px] text-slate-400">Data</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 focus:border-emerald-500 outline-none"
        />
      </div>

      <textarea
        className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 focus:border-emerald-500 outline-none h-20"
        placeholder="Observações"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 font-semibold text-slate-950 shadow-lg shadow-amber-900/30 hover:bg-amber-400 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 size={16} />}
        Registrar transferência
      </button>

      {amount && (
        <p className="text-[11px] text-slate-400">
          Prévia: {formatCurrency(parseNumber(amount))}
        </p>
      )}
    </div>
  );
}
