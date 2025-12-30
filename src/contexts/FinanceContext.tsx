import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  type Expense,
  type ExpenseStatus,
  type Income,
  type Receipt,
  type ReceiptItem,
  type BankAccount,
  type BankBalance,
  type PaymentMethod,
  type PaymentMethodType,
  type TrackedPriceSample,
  type TrackedVariantKey,
  type TrackedVariantMeta,
  TRACKED_VARIANTS_META,
  type TrackedPriceSummary,
} from "../types/finance";

interface FinanceContextValue {
  expenses: Expense[];
  incomes: Income[];
  receipts: Receipt[];
  bankAccounts: BankAccount[];
  bankBalances: BankBalance[];
  paymentMethods: PaymentMethod[];
  loading: boolean;

  addExpense: (data: Omit<Expense, "id" | "createdAt">) => void;
  deleteExpense: (id: string) => void;
  updateExpense: (
    id: string,
    data: Partial<Omit<Expense, "id" | "createdAt">>
  ) => void;
  updateExpenseStatus: (id: string, status: ExpenseStatus) => void;

  addReceipt: (receipt: Receipt) => void;
  createExpensesFromReceipt: (options: {
    receipt: Receipt;
    mode: "aggregate" | "perItem";
    defaultCategoryId?: string;
    categoryNameById?: Record<string, string>;
  }) => void;

  addBankAccount: (
    data: Omit<BankAccount, "id" | "createdAt">
  ) => BankAccount;
  updateBankAccount: (
    id: string,
    data: Partial<Omit<BankAccount, "id" | "createdAt">>
  ) => void;
  deleteBankAccount: (id: string) => { success: boolean; reason?: string };
  deleteBankAndBalances: (id: string) => void;
  upsertBankBalance: (
    data: Omit<BankBalance, "id" | "createdAt" | "updatedAt">
  ) => void;
  getBankBalancesByYear: (year: number, bankIds?: string[]) => BankBalance[];
  getAvailableBalanceYears: () => number[];
  deleteMonthBalances: (options: {
    year: number;
    month: number;
    bankId?: string;
  }) => void;

  addIncome: (data: Omit<Income, "id" | "createdAt">) => void;
  deleteIncome: (id: string) => void;
  updateIncome: (
    id: string,
    data: Partial<Omit<Income, "id" | "createdAt">>
  ) => void;

  addPaymentMethod: (data: {
    name: string;
    type: PaymentMethodType;
    color?: string;
    description?: string;
  }) => PaymentMethod;
  updatePaymentMethod: (
    id: string,
    data: Partial<Omit<PaymentMethod, "id" | "createdAt">>
  ) => void;
  archivePaymentMethod: (id: string) => void;
  restorePaymentMethod: (id: string) => void;
  deletePaymentMethod: (id: string) => { success: boolean; reason?: string };
  getActivePaymentMethods: () => PaymentMethod[];
  getPaymentMethodById: (
    id: string | null | undefined
  ) => PaymentMethod | undefined;
  getMonthlyExpensesByPaymentMethod: (
    month: number,
    year: number
  ) => { paymentMethodId: string; total: number; count: number }[];

  // --- Pesquisa de preços ---
  priceSamples: TrackedPriceSample[];
  trackedVariantsMeta: TrackedVariantMeta[];
  addPriceSample: (data: {
    variantKey: string;
    value: number;
    date: string;
    source?: string;
    customMeta?: {
      familyKey: string;
      familyLabel: string;
      variantLabel: string;
      unit: string;
    };
  }) => void;
  getVariantPriceHistory: (variantKey: TrackedVariantKey) => TrackedPriceSample[];
  getVariantMonthlyAverages: (
    variantKey: TrackedVariantKey
  ) => { monthLabel: string; avgPrice: number }[];
  getVariantCurrentAndPrevious: (
    variantKey: TrackedVariantKey
  ) => TrackedPriceSummary;
}

