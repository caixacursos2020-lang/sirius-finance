import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../supabaseClient";

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
  type SupabaseExpenseRow,
  type SupabaseReceiptRow,
  type SupabaseReceiptItemRow,
  type SupplyCategory,
  type SupplyVariant,
  type SupplyVariantId,
  type SupplyPriceSample,
} from "../types/finance";

/** ====== PRICE RESEARCH (Supabase) ====== */
export type PriceResearchCategory = {
  id: string;
  name: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PriceResearchItem = {
  id: string;
  categoryId: string;
  name: string;
  unit?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PriceResearchEntry = {
  id: string;
  categoryId: string | null;
  itemId: string | null;
  price: number;
  date: string;
  store?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

interface FinanceContextValue {
  expenses: Expense[];
  incomes: Income[];
  receipts: Receipt[];
  bankAccounts: BankAccount[];
  bankBalances: BankBalance[];
  paymentMethods: PaymentMethod[];
  loading: boolean;

  loadIncomes: () => Promise<{ error?: string }>;
  loadExpenses: () => Promise<{ error?: string }>;
  loadPaymentMethods: () => void;

  addExpense: (
    data: Omit<Expense, "id" | "createdAt" | "user_id">
  ) => Promise<{ error?: string }>;
  deleteExpense: (
    id: string
  ) => Promise<{ error?: string; success?: boolean }>;
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
    paymentMethodId?: string | null;
  }) => Promise<{ error?: string }>;

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

  addIncome: (
    data: Omit<Income, "id" | "createdAt" | "user_id">
  ) => Promise<{ error?: string }>;
  deleteIncome: (
    id: string
  ) => Promise<{ error?: string; success?: boolean }>;
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

  // Pesquisa de preços (local - seu sistema TRACKED_VARIANTS_META)
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
  getVariantPriceHistory: (
    variantKey: TrackedVariantKey
  ) => TrackedPriceSample[];
  getVariantMonthlyAverages: (
    variantKey: TrackedVariantKey
  ) => { monthLabel: string; avgPrice: number }[];
  getVariantCurrentAndPrevious: (
    variantKey: TrackedVariantKey
  ) => TrackedPriceSummary;

  /** ====== PRICE RESEARCH (Supabase) ====== */
  priceResearchCategories: PriceResearchCategory[];
  priceResearchItems: PriceResearchItem[];
  priceResearchEntries: PriceResearchEntry[];
  loadPriceResearch: () => Promise<{ error?: string }>;
  addPriceResearchCategory: (name: string) => Promise<{ error?: string }>;
  addPriceResearchItem: (data: {
    categoryId: string;
    name: string;
    unit?: string;
  }) => Promise<{ error?: string }>;
  addPriceResearchEntry: (data: {
    categoryId: string | null;
    itemId: string | null;
    price: number;
    date: string;
    store?: string;
  }) => Promise<{ error?: string }>;
  deletePriceResearchEntry: (id: string) => Promise<{ error?: string }>;
}

const FinanceContext = createContext<FinanceContextValue | undefined>(undefined);

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
    id: "pm-debito",
    name: "Cartão de débito",
    type: "debito",
    color: "#0ea5e9",
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

const isValidUuid = (value: unknown): value is string => {
  return (
    typeof value === "string" &&
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      value
    )
  );
};

