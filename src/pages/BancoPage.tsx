import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useFinance, type BankAccount, type BankBalance } from "../contexts/FinanceContext";
import { formatCurrency } from "../utils/formatters";

type Filters = {
  year: number;
  bankIds: string[];
};

type MonthRow = {
  mes: string;
  total: number;
  diffValor?: number;
  diffPercent?: number;
  perBank: Record<string, number>;
};

const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function BancoPage() {
  const {
    bankAccounts,
    bankBalances,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    deleteBankAndBalances,
    upsertBankBalance,
    deleteMonthBalances,
  } = useFinance();

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(bankBalances.map((b) => b.year))).sort((a, b) => a - b);
    if (!years.length) {
      const current = new Date().getFullYear();
      return [current];
    }
    return years;
  }, [bankBalances]);

  const defaultYear = availableYears.includes(new Date().getFullYear())
    ? new Date().getFullYear()
    : availableYears[0];

  const [filters, setFilters] = useState<Filters>({
    year: defaultYear,
    bankIds: [],
  });

  const [accountForm, setAccountForm] = useState<Partial<BankAccount>>({
    name: "",
    institution: "",
    color: "#22c55e",
  });
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [balanceForm, setBalanceForm] = useState<{ bankId?: string; year: number; month: number; balance: string }>(
    {
      bankId: bankAccounts[0]?.id,
      year: defaultYear,
      month: new Date().getMonth() + 1,
      balance: "",
    }
  );
  const [message, setMessage] = useState<string | null>(null);
  const [deleteBankModal, setDeleteBankModal] = useState<{ id: string; name: string } | null>(null);
  const [editMonthModal, setEditMonthModal] = useState<{ year: number; month: number } | null>(null);
  const [editMonthValues, setEditMonthValues] = useState<Record<string, string>>({});
  const [deleteMonthModal, setDeleteMonthModal] = useState<{ year: number; month: number } | null>(null);

  useEffect(() => {
    if (!availableYears.includes(filters.year)) {
      setFilters((prev) => ({ ...prev, year: availableYears[availableYears.length - 1] }));
    }
  }, [availableYears, filters.year]);

  const accountsFiltered = useMemo(
    () => (!filters.bankIds.length ? bankAccounts : bankAccounts.filter((b) => filters.bankIds.includes(b.id))),
    [bankAccounts, filters.bankIds]
  );

  useEffect(() => {
    if (!balanceForm.bankId && bankAccounts[0]) {
      setBalanceForm((prev) => ({ ...prev, bankId: bankAccounts[0].id }));
    }
  }, [bankAccounts, balanceForm.bankId]);

  const lastBalanceByBank = useMemo(() => {
    const map = new Map<string, BankBalance | undefined>();
    bankAccounts.forEach((acc) => {
      const balances = bankBalances
        .filter((b) => b.bankId === acc.id)
        .sort((a, b) => {
          if (a.year === b.year) return b.month - a.month;
          return b.year - a.year;
        });
      map.set(acc.id, balances[0]);
    });
    return map;
  }, [bankAccounts, bankBalances]);

  const monthlyRows: MonthRow[] = useMemo(() => {
    const rows: MonthRow[] = [];
    for (let m = 1; m <= 12; m++) {
      const key = `${filters.year}-${String(m).padStart(2, "0")}`;
      const perBank: Record<string, number> = {};
      accountsFiltered.forEach((acc) => {
        const bal = bankBalances.find((b) => b.bankId === acc.id && b.year === filters.year && b.month === m);
        perBank[acc.id] = bal?.balance ?? 0;
      });
      const total = Object.values(perBank).reduce((a, b) => a + b, 0);
      rows.push({ mes: key, total, perBank });
    }
    return rows.map((row, idx, arr) => {
      if (idx === 0) return row;
      const prev = arr[idx - 1];
      const diffValor = row.total - prev.total;
      const diffPercent = prev.total ? (diffValor / prev.total) * 100 : undefined;
      return { ...row, diffValor, diffPercent };
    });
  }, [accountsFiltered, bankBalances, filters.year]);

  const saldoInicial = useMemo(() => {
    const firstWithData = monthlyRows.find((m) => m.total !== 0);
    return firstWithData?.total ?? 0;
  }, [monthlyRows]);

  const saldoFinal = useMemo(() => {
    const reversed = [...monthlyRows].reverse();
    const first = reversed.find((m) => m.total !== 0);
    return first?.total ?? 0;
  }, [monthlyRows]);

  const monthsWithData = monthlyRows.filter((m) => m.total !== 0).length || monthlyRows.length;
  const variacaoAbsoluta = saldoFinal - saldoInicial;
  const variacaoPercentual = saldoInicial ? (variacaoAbsoluta / saldoInicial) * 100 : null;
  const aporteMedioMensal = monthsWithData ? variacaoAbsoluta / monthsWithData : 0;

  const chartData = monthlyRows.map((row) => {
    const monthIdx = Number(row.mes.slice(5, 7)) - 1;
    const label = `${monthLabels[monthIdx]}/${String(filters.year).slice(-2)}`;
    const bankValues = accountsFiltered.reduce(
      (acc, bank) => ({ ...acc, [bank.name]: row.perBank[bank.id] ?? 0 }),
      {} as Record<string, number>
    );
    return {
      mes: label,
      total: row.total,
      ...bankValues,
    };
  });

  const handleSaveAccount = () => {
    if (!accountForm.name?.trim()) {
      setMessage("Informe um nome para o banco.");
      return;
    }
    if (editingBankId) {
      updateBankAccount(editingBankId, {
        name: accountForm.name,
        institution: accountForm.institution,
        color: accountForm.color,
      });
      setMessage("Banco atualizado.");
    } else {
      addBankAccount({
        name: accountForm.name.trim(),
        institution: accountForm.institution?.trim(),
        color: accountForm.color,
      });
      setMessage("Banco adicionado.");
    }
    setAccountForm({ name: "", institution: "", color: "#22c55e" });
    setEditingBankId(null);
  };

  const handleDeleteAccount = (id: string) => {
    const hasBalances = bankBalances.some((b) => b.bankId === id);
    if (hasBalances) {
      const bank = bankAccounts.find((b) => b.id === id);
      if (bank) {
        setDeleteBankModal({ id, name: bank.name });
      }
      return;
    }
    const result = deleteBankAccount(id);
    if (!result.success) {
      setMessage(result.reason ?? "Não foi possível excluir o banco.");
      return;
    }
    setMessage("Banco excluído.");
  };

  const handleSaveBalance = () => {
    if (!balanceForm.bankId) {
      setMessage("Selecione um banco.");
      return;
    }
    const balanceNumber = Number(balanceForm.balance);
    if (!Number.isFinite(balanceNumber)) {
      setMessage("Informe um saldo válido.");
      return;
    }
    upsertBankBalance({
      bankId: balanceForm.bankId,
      year: balanceForm.year,
      month: balanceForm.month,
      balance: balanceNumber,
    });
    setMessage("Saldo salvo.");
  };

  const handleSelectRow = (monthIso: string) => {
    const month = Number(monthIso.slice(5, 7));
    const year = Number(monthIso.slice(0, 4));
    setBalanceForm((prev) => ({ ...prev, month, year }));
    const values: Record<string, string> = {};
    accountsFiltered.forEach((acc) => {
      const bal = bankBalances.find((b) => b.bankId === acc.id && b.year === year && b.month === month);
      values[acc.id] = bal ? String(bal.balance) : "";
    });
    setEditMonthValues(values);
    setEditMonthModal({ year, month });
  };

  const handleSaveMonthEdits = () => {
    if (!editMonthModal) return;
    const { year, month } = editMonthModal;
    accountsFiltered.forEach((acc) => {
      const raw = editMonthValues[acc.id] ?? "";
      if (raw === "") return;
      const num = Number(raw);
      if (Number.isFinite(num)) {
        upsertBankBalance({
          bankId: acc.id,
          year,
          month,
          balance: num,
        });
      }
    });
    setMessage("Saldo atualizado com sucesso.");
    setEditMonthModal(null);
  };

  const handleDeleteMonth = (year: number, month: number) => {
    if (filters.bankIds.length === 1) {
      deleteMonthBalances({ year, month, bankId: filters.bankIds[0] });
      setMessage("Saldo do mês excluído.");
    } else {
      setDeleteMonthModal({ year, month });
    }
  };

  const confirmDeleteMonthAll = () => {
    if (!deleteMonthModal) return;
    deleteMonthBalances({ year: deleteMonthModal.year, month: deleteMonthModal.month });
    setMessage("Saldos do mês excluídos.");
    setDeleteMonthModal(null);
  };

  const confirmDeleteBankAndBalances = () => {
    if (!deleteBankModal) return;
    deleteBankAndBalances(deleteBankModal.id);
    setMessage("Banco e saldos excluídos.");
    setDeleteBankModal(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Banco</h1>
          <p className="text-sm text-slate-400">Controle de contas e saldos mensais.</p>
        </div>
        {message && <p className="text-xs text-emerald-300">{message}</p>}
      </div>

      {/* Gestão de bancos */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Minhas contas/bancos</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {bankAccounts.map((bank) => {
            const last = lastBalanceByBank.get(bank.id);
            return (
              <div
                key={bank.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="h-3 w-3 rounded-full border border-slate-700"
                    style={{ background: bank.color || "#22c55e" }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-100">{bank.name}</p>
                    <p className="text-xs text-slate-500">{bank.institution || "Instituição não informada"}</p>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <p className="text-xs text-slate-500">Saldo mais recente</p>
                  <p className="font-semibold text-emerald-300">
                    {last ? formatCurrency(last.balance) : "-"}
                  </p>
                  <div className="flex gap-2 justify-end text-xs mt-1">
                    <button
                      className="text-sky-300 hover:text-sky-200"
                      onClick={() => {
                        setEditingBankId(bank.id);
                        setAccountForm({
                          name: bank.name,
                          institution: bank.institution,
                          color: bank.color,
                        });
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="text-rose-300 hover:text-rose-200"
                      onClick={() => handleDeleteAccount(bank.id)}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {!bankAccounts.length && (
            <p className="text-sm text-slate-400">Nenhum banco cadastrado ainda.</p>
          )}
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950 p-4 space-y-3">
          <h3 className="text-sm font-semibold">{editingBankId ? "Editar banco" : "Adicionar banco"}</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Nome</label>
              <input
                className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                value={accountForm.name ?? ""}
                onChange={(e) => setAccountForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Ex: Nubank, Caixa Poupança"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Instituição</label>
              <input
                className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
                value={accountForm.institution ?? ""}
                onChange={(e) => setAccountForm((prev) => ({ ...prev, institution: e.target.value }))}
                placeholder="Opcional"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400">Cor</label>
              <input
                type="color"
                className="h-10 w-full rounded-md border border-slate-800 bg-slate-950"
                value={accountForm.color || "#22c55e"}
                onChange={(e) => setAccountForm((prev) => ({ ...prev, color: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            {editingBankId && (
              <button
                className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-emerald-500"
                onClick={() => {
                  setEditingBankId(null);
                  setAccountForm({ name: "", institution: "", color: "#22c55e" });
                }}
              >
                Cancelar
              </button>
            )}
            <button
              className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-500"
              onClick={handleSaveAccount}
            >
              {editingBankId ? "Salvar alterações" : "Adicionar banco"}
            </button>
          </div>
        </div>
      </div>

      {/* Filtros e resumo */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <h2 className="text-lg font-semibold">Filtros e visão anual</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <label className="text-sm text-slate-300">Ano</label>
            <select
              className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              value={filters.year}
              onChange={(e) => setFilters((prev) => ({ ...prev, year: Number(e.target.value) }))}
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm text-slate-300">Bancos</label>
            <div className="flex flex-wrap gap-2">
              {bankAccounts.map((bank) => {
                const checked = filters.bankIds.includes(bank.id);
                return (
                  <label
                    key={bank.id}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                      checked ? "border-emerald-500 bg-emerald-500/10" : "border-slate-800 bg-slate-950"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-emerald-500"
                      checked={checked}
                      onChange={() =>
                        setFilters((prev) => ({
                          ...prev,
                          bankIds: checked
                            ? prev.bankIds.filter((id) => id !== bank.id)
                            : [...prev.bankIds, bank.id],
                        }))
                      }
                    />
                    <span className="text-slate-100">{bank.name}</span>
                  </label>
                );
              })}
              {!bankAccounts.length && <p className="text-sm text-slate-500">Cadastre um banco primeiro.</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid gap-3 md:grid-cols-4">
        <MetricCard title="Saldo inicial do ano" value={formatCurrency(saldoInicial)} subtitle="Primeiro mês com dado" />
        <MetricCard title="Saldo atual" value={formatCurrency(saldoFinal)} subtitle="Último mês com dado" />
        <MetricCard
          title="Variação no ano"
          value={`${formatCurrency(variacaoAbsoluta)}${variacaoPercentual !== null ? ` (${variacaoPercentual.toFixed(1)}%)` : ""}`}
          subtitle={variacaoAbsoluta >= 0 ? "Crescimento" : "Redução"}
        />
        <MetricCard
          title="Aporte médio mensal"
          value={formatCurrency(aporteMedioMensal)}
          subtitle={`${monthsWithData} meses considerados`}
        />
      </div>

      {/* Gráfico */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Evolução mensal</h2>
          <span className="text-xs text-slate-500">Total e por banco</span>
        </div>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
              <XAxis dataKey="mes" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip
                formatter={(value, name) => [formatCurrency(Number(value)), name]}
                contentStyle={{ background: "#0f172a", border: "1px solid #1e293b" }}
              />
              <Legend />
              <Line type="monotone" dataKey="total" name="Total" stroke="#22c55e" strokeWidth={2} dot={false} />
              {accountsFiltered.map((bank) => (
                <Line
                  key={bank.id}
                  type="monotone"
                  dataKey={bank.name}
                  name={bank.name}
                  stroke={bank.color || "#0ea5e9"}
                  strokeWidth={2}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-lg font-semibold">Mês a mês</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-800 text-slate-400">
              <tr>
                <th className="py-2 text-left">Mês</th>
                <th className="py-2 text-left">Saldo total</th>
                <th className="py-2 text-left">Dif. R$</th>
                <th className="py-2 text-left">Dif. %</th>
                <th className="py-2 text-left">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
      {monthlyRows.map((row) => {
        const label = `${monthLabels[Number(row.mes.slice(5, 7)) - 1]}/${row.mes.slice(0, 4)}`;
        return (
          <tr key={row.mes} className="hover:bg-slate-800/60">
            <td className="py-2">{label}</td>
            <td className="py-2">{formatCurrency(row.total)}</td>
            <td className="py-2">
              {row.diffValor === undefined ? "-" : formatCurrency(row.diffValor)}
            </td>
            <td className="py-2">
              {row.diffPercent === undefined
                ? "-"
                : `${row.diffPercent >= 0 ? "+" : ""}${row.diffPercent.toFixed(1)}%`}
            </td>
            <td className="py-2">
              <div className="flex gap-2">
                <button
                  className="text-xs rounded border border-slate-700 px-2 py-1 text-slate-200 hover:border-emerald-500"
                  onClick={() => handleSelectRow(row.mes)}
                >
                  Editar
                </button>
                <button
                  className="text-xs rounded border border-rose-600 px-2 py-1 text-rose-300 hover:bg-rose-600/10"
                  onClick={() => {
                    const year = Number(row.mes.slice(0, 4));
                    const month = Number(row.mes.slice(5, 7));
                    handleDeleteMonth(year, month);
                  }}
                >
                  Excluir
                </button>
              </div>
            </td>
          </tr>
        );
      })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form de saldo */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
        <h2 className="text-lg font-semibold">Lançar / atualizar saldo</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm text-slate-300">Banco</label>
            <select
              className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              value={balanceForm.bankId ?? ""}
              onChange={(e) => setBalanceForm((prev) => ({ ...prev, bankId: e.target.value || undefined }))}
            >
              <option value="">Selecione</option>
              {bankAccounts.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-300">Ano</label>
            <input
              type="number"
              className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              value={balanceForm.year}
              onChange={(e) => setBalanceForm((prev) => ({ ...prev, year: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-slate-300">Mês</label>
            <select
              className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              value={balanceForm.month}
              onChange={(e) => setBalanceForm((prev) => ({ ...prev, month: Number(e.target.value) }))}
            >
              {monthLabels.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 md:col-span-2">
            <label className="text-sm text-slate-300">Saldo (R$)</label>
            <input
              type="number"
              className="w-full rounded-md bg-slate-950 border border-slate-800 px-3 py-2 text-sm"
              value={balanceForm.balance}
              onChange={(e) => setBalanceForm((prev) => ({ ...prev, balance: e.target.value }))}
              placeholder="0,00"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-500"
            onClick={handleSaveBalance}
          >
            Salvar saldo
          </button>
        </div>
      </div>

      {/* Modal excluir banco e saldos */}
      {deleteBankModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-5 space-y-4">
            <h3 className="text-lg font-semibold text-slate-100">Excluir banco</h3>
            <p className="text-sm text-slate-300">
              Este banco possui saldos mensais cadastrados. O que você deseja fazer?
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-emerald-500"
                onClick={() => setDeleteBankModal(null)}
              >
                Cancelar
              </button>
              <button
                className="rounded-md border border-rose-600 bg-rose-600 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-rose-500"
                onClick={confirmDeleteBankAndBalances}
              >
                Excluir banco e saldos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar mês */}
      {editMonthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-2xl rounded-lg border border-slate-800 bg-slate-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-100">
                Editar saldo do mês {monthLabels[editMonthModal.month - 1]}/{editMonthModal.year}
              </h3>
              <button
                className="text-sm text-slate-400 hover:text-slate-200"
                onClick={() => setEditMonthModal(null)}
              >
                Fechar
              </button>
            </div>
            <div className="overflow-x-auto rounded border border-slate-800">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-3 py-2 text-left">Banco</th>
                    <th className="px-3 py-2 text-left">Saldo atual</th>
                    <th className="px-3 py-2 text-left">Novo saldo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                  {accountsFiltered.map((acc) => {
                    const current = bankBalances.find(
                      (b) =>
                        b.bankId === acc.id &&
                        b.year === editMonthModal.year &&
                        b.month === editMonthModal.month
                    );
                    return (
                      <tr key={acc.id}>
                        <td className="px-3 py-2 text-slate-100">{acc.name}</td>
                        <td className="px-3 py-2 text-slate-200">
                          {current ? formatCurrency(current.balance) : "-"}
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            className="w-full rounded-md bg-slate-950 border border-slate-800 px-2 py-1 text-sm text-slate-100"
                            value={editMonthValues[acc.id] ?? ""}
                            onChange={(e) =>
                              setEditMonthValues((prev) => ({ ...prev, [acc.id]: e.target.value }))
                            }
                            placeholder="0,00"
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {!accountsFiltered.length && (
                    <tr>
                      <td colSpan={3} className="px-3 py-2 text-center text-slate-400">
                        Nenhum banco selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-3">
              <button
                className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-emerald-500"
                onClick={() => setEditMonthModal(null)}
              >
                Cancelar
              </button>
              <button
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-500"
                onClick={handleSaveMonthEdits}
              >
                Salvar alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal excluir mês (todos os bancos) */}
      {deleteMonthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900 p-5 space-y-4">
            <h3 className="text-lg font-semibold text-slate-100">Excluir saldos do mês</h3>
            <p className="text-sm text-slate-300">
              Você está na visão de todos os bancos. Deseja apagar todos os saldos deste mês de todas as contas?
            </p>
            <div className="flex justify-end gap-3">
              <button
                className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-emerald-500"
                onClick={() => setDeleteMonthModal(null)}
              >
                Cancelar
              </button>
              <button
                className="rounded-md border border-rose-600 bg-rose-600 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-rose-500"
                onClick={confirmDeleteMonthAll}
              >
                Apagar saldos do mês
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, subtitle }: { title: string; value: string; subtitle: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-3">
      <p className="text-xs text-slate-400">{title}</p>
      <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
      <p className="text-xs text-slate-500">{subtitle}</p>
    </div>
  );
}