const FinanceContext = createContext<FinanceContextValue | undefined>(
  undefined
);

const EXPENSES_KEY = "sirius_expenses_v1";
const INCOMES_KEY = "sirius_incomes_v1";
const RECEIPTS_KEY = "sirius_receipts_v1";
const BANKS_KEY = "sirius_bank_accounts_v1";
const BALANCES_KEY = "sirius_bank_balances_v1";
const PAYMENT_METHODS_KEY = "sirius_payment_methods_v1";
const PRICE_SAMPLES_KEY = "sirius_price_samples_v1";

const defaultPaymentMethods: PaymentMethod[] = [
  {
    id: "pm-dinheiro",
    name: "Dinheiro",
    type: "dinheiro",
    color: "#facc15",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "pm-pix",
    name: "Pix",
    type: "pix",
    color: "#22c55e",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "pm-credito",
    name: "Cartão de Crédito",
    type: "credito",
    color: "#6366f1",
    active: true,
    createdAt: new Date().toISOString(),
  },
];

export function FinanceProvider({ children }: { children: ReactNode }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankBalances, setBankBalances] = useState<BankBalance[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [priceSamples, setPriceSamples] = useState<TrackedPriceSample[]>([]);
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------------------------------------
  // Carrega tudo do localStorage na primeira vez (e normaliza paymentMethodId)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    try {
      const rawExpenses = localStorage.getItem(EXPENSES_KEY);
      if (rawExpenses) {
        const parsed = JSON.parse(rawExpenses) as Expense[];
        // compatibilidade: despesas antigas podem não ter paymentMethodId
        const normalized = parsed.map((e) => ({
          ...e,
          paymentMethodId: e.paymentMethodId ?? null,
        }));
        setExpenses(normalized);
      }
    } catch (err) {
      console.error("Erro ao carregar gastos do localStorage", err);
    }

    try {
      const rawIncomes = localStorage.getItem(INCOMES_KEY);
      if (rawIncomes) {
        const parsed = JSON.parse(rawIncomes) as Income[];
        setIncomes(parsed);
      }
    } catch (err) {
      console.error("Erro ao carregar entradas do localStorage", err);
    }

    try {
      const rawReceipts = localStorage.getItem(RECEIPTS_KEY);
      if (rawReceipts) {
        const parsed = JSON.parse(rawReceipts) as Receipt[];
        setReceipts(parsed);
      }
    } catch (err) {
      console.error("Erro ao carregar cupons do localStorage", err);
    }

    try {
      const rawBanks = localStorage.getItem(BANKS_KEY);
      if (rawBanks) {
        const parsed = JSON.parse(rawBanks) as BankAccount[];
        setBankAccounts(parsed);
      }
    } catch (err) {
      console.error("Erro ao carregar bancos do localStorage", err);
    }

    try {
      const rawBalances = localStorage.getItem(BALANCES_KEY);
      if (rawBalances) {
        const parsed = JSON.parse(rawBalances) as BankBalance[];
        setBankBalances(parsed);
      }
    } catch (err) {
      console.error("Erro ao carregar saldos bancários do localStorage", err);
    }

    try {
      const rawPrices = localStorage.getItem(PRICE_SAMPLES_KEY);
      if (rawPrices) {
        const parsed = JSON.parse(rawPrices) as TrackedPriceSample[];
        setPriceSamples(parsed);
      }
    } catch (err) {
      console.error("Erro ao carregar pesquisa de preços do localStorage", err);
    }

    // Carregar formas de pagamento
    try {
      const rawPM = localStorage.getItem(PAYMENT_METHODS_KEY);
      if (rawPM) {
        setPaymentMethods(JSON.parse(rawPM));
      } else {
        setPaymentMethods(defaultPaymentMethods);
      }
    } catch (err) {
      console.error("Erro ao carregar formas de pagamento", err);
      setPaymentMethods(defaultPaymentMethods);
    }

    setLoading(false);
  }, []);

  // ---------------------------------------------------------------------------
  // Persistência no localStorage
  // ---------------------------------------------------------------------------

  // Salva despesas
  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
    } catch (err) {
      console.error("Erro ao salvar gastos no localStorage", err);
    }
  }, [expenses, loading]);

  // Salva entradas
  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(INCOMES_KEY, JSON.stringify(incomes));
    } catch (err) {
      console.error("Erro ao salvar entradas no localStorage", err);
    }
  }, [incomes, loading]);

  // Salva cupons
  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
    } catch (err) {
      console.error("Erro ao salvar cupons no localStorage", err);
    }
  }, [receipts, loading]);

  // Salva bancos
  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(BANKS_KEY, JSON.stringify(bankAccounts));
    } catch (err) {
      console.error("Erro ao salvar bancos no localStorage", err);
    }
  }, [bankAccounts, loading]);

  // Salva saldos
  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(BALANCES_KEY, JSON.stringify(bankBalances));
    } catch (err) {
      console.error("Erro ao salvar saldos bancários no localStorage", err);
    }
  }, [bankBalances, loading]);

  // Salva formas de pagamento
  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(PAYMENT_METHODS_KEY, JSON.stringify(paymentMethods));
    } catch (err) {
      console.error("Erro ao salvar formas de pagamento", err);
    }
  }, [paymentMethods, loading]);

  // Salva pesquisa de preços
  useEffect(() => {
    if (loading) return;
    try {
      localStorage.setItem(PRICE_SAMPLES_KEY, JSON.stringify(priceSamples));
    } catch (err) {
      console.error("Erro ao salvar pesquisa de preços no localStorage", err);
    }
  }, [priceSamples, loading]);

  // ---------------------------------------------------------------------------
  // Despesas
  // ---------------------------------------------------------------------------

  const addExpense = (data: Omit<Expense, "id" | "createdAt">) => {
    const newExpense: Expense = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => [...prev, newExpense]);
  };

  const deleteExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const updateExpense = (
    id: string,
    data: Partial<Omit<Expense, "id" | "createdAt">>
  ) => {
    setExpenses((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, ...data } : exp))
    );
  };

  const updateExpenseStatus = (id: string, status: ExpenseStatus) => {
    setExpenses((prev) =>
      prev.map((expense) =>
        expense.id === id ? { ...expense, status } : expense
      )
    );
  };

  // ---------------------------------------------------------------------------
  // Cupons / recibos
  // ---------------------------------------------------------------------------

  const addReceipt = (receipt: Receipt) => {
    setReceipts((prev) => {
      const exists = prev.find((r) => r.id === receipt.id);
      if (exists) {
        return prev.map((r) => (r.id === receipt.id ? receipt : r));
      }
      return [...prev, receipt];
    });
  };

  const resolveCategoryName = (
    categoryId?: string,
    categoryNameById?: Record<string, string>,
    fallback?: string
  ) => {
    if (categoryId && categoryNameById?.[categoryId])
      return categoryNameById[categoryId];
    if (fallback) return fallback;
    if (categoryId) return categoryId;
    return "Outros";
  };

  const createExpensesFromReceipt = (options: {
    receipt: Receipt;
    mode: "aggregate" | "perItem";
    defaultCategoryId?: string;
    categoryNameById?: Record<string, string>;
  }) => {
    const { receipt, mode, defaultCategoryId, categoryNameById } = options;
    addReceipt(receipt);

    const receiptTotal = Number.isFinite(receipt.total)
      ? receipt.total
      : Number(
          receipt.items.reduce((acc, item) => acc + item.total, 0).toFixed(2)
        );

    const defaultCategoryName = resolveCategoryName(
      defaultCategoryId,
      categoryNameById,
      "Outros"
    );

    if (mode === "aggregate") {
      addExpense({
        description: `Compra em ${receipt.storeName || "loja"}`,
        amount: receiptTotal,
        date: receipt.date,
        dueDate: receipt.date,
        category: defaultCategoryName,
        categoryId: defaultCategoryId,
        paymentMethodId: null,
        isFixed: false,
        isRecurring: false,
        recurrenceDay: undefined,
        status: "paga",
        receiptId: receipt.id,
        isReceipt: true,
        receiptStore: receipt.storeName,
        receiptItems: receipt.items,
      });
      return;
    }

    receipt.items.forEach((item: ReceiptItem) => {
      const categoryName = resolveCategoryName(
        item.suggestedCategoryId ?? defaultCategoryId,
        categoryNameById,
        defaultCategoryName
      );
      addExpense({
        description: item.description,
        amount: item.total,
        date: receipt.date,
        dueDate: receipt.date,
        category: categoryName,
        categoryId: item.suggestedCategoryId ?? defaultCategoryId,
        paymentMethodId: null,
        isFixed: false,
        isRecurring: false,
        recurrenceDay: undefined,
        status: "paga",
        receiptId: receipt.id,
      });
    });
  };

  // ---------------------------------------------------------------------------
  // Entradas
  // ---------------------------------------------------------------------------

  const addIncome = (data: Omit<Income, "id" | "createdAt">) => {
    const newIncome: Income = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setIncomes((prev) => [...prev, newIncome]);
  };

  const deleteIncome = (id: string) => {
    setIncomes((prev) => prev.filter((inc) => inc.id !== id));
  };

  const updateIncome = (
    id: string,
    data: Partial<Omit<Income, "id" | "createdAt">>
  ) => {
    setIncomes((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, ...data } : inc))
    );
  };

  // ---------------------------------------------------------------------------
  // Bancos / contas e saldos
  // ---------------------------------------------------------------------------

  const addBankAccount = (data: Omit<BankAccount, "id" | "createdAt">) => {
    const account: BankAccount = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setBankAccounts((prev) => [...prev, account]);
    return account;
  };

  const updateBankAccount = (
    id: string,
    data: Partial<Omit<BankAccount, "id" | "createdAt">>
  ) => {
    setBankAccounts((prev) =>
      prev.map((acc) => (acc.id === id ? { ...acc, ...data } : acc))
    );
  };

  const deleteBankAccount = (id: string) => {
    const hasBalances = bankBalances.some((b) => b.bankId === id);
    if (hasBalances) {
      return {
        success: false,
        reason: "Existem saldos vinculados a este banco.",
      };
    }
    setBankAccounts((prev) => prev.filter((acc) => acc.id !== id));
    return { success: true };
  };

  const upsertBankBalance = (
    data: Omit<BankBalance, "id" | "createdAt" | "updatedAt">
  ) => {
    setBankBalances((prev) => {
      const idx = prev.findIndex(
        (b) =>
          b.bankId === data.bankId &&
          b.year === data.year &&
          b.month === data.month
      );
      if (idx >= 0) {
        const updated: BankBalance = {
          ...prev[idx],
          balance: data.balance,
          updatedAt: new Date().toISOString(),
        };
        const clone = [...prev];
        clone[idx] = updated;
        return clone;
      }
      const created: BankBalance = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return [...prev, created];
    });
  };

  const getBankBalancesByYear = (year: number, bankIds?: string[]) => {
    return bankBalances.filter(
      (b) => b.year === year && (!bankIds?.length || bankIds.includes(b.bankId))
    );
  };

  const deleteBankAndBalances = (id: string) => {
    setBankBalances((prev) => prev.filter((b) => b.bankId !== id));
    setBankAccounts((prev) => prev.filter((acc) => acc.id !== id));
  };

  const deleteMonthBalances = (options: {
    year: number;
    month: number;
    bankId?: string;
  }) => {
    const { year, month, bankId } = options;
    setBankBalances((prev) =>
      prev.filter((b) => {
        if (b.year !== year || b.month !== month) return true;
        if (bankId) {
          return b.bankId !== bankId;
        }
        return false;
      })
    );
  };

  const getAvailableBalanceYears = () => {
    const years = Array.from(
      new Set(bankBalances.map((b) => b.year))
    ).sort((a, b) => a - b);
    return years;
  };

  // ---------------------------------------------------------------------------
  // Formas de pagamento
  // ---------------------------------------------------------------------------

  const addPaymentMethod = (data: {
    name: string;
    type: PaymentMethodType;
    color?: string;
    description?: string;
  }) => {
    const newMethod: PaymentMethod = {
      id: crypto.randomUUID(),
      name: data.name,
      type: data.type,
      color: data.color,
      description: data.description,
      active: true,
      createdAt: new Date().toISOString(),
    };
    setPaymentMethods((prev) => [...prev, newMethod]);
    return newMethod;
  };

  const updatePaymentMethod = (
    id: string,
    data: Partial<Omit<PaymentMethod, "id" | "createdAt">>
  ) => {
    setPaymentMethods((prev) =>
      prev.map((pm) =>
        pm.id === id
          ? { ...pm, ...data, updatedAt: new Date().toISOString() }
          : pm
      )
    );
  };

  const archivePaymentMethod = (id: string) => {
    updatePaymentMethod(id, { active: false });
  };

  const restorePaymentMethod = (id: string) => {
    updatePaymentMethod(id, { active: true });
  };

  const deletePaymentMethod = (id: string) => {
    const isUsed = expenses.some((e) => e.paymentMethodId === id);
    if (isUsed) {
      return {
        success: false,
        reason:
          "Esta forma de pagamento está em uso em saídas cadastradas. Arquive-a em vez de excluir.",
      };
    }
    setPaymentMethods((prev) => prev.filter((pm) => pm.id !== id));
    return { success: true };
  };

  const getActivePaymentMethods = () => {
    return paymentMethods.filter((pm) => pm.active);
  };

  const getPaymentMethodById = (id: string | null | undefined) => {
    if (!id) return undefined;
    return paymentMethods.find((pm) => pm.id === id);
  };

  const getMonthlyExpensesByPaymentMethod = (month: number, year: number) => {
    const monthlyExpenses = expenses.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() + 1 === month && d.getFullYear() === year;
    });

    const grouped: Record<string, { total: number; count: number }> = {};

    monthlyExpenses.forEach((e) => {
      const pmId = e.paymentMethodId || "unknown";
      if (!grouped[pmId]) {
        grouped[pmId] = { total: 0, count: 0 };
      }
      grouped[pmId].total += e.amount;
      grouped[pmId].count += 1;
    });

    return Object.entries(grouped).map(([pmId, val]) => ({
      paymentMethodId: pmId,
      total: val.total,
      count: val.count,
    }));
  };

  // ---------------------------------------------------------------------------
  // Pesquisa de preços
  // ---------------------------------------------------------------------------

  const trackedVariantsMeta = Object.values(TRACKED_VARIANTS_META);

  const addPriceSample = (data: {
    variantKey: string;
    value: number;
    date: string;
    source?: string;
    customMeta?: {
      familyKey: string;
      familyLabel: string;
      variantLabel: string;
      unit: string;
    };
  }) => {
    // Tenta encontrar meta existente ou usa o customMeta fornecido
    const meta = TRACKED_VARIANTS_META[data.variantKey as TrackedVariantKey] || data.customMeta;
    
    if (!meta) return; // Se não tiver meta nenhum, aborta

    const sample: TrackedPriceSample = {
      id: crypto.randomUUID(),
      familyKey: meta.familyKey as any,
      variantKey: data.variantKey as any,
      familyLabel: meta.familyLabel,
      variantLabel: meta.variantLabel,
      unit: meta.unit,
      referenceQuantity: meta.referenceQuantity,
      value: data.value,
      date: data.date,
      source: data.source,
      createdAt: new Date().toISOString(),
    };

    setPriceSamples((prev) => [...prev, sample]);
  };

  const getVariantPriceHistory = (
    variantKey: TrackedVariantKey
  ): TrackedPriceSample[] => {
    return priceSamples
      .filter((s) => s.variantKey === variantKey)
      .sort((a, b) => a.date.localeCompare(b.date));
  };

  const getVariantMonthlyAverages = (
    variantKey: TrackedVariantKey
  ): { monthLabel: string; avgPrice: number }[] => {
    const history = getVariantPriceHistory(variantKey);

    const byMonth = new Map<string, { total: number; count: number }>();

    history.forEach((s) => {
      if (!s.date) return;
      const key = s.date.slice(0, 7); // YYYY-MM
      const current = byMonth.get(key) ?? { total: 0, count: 0 };
      current.total += s.value;
      current.count += 1;
      byMonth.set(key, current);
    });

    const result: { monthLabel: string; avgPrice: number }[] = [];

    Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, agg]) => {
        const [year, month] = key.split("-");
        const date = new Date(Number(year), Number(month) - 1, 1);
        const monthLabel = date.toLocaleDateString("pt-BR", {
          month: "short",
          year: "numeric",
        });
        result.push({
          monthLabel,
          avgPrice: agg.total / agg.count,
        });
      });

    return result;
  };

  const getVariantCurrentAndPrevious = (
    variantKey: TrackedVariantKey
  ): TrackedPriceSummary => {
    const history = getVariantPriceHistory(variantKey);
    if (history.length === 0) {
      return {
        lastPrice: null,
        lastDate: null,
        previousPrice: null,
        variationAbs: null,
        variationPercent: null,
      };
    }

    const last = history[history.length - 1];
    const previous = history.length > 1 ? history[history.length - 2] : null;

    if (!previous) {
      return {
        lastPrice: last.value,
        lastDate: last.date,
        previousPrice: null,
        variationAbs: null,
        variationPercent: null,
      };
    }

    const variationAbs = last.value - previous.value;
    const variationPercent =
      previous.value !== 0 ? (variationAbs / previous.value) * 100 : null;

    return {
      lastPrice: last.value,
      lastDate: last.date,
      previousPrice: previous.value,
      variationAbs,
      variationPercent,
    };
  };

  return (
    <FinanceContext.Provider
      value={{
        expenses,
        incomes,
        receipts,
        bankAccounts,
        bankBalances,
        paymentMethods,
        loading,
        addExpense,
        deleteExpense,
        updateExpense,
        updateExpenseStatus,
        addReceipt,
        createExpensesFromReceipt,
        addBankAccount,
        updateBankAccount,
        deleteBankAccount,
        deleteBankAndBalances,
        upsertBankBalance,
        getBankBalancesByYear,
        getAvailableBalanceYears,
        deleteMonthBalances,
        addIncome,
        deleteIncome,
        updateIncome,
        addPaymentMethod,
        updatePaymentMethod,
        archivePaymentMethod,
        restorePaymentMethod,
        deletePaymentMethod,
        getActivePaymentMethods,
        getPaymentMethodById,
        getMonthlyExpensesByPaymentMethod,
        priceSamples,
        trackedVariantsMeta,
        addPriceSample,
        getVariantPriceHistory,
        getVariantMonthlyAverages,
        getVariantCurrentAndPrevious,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) {
    throw new Error("useFinance deve ser usado dentro de <FinanceProvider>");
  }
  return ctx;
}

export type {
  Expense,
  ExpenseStatus,
  Income,
  Receipt,
  ReceiptItem,
  BankAccount,
  BankBalance,
  PaymentMethod,
  PaymentMethodType,
  TrackedPriceSample,
  TrackedPriceSummary,
  TrackedVariantKey,
  TrackedVariantMeta,
  SupplyCategory,
  SupplyVariant,
  SupplyVariantId,
  SupplyPriceSample,
} from "../types/finance";