export function FinanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [bankBalances, setBankBalances] = useState<BankBalance[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [priceSamples, setPriceSamples] = useState<TrackedPriceSample[]>([]);

  /** ====== PRICE RESEARCH (Supabase) ====== */
  const [priceResearchCategories, setPriceResearchCategories] = useState<
    PriceResearchCategory[]
  >([]);
  const [priceResearchItems, setPriceResearchItems] = useState<
    PriceResearchItem[]
  >([]);
  const [priceResearchEntries, setPriceResearchEntries] = useState<
    PriceResearchEntry[]
  >([]);

  const [loading, setLoading] = useState(true);

  const loadPaymentMethods = useCallback(() => {
    try {
      const rawPM = localStorage.getItem(PAYMENT_METHODS_KEY);
      if (rawPM) {
        const parsed = JSON.parse(rawPM);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPaymentMethods(parsed);
        } else {
          setPaymentMethods(defaultPaymentMethods);
        }
      } else {
        setPaymentMethods(defaultPaymentMethods);
      }
    } catch (err) {
      console.error("Erro ao carregar formas de pagamento", err);
      setPaymentMethods(defaultPaymentMethods);
    }
  }, []);

  useEffect(() => {
    try {
      const rawReceipts = localStorage.getItem(RECEIPTS_KEY);
      if (rawReceipts) setReceipts(JSON.parse(rawReceipts));
    } catch (err) {
      console.error("Erro ao carregar cupons do localStorage", err);
    }

    try {
      const rawBanks = localStorage.getItem(BANKS_KEY);
      if (rawBanks) setBankAccounts(JSON.parse(rawBanks));
    } catch (err) {
      console.error("Erro ao carregar bancos do localStorage", err);
    }

    try {
      const rawBalances = localStorage.getItem(BALANCES_KEY);
      if (rawBalances) setBankBalances(JSON.parse(rawBalances));
    } catch (err) {
      console.error("Erro ao carregar saldos bancários do localStorage", err);
    }

    try {
      const rawPrices = localStorage.getItem(PRICE_SAMPLES_KEY);
      if (rawPrices) setPriceSamples(JSON.parse(rawPrices));
    } catch (err) {
      console.error("Erro ao carregar pesquisa de preços do localStorage", err);
    }

    loadPaymentMethods();
  }, [loadPaymentMethods]);

  useEffect(() => {
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify(receipts));
  }, [receipts]);

  useEffect(() => {
    localStorage.setItem(BANKS_KEY, JSON.stringify(bankAccounts));
  }, [bankAccounts]);

  useEffect(() => {
    localStorage.setItem(BALANCES_KEY, JSON.stringify(bankBalances));
  }, [bankBalances]);

  useEffect(() => {
    localStorage.setItem(PAYMENT_METHODS_KEY, JSON.stringify(paymentMethods));
  }, [paymentMethods]);

  useEffect(() => {
    localStorage.setItem(PRICE_SAMPLES_KEY, JSON.stringify(priceSamples));
  }, [priceSamples]);

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      setLoading(true);

      if (!user) {
        setExpenses([]);
        setIncomes([]);
        setReceipts([]);
        setBankAccounts([]);
        setBankBalances([]);
        setPriceSamples([]);

        setPriceResearchCategories([]);
        setPriceResearchItems([]);
        setPriceResearchEntries([]);

        setLoading(false);
        return;
      }

      await Promise.all([
        loadIncomes(),
        loadExpenses(),
        loadReceiptsFromSupabase(),
        loadPriceResearch(),
      ]);

      if (active) setLoading(false);
    };

    fetchData();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const loadIncomes = async (): Promise<{ error?: string }> => {
    if (!user) return { error: "Usuário não autenticado" };

    const { data, error } = await supabase
      .from("incomes")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) {
      console.error("Erro ao carregar incomes", error);
      return { error: "Falha ao carregar entradas" };
    }

    setIncomes(
      (data ?? []).map((item: any) => ({
        id: item.id,
        date: item.date ?? "",
        description: item.description ?? "",
        amount: Number(item.amount ?? 0),
        source: item.category ?? "Outras",
        createdAt: item.created_at ?? new Date().toISOString(),
      }))
    );

    return {};
  };

  const loadExpenses = async (): Promise<{ error?: string }> => {
    if (!user) return { error: "Usuário não autenticado" };

    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (error) {
      console.error("Erro ao carregar expenses", error);
      return { error: "Falha ao carregar saídas" };
    }

    const rows = (data ?? []) as SupabaseExpenseRow[];

    setExpenses(
      rows.map((item) => ({
        id: item.id,
        date: item.date ?? "",
        description: item.description ?? "",
        amount: Number(item.amount ?? 0),
        category: item.category ?? "Outros",
        categoryId: undefined,
        paymentMethodId: item.payment_method ?? null,
        isFixed: item.is_fixed ?? false,
        isRecurring: item.is_recurring ?? false,
        dueDate: undefined,
        recurrenceDay: item.recurrence_day ?? undefined,
        status: (item.status as ExpenseStatus) ?? "paga",
        observation: item.observation ?? undefined,
        fuelLiters: item.fuel_liters ?? undefined,
        fuelPricePerLiter: item.fuel_price_per_liter ?? undefined,
        fuelStation: item.fuel_station ?? undefined,
        fuelType: item.fuel_type ?? undefined,
        createdAt: item.created_at ?? new Date().toISOString(),
        receiptId: (item as any).receipt_id ?? undefined,
        isReceipt: (item as any).is_receipt ?? undefined,
        receiptStore: item.receipt_store ?? undefined,
        receiptItems: undefined,
      }))
    );

    return {};
  };

  const loadReceiptsFromSupabase = async (): Promise<{ error?: string }> => {
    if (!user) return { error: "Usuário não autenticado" };

    const { data: receiptRows, error: receiptsError } = await supabase
      .from("receipts")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false });

    if (receiptsError) {
      console.error("Erro ao carregar cupons", receiptsError);
      return { error: "Falha ao carregar cupons" };
    }

    let itemRows: SupabaseReceiptItemRow[] = [];

    if (receiptRows && receiptRows.length > 0) {
      const { data, error: itemsError } = await supabase
        .from("receipt_items")
        .select("*")
        .in(
          "receipt_id",
          (receiptRows as SupabaseReceiptRow[]).map((r) => r.id)
        );

      if (itemsError) {
        console.error("Erro ao carregar itens dos cupons", itemsError);
        return { error: "Falha ao carregar itens de cupons" };
      }

      itemRows = (data ?? []) as SupabaseReceiptItemRow[];
    }

    const itemsByReceipt = new Map<string, SupabaseReceiptItemRow[]>();
    itemRows.forEach((item) => {
      const list = itemsByReceipt.get(item.receipt_id) ?? [];
      list.push(item);
      itemsByReceipt.set(item.receipt_id, list);
    });

    const mappedReceipts: Receipt[] = (receiptRows ?? []).map((row: any) => {
      const items = (itemsByReceipt.get(row.id) ?? []).map((it) => {
        const quantityRaw = Number(it.quantity ?? 1);
        const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1;
        const total = Number(it.total ?? 0);
        const unitPrice =
          it.unit_price !== null && it.unit_price !== undefined
            ? Number(it.unit_price)
            : quantity > 0
              ? total / quantity
              : total;

        return {
          id: it.id,
          description: it.description ?? "",
          quantity,
          unitPrice: Number.isFinite(unitPrice) ? unitPrice : total,
          total,
          suggestedCategoryId: it.suggested_category_id ?? undefined,
          suggestedCategoryName: it.suggested_category_name ?? undefined,
        };
      });

      return {
        id: row.id,
        storeName: row.store_name ?? undefined,
        date: row.date ?? "",
        total: Number(row.total ?? 0),
        itemsTotal: Number(row.items_total ?? 0),
        rawTotalFromReceipt: row.raw_total_from_receipt ?? undefined,
        rawText: row.raw_text ?? undefined,
        items,
        warnings: [],
      };
    });

    setReceipts(mappedReceipts);
    return {};
  };

  /** ====== PRICE RESEARCH (Supabase) ====== */
  const loadPriceResearch = async (): Promise<{ error?: string }> => {
    if (!user) return { error: "Usuário não autenticado" };

    try {
      const [catsRes, itemsRes, entriesRes] = await Promise.all([
        supabase
          .from("price_research_categories")
          .select("*")
          .eq("user_id", user.id)
          .order("name", { ascending: true }),
        supabase
          .from("price_research_items")
          .select("*")
          .eq("user_id", user.id)
          .order("name", { ascending: true }),
        supabase
          .from("price_research_entries")
          .select("*")
          .eq("user_id", user.id)
          .order("date", { ascending: false }),
      ]);

      if (catsRes.error) throw catsRes.error;
      if (itemsRes.error) throw itemsRes.error;
      if (entriesRes.error) throw entriesRes.error;

      setPriceResearchCategories(
        (catsRes.data ?? []).map((c: any) => ({
          id: c.id,
          name: c.name ?? "",
          createdAt: c.created_at ?? undefined,
          updatedAt: c.updated_at ?? undefined,
        }))
      );

      setPriceResearchItems(
        (itemsRes.data ?? []).map((it: any) => ({
          id: it.id,
          categoryId: it.category_id ?? "",
          name: it.name ?? "",
          unit: it.unit ?? null,
          createdAt: it.created_at ?? undefined,
          updatedAt: it.updated_at ?? undefined,
        }))
      );

      setPriceResearchEntries(
        (entriesRes.data ?? []).map((e: any) => ({
          id: e.id,
          categoryId: e.category_id ?? null,
          itemId: e.item_id ?? null,
          price: Number(e.price ?? 0),
          date: e.date ?? "",
          store: e.store ?? null,
          createdAt: e.created_at ?? undefined,
          updatedAt: e.updated_at ?? undefined,
        }))
      );

      return {};
    } catch (err: any) {
      console.error("Erro loadPriceResearch:", err);
      return { error: err?.message ?? "Falha ao carregar pesquisa de preços" };
    }
  };

  const addPriceResearchCategory = async (
    name: string
  ): Promise<{ error?: string }> => {
    if (!user) return { error: "Usuário não autenticado" };
    const trimmed = (name ?? "").trim();
    if (!trimmed) return { error: "Nome da categoria vazio" };

    const { data, error } = await supabase
      .from("price_research_categories")
      .insert({ user_id: user.id, name: trimmed })
      .select("*")
      .single();

    if (error) {
      console.error("Erro ao inserir categoria:", error);
      return { error: error.message };
    }

    const row: PriceResearchCategory = {
      id: data.id,
      name: data.name ?? trimmed,
      createdAt: data.created_at ?? undefined,
      updatedAt: data.updated_at ?? undefined,
    };

    setPriceResearchCategories((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
    return {};
  };

  const addPriceResearchItem = async (data: {
    categoryId: string;
    name: string;
    unit?: string;
  }): Promise<{ error?: string }> => {
    if (!user) return { error: "Usuário não autenticado" };
    const trimmed = (data.name ?? "").trim();
    if (!trimmed) return { error: "Nome do item vazio" };
    if (!data.categoryId) return { error: "Categoria inválida" };

    const { data: inserted, error } = await supabase
      .from("price_research_items")
      .insert({
        user_id: user.id,
        category_id: data.categoryId,
        name: trimmed,
        unit: data.unit ?? null,
      })
      .select("*")
      .single();

    if (error) {
      console.error("Erro ao inserir item:", error);
      return { error: error.message };
    }

    const row: PriceResearchItem = {
      id: inserted.id,
      categoryId: inserted.category_id ?? data.categoryId,
      name: inserted.name ?? trimmed,
      unit: inserted.unit ?? null,
      createdAt: inserted.created_at ?? undefined,
      updatedAt: inserted.updated_at ?? undefined,
    };

    setPriceResearchItems((prev) => [...prev, row].sort((a, b) => a.name.localeCompare(b.name)));
    return {};
  };

  const addPriceResearchEntry = async (data: {
    categoryId: string | null;
    itemId: string | null;
    price: number;
    date: string;
    store?: string;
  }): Promise<{ error?: string }> => {
    if (!user) return { error: "Usuário não autenticado" };
    if (!data.date) return { error: "Data inválida" };
    if (!data.itemId) return { error: "Item inválido" };
    if (!Number.isFinite(data.price) || data.price <= 0)
      return { error: "Preço inválido" };

    const payload = {
      user_id: user.id,
      category_id: data.categoryId,
      item_id: data.itemId,
      price: data.price,
      date: data.date,
      store: data.store?.trim() || null,
    };

    const { data: inserted, error } = await supabase
      .from("price_research_entries")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("Erro ao inserir entry:", error);
      return { error: error.message };
    }

    const row: PriceResearchEntry = {
      id: inserted.id,
      categoryId: inserted.category_id ?? data.categoryId,
      itemId: inserted.item_id ?? data.itemId,
      price: Number(inserted.price ?? data.price),
      date: inserted.date ?? data.date,
      store: inserted.store ?? payload.store,
      createdAt: inserted.created_at ?? undefined,
      updatedAt: inserted.updated_at ?? undefined,
    };

    setPriceResearchEntries((prev) => [row, ...prev]);
    return {};
  };

  const deletePriceResearchEntry = async (
    id: string
  ): Promise<{ error?: string }> => {
    if (!user) return { error: "Usuário não autenticado" };
    if (!id) return { error: "ID inválido" };

    const { error } = await supabase
      .from("price_research_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Erro ao deletar entry:", error);
      return { error: error.message };
    }

    setPriceResearchEntries((prev) => prev.filter((e) => e.id !== id));
    return {};
  };

  const addIncome = async (
    data: Omit<Income, "id" | "createdAt" | "user_id">
  ) => {
    if (!user) return { error: "Usuário não autenticado" };

    const insertPayload = {
      date: data.date,
      description: data.description,
      amount: data.amount,
      category: data.source,
      payment_method: null,
      user_id: user.id,
    };

    const { data: inserted, error } = await supabase
      .from("incomes")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      console.error("Erro ao inserir income", error);
      return { error: "Falha ao salvar entrada" };
    }

    setIncomes((prev) => [
      ...prev,
      {
        id: inserted.id,
        date: inserted.date ?? data.date,
        description: inserted.description ?? data.description,
        amount: Number(inserted.amount ?? data.amount),
        source: inserted.category ?? data.source,
        createdAt: inserted.created_at ?? new Date().toISOString(),
      },
    ]);

    return {};
  };

  const addExpense = async (
    data: Omit<Expense, "id" | "createdAt" | "user_id">
  ) => {
    if (!user) return { error: "Usuário não autenticado" };

    const insertPayload = {
      date: data.date,
      description: data.description,
      amount: data.amount,
      category: data.category,
      payment_method: data.paymentMethodId ?? null,
      user_id: user.id,
      status: data.status ?? "paga",
      is_fixed: data.isFixed ?? false,
      is_recurring: data.isRecurring ?? false,
      recurrence_day: data.recurrenceDay ?? null,
      observation: data.observation ?? null,
      receipt_store: data.receiptStore ?? null,
      fuel_liters: data.fuelLiters ?? null,
      fuel_price_per_liter: data.fuelPricePerLiter ?? null,
      fuel_station: data.fuelStation ?? null,
      fuel_type: data.fuelType ?? null,
    };

    const { data: insertedRow, error } = await supabase
      .from("expenses")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      console.error("Erro ao inserir expense", error);
      return { error: "Falha ao salvar saída" };
    }

    const inserted = insertedRow as SupabaseExpenseRow;

    const newExpense: Expense = {
      id: inserted.id,
      date: inserted.date ?? data.date,
      description: inserted.description ?? data.description,
      amount: Number(inserted.amount ?? data.amount),
      category: inserted.category ?? data.category,
      categoryId: data.categoryId,
      paymentMethodId:
        inserted.payment_method ?? data.paymentMethodId ?? null,
      isFixed: inserted.is_fixed ?? data.isFixed ?? false,
      isRecurring: inserted.is_recurring ?? data.isRecurring ?? false,
      dueDate: data.dueDate,
      recurrenceDay:
        inserted.recurrence_day ?? data.recurrenceDay ?? undefined,
      status:
        (inserted.status as ExpenseStatus) ?? data.status ?? "paga",
      observation: inserted.observation ?? data.observation,
      fuelLiters: inserted.fuel_liters ?? data.fuelLiters,
      fuelPricePerLiter:
        inserted.fuel_price_per_liter ?? data.fuelPricePerLiter,
      fuelStation: inserted.fuel_station ?? data.fuelStation,
      fuelType: inserted.fuel_type ?? data.fuelType,
      createdAt: inserted.created_at ?? new Date().toISOString(),
      receiptId: data.receiptId,
      isReceipt: data.isReceipt,
      receiptStore: inserted.receipt_store ?? data.receiptStore,
      receiptItems: data.receiptItems,
    };

    setExpenses((prev) => [...prev, newExpense]);

    return {};
  };

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

  const createExpensesFromReceipt = async (options: {
    receipt: Receipt;
    mode: "aggregate" | "perItem";
    defaultCategoryId?: string;
    categoryNameById?: Record<string, string>;
    paymentMethodId?: string | null;
  }): Promise<{ error?: string }> => {
    const {
      receipt,
      mode,
      defaultCategoryId,
      categoryNameById,
      paymentMethodId,
    } = options;

    if (!user) {
      console.error(
        "createExpensesFromReceipt: usuário não autenticado, não foi possível criar saídas."
      );
      return { error: "Usuário não autenticado" };
    }

    const receiptId = isValidUuid((receipt as any).id)
      ? (receipt as any).id
      : crypto.randomUUID();

    const normalizedReceipt: Receipt = {
      ...receipt,
      id: receiptId,
    };

    addReceipt(normalizedReceipt);

    const safeDate =
      normalizedReceipt.date || new Date().toISOString().slice(0, 10);

    const itemsTotal = normalizedReceipt.items.reduce(
      (acc, item) => acc + Number(item.total || 0),
      0
    );

    const receiptTotal =
      typeof normalizedReceipt.total === "number"
        ? normalizedReceipt.total
        : normalizedReceipt.total
        ? Number(String(normalizedReceipt.total).replace(",", "."))
        : itemsTotal;

    try {
      const receiptPayload = {
        id: receiptId,
        user_id: user.id,
        store_name: normalizedReceipt.storeName ?? null,
        date: safeDate,
        total: receiptTotal,
        items_total: itemsTotal,
        raw_total_from_receipt: normalizedReceipt.rawTotalFromReceipt ?? null,
        raw_text: normalizedReceipt.rawText ?? null,
      };

      const { error: receiptError } = await supabase
        .from("receipts")
        .upsert(receiptPayload);

      if (receiptError) {
        console.error("Erro ao salvar receipt no Supabase:", receiptError);
        return { error: "Erro ao salvar o cupom (cabeçalho)." };
      }

      // evita duplicar itens quando salvar o mesmo cupom novamente
      await supabase.from("receipt_items").delete().eq("receipt_id", receiptId);

      if (normalizedReceipt.items && normalizedReceipt.items.length > 0) {
        const itemsPayload = normalizedReceipt.items.map((item) => ({
          receipt_id: receiptId,
          description: item.description,
          quantity: item.quantity ?? null,
          unit_price: item.unitPrice ?? null,
          total: item.total,
          suggested_category_id: item.suggestedCategoryId ?? null,
          suggested_category_name: item.suggestedCategoryName ?? null,
        }));

        const { error: itemsError } = await supabase
          .from("receipt_items")
          .insert(itemsPayload);

        if (itemsError) {
          console.error(
            "Erro ao salvar itens do cupom no Supabase:",
            itemsError
          );
        }
      }

      const defaultCategoryName = resolveCategoryName(
        defaultCategoryId,
        categoryNameById,
        "Outros"
      );

      const baseRow: Partial<SupabaseExpenseRow> = {
        user_id: user.id,
        date: safeDate,
        status: "paga",
        is_fixed: false,
        is_recurring: false,
        recurrence_day: null,
        observation: null,
        receipt_store: normalizedReceipt.storeName ?? null,
        // Marca que esta despesa veio de um cupom (no modo agregado).
        // Obs: o schema atual do Supabase não possui `receipt_id` na tabela `expenses` (PGRST204),
        // então não vinculamos por coluna. Os itens ficam salvos em `receipts/receipt_items`.
        is_receipt: mode === "aggregate",
        fuel_liters: null,
        fuel_price_per_liter: null,
        fuel_station: null,
        fuel_type: null,
      };

      const rowsToInsert: Partial<SupabaseExpenseRow>[] = [];

      if (mode === "aggregate") {
        const description = `Compra em ${
          normalizedReceipt.storeName || "loja"
        }`;
        rowsToInsert.push({
          ...baseRow,
          description,
          amount: receiptTotal,
          category: defaultCategoryName,
          payment_method: paymentMethodId ?? null,
        });
      } else {
        normalizedReceipt.items.forEach((item) => {
          const safeTotal = Number(item.total || 0);
          const itemCategoryId = item.suggestedCategoryId ?? defaultCategoryId;
          const itemCategoryName = resolveCategoryName(
            itemCategoryId,
            categoryNameById,
            defaultCategoryName
          );

          rowsToInsert.push({
            ...baseRow,
            description: item.description,
            amount: safeTotal,
            category: itemCategoryName,
            payment_method: paymentMethodId ?? null,
          });
        });
      }

      if (rowsToInsert.length === 0) {
        console.warn(
          "createExpensesFromReceipt: nenhuma linha para inserir (rows vazias)."
        );
        return {};
      }

      const { data, error } = await supabase
        .from("expenses")
        .insert(rowsToInsert)
        .select("*");

      if (error) {
        console.error(
          "Erro ao inserir expenses a partir do cupom no Supabase:",
          error
        );
        return { error: "Erro ao salvar as saídas desse cupom." };
      }

      const insertedRows = (data ?? []) as SupabaseExpenseRow[];

      const newExpenses: Expense[] = insertedRows.map((row, index) => {
        const isFirst = index === 0;

        return {
          id: row.id,
          date: row.date ?? safeDate,
          description: row.description ?? "",
          amount: Number(row.amount ?? 0),
          category: row.category ?? "Outros",
          categoryId: undefined,
          paymentMethodId: row.payment_method ?? null,
          isFixed: row.is_fixed ?? false,
          isRecurring: row.is_recurring ?? false,
          dueDate: safeDate,
          recurrenceDay: row.recurrence_day ?? undefined,
          status: (row.status as ExpenseStatus) ?? "paga",
          observation: row.observation ?? undefined,
          fuelLiters: row.fuel_liters ?? undefined,
          fuelPricePerLiter: row.fuel_price_per_liter ?? undefined,
          fuelStation: row.fuel_station ?? undefined,
          fuelType: row.fuel_type ?? undefined,
          createdAt: row.created_at ?? new Date().toISOString(),
          receiptId: receiptId,
          isReceipt: mode === "aggregate" ? true : undefined,
          receiptStore: row.receipt_store ?? normalizedReceipt.storeName,
          receiptItems:
            mode === "aggregate" && isFirst
              ? normalizedReceipt.items
              : undefined,
        };
      });

      setExpenses((prev) => [...prev, ...newExpenses]);

      return {};
    } catch (err) {
      console.error(
        "Erro inesperado dentro de createExpensesFromReceipt:",
        err
      );
      return { error: "Erro inesperado ao salvar cupom e saídas." };
    }
  };

  const deleteIncome = async (
    id: string
  ): Promise<{ error?: string; success?: boolean }> => {
    try {
      const { error } = await supabase
        .from("incomes")
        .delete()
        .eq("id", id)
        .eq("user_id", user?.id ?? null);

      if (error) {
        throw new Error(error.message);
      }

      setIncomes((prev) => prev.filter((income) => income.id !== id));

      return { success: true };
    } catch (err: any) {
      console.error("Erro ao deletar entrada:", err);
      return { error: err?.message || "Erro ao deletar entrada" };
    }
  };

  const updateIncome = (
    id: string,
    data: Partial<Omit<Income, "id" | "createdAt">>
  ) => {
    setIncomes((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, ...data } : inc))
    );
  };

  const deleteExpense = async (id: string) => {
    console.log("deleteExpense chamado com id:", id);

    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id)
        .eq("user_id", user?.id ?? null);

      if (error) {
        console.error("Erro Supabase ao deletar expense:", error);
        alert("Erro ao deletar saída: " + error.message);
        return { error: error.message };
      }

      setExpenses((prev) =>
        prev.filter((expense) => expense.id === undefined || expense.id !== id)
      );

      return { success: true };
    } catch (err: any) {
      console.error("Erro inesperado ao deletar expense:", err);
      alert("Erro inesperado ao deletar saída");
      return { error: err?.message ?? "Erro inesperado" };
    }
  };

  const updateExpense = (
    id: string,
    data: Partial<Omit<Expense, "id" | "createdAt">>
  ) => {
    setExpenses((prev) =>
      prev.map((exp) => (exp.id === id ? { ...exp, ...data } : exp))
    );

    if (!user) return;

    const updatePayload: Record<string, any> = {};

    if (data.date !== undefined) updatePayload.date = data.date;
    if (data.description !== undefined)
      updatePayload.description = data.description;
    if (data.amount !== undefined) updatePayload.amount = data.amount;
    if (data.category !== undefined) updatePayload.category = data.category;
    if (data.paymentMethodId !== undefined)
      updatePayload.payment_method = data.paymentMethodId;
    if (data.isFixed !== undefined) updatePayload.is_fixed = data.isFixed;
    if (data.isRecurring !== undefined)
      updatePayload.is_recurring = data.isRecurring;
    if (data.recurrenceDay !== undefined)
      updatePayload.recurrence_day = data.recurrenceDay;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.observation !== undefined)
      updatePayload.observation = data.observation;
    if (data.receiptStore !== undefined)
      updatePayload.receipt_store = data.receiptStore;
    if (data.fuelLiters !== undefined)
      updatePayload.fuel_liters = data.fuelLiters;
    if (data.fuelPricePerLiter !== undefined)
      updatePayload.fuel_price_per_liter = data.fuelPricePerLiter;
    if (data.fuelStation !== undefined)
      updatePayload.fuel_station = data.fuelStation;
    if (data.fuelType !== undefined) updatePayload.fuel_type = data.fuelType;

    if (Object.keys(updatePayload).length === 0) return;

    (async () => {
      try {
        const { error } = await supabase
          .from("expenses")
          .update(updatePayload)
          .eq("id", id)
          .eq("user_id", user.id);

        if (error) {
          console.error("Erro ao atualizar expense no Supabase:", error);
        }
      } catch (err: unknown) {
        console.error("Erro inesperado ao atualizar expense:", err);
      }
    })();
  };

  const updateExpenseStatus = (id: string, status: ExpenseStatus) => {
    // mantém UX rápida
    setExpenses((prev) =>
      prev.map((expense) =>
        expense.id === id ? { ...expense, status } : expense
      )
    );

    // e salva no Supabase
    if (!user) return;
    supabase
      .from("expenses")
      .update({ status })
      .eq("id", id)
      .eq("user_id", user.id)
      .then(({ error }) => {
        if (error) console.error("Erro ao atualizar status:", error);
      });
  };

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
    const meta =
      TRACKED_VARIANTS_META[data.variantKey as TrackedVariantKey] ||
      data.customMeta;

    if (!meta) return;

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
      const key = s.date.slice(0, 7);
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
        loadIncomes,
        loadExpenses,
        loadPaymentMethods,
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

        // PRICE RESEARCH (Supabase)
        priceResearchCategories,
        priceResearchItems,
        priceResearchEntries,
        loadPriceResearch,
        addPriceResearchCategory,
        addPriceResearchItem,
        addPriceResearchEntry,
        deletePriceResearchEntry,
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
  SupabaseExpenseRow,
  SupplyCategory,
  SupplyVariant,
  SupplyVariantId,
  SupplyPriceSample,
};

