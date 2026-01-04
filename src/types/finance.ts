export type Category = string;

export type ExpenseStatus = "pendente" | "paga";

export type PaymentMethodType = "dinheiro" | "pix" | "debito" | "credito" | "outro";

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  color?: string;
  description?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  date: string; // yyyy-mm-dd
  description: string;
  amount: number; // valor positivo
  category: Category;
  categoryId?: string;
  paymentMethodId: string | null;
  isFixed: boolean;
  isRecurring: boolean;
  dueDate?: string;
  recurrenceDay?: number;
  status: ExpenseStatus;
  fuelLiters?: number;
  fuelPricePerLiter?: number;
  fuelStation?: string;
  fuelType?: string;
  createdAt: string; // ISO datetime
  receiptId?: string;
  // Campos para cupons
  isReceipt?: boolean;
  receiptStore?: string;
  receiptItems?: ReceiptItem[];
}

// Linha da tabela public.expenses no Supabase
export interface SupabaseExpenseRow {
  id: string;
  user_id: string | null;
  date: string;
  description: string;
  amount: number;
  category: string | null;
  payment_me: string | null;
  created_at: string;
}

export interface Income {
  id: string;
  date: string; // yyyy-mm-dd
  description: string;
  amount: number; // valor positivo
  source: string;
  createdAt: string; // ISO datetime
}

export interface MonthlySummary {
  year: number;
  month: number; // 0 = jan
  monthLabel: string; // ex.: jan./25
  entradas: number;
  saidas: number;
  saldo: number;
  percentualEntradasAno: number;
  percentualSaidasAno: number;
  percentualEntradasMes: number;
  percentualSaidasMes: number;
}

export interface BankAccount {
  id: string;
  name: string;
  institution?: string;
  color?: string;
  createdAt: string;
}

export interface BankBalance {
  id: string;
  bankId: string;
  year: number;
  month: number; // 1-12
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export type ReceiptItem = {
  id: string | number;
  description: string;
  quantity: number; // obrigatorio para padronizar itens do cupom
  unitPrice: number; // valor unitario padronizado
  unit_price?: number; // compatibilidade com formatos veryfi
  total: number;
  isDiscount?: boolean;
  suggestedCategoryId?: string; // id da categoria sugerida
  suggestedCategoryName?: string; // nome da categoria sugerida
  suspect?: boolean;
  rawLine?: string;
};

export type Receipt = {
  id: string;
  storeName: string;
  cnpj?: string;
  date: string; // ISO (ex: "2025-12-28")
  total: number;
  items: ReceiptItem[];
  rawText: string; // texto cru retornado pelo OCR
  rawTotalFromReceipt?: number;
  itemsTotal?: number;
  warnings?: string[];
  suggestedCategory?: string | null;
};

// Formato padronizado para resumos vindos do Veryfi/backend
export interface ReceiptSummary {
  store: string;
  purchase_date: string;
  total_amount: number;
  currency?: string;
  items: Array<{
    id: string | number;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  suggestedCategory?: string | null;
}

// ---------------------------------------------------------------------------
// Pesquisa de preços de insumos (supply tracking)
// ---------------------------------------------------------------------------

// Identificador do tipo geral de insumo
export type SupplyCategory =
  | "carne_bovina"
  | "carne_frango"
  | "carne_suina"
  | "ovos"
  | "queijo"
  | "gasolina";

// Identificador dos cortes / variações dentro de cada categoria
export type SupplyVariantId =
  | "miolo_paleta"
  | "contrafile"
  | "musculo"
  | "frango_file_peito"
  | "frango_coxa"
  | "frango_sobrecoxa"
  | "suina_pernil"
  | "suina_lombo"
  | "ovos_20un"
  | "ovos_30un"
  | "queijo_mussarela"
  | "queijo_prato"
  | "gasolina_comum"
  | "gasolina_aditivada"
  | `custom_${string}`;

export interface SupplyVariant {
  id: SupplyVariantId;
  category: SupplyCategory;
  name: string; // Ex.: "Miolo da paleta"
  unit: string; // Ex.: "kg", "bandeja 20 un", "litro"
}

// Registro de um preço de insumo em uma data
export interface SupplyPriceSample {
  id: string;
  variantId: SupplyVariantId;
  category: SupplyCategory;
  date: string; // ISO
  price: number; // preço por unidade (kg, litro, etc.)
  place?: string; // mercado, açougue, posto opcional
  createdAt: string;
}

export const SUPPLY_VARIANTS: SupplyVariant[] = [
  { id: "miolo_paleta", category: "carne_bovina", name: "Miolo da paleta", unit: "kg" },
  { id: "contrafile", category: "carne_bovina", name: "Contrafilé", unit: "kg" },
  { id: "musculo", category: "carne_bovina", name: "Músculo", unit: "kg" },
  { id: "frango_file_peito", category: "carne_frango", name: "Filé de peito", unit: "kg" },
  { id: "frango_coxa", category: "carne_frango", name: "Coxa", unit: "kg" },
  { id: "frango_sobrecoxa", category: "carne_frango", name: "Sobrecoxa", unit: "kg" },
  { id: "suina_pernil", category: "carne_suina", name: "Pernil", unit: "kg" },
  { id: "suina_lombo", category: "carne_suina", name: "Lombo", unit: "kg" },
  { id: "ovos_20un", category: "ovos", name: "Ovos – cartela 20 un", unit: "cartela 20" },
  { id: "ovos_30un", category: "ovos", name: "Ovos – cartela 30 un", unit: "cartela 30" },
  { id: "queijo_mussarela", category: "queijo", name: "Queijo mussarela", unit: "kg" },
  { id: "queijo_prato", category: "queijo", name: "Queijo prato", unit: "kg" },
  { id: "gasolina_comum", category: "gasolina", name: "Gasolina comum", unit: "litro" },
  { id: "gasolina_aditivada", category: "gasolina", name: "Gasolina aditivada", unit: "litro" },
];

export function getVariantById(id: SupplyVariantId): SupplyVariant | undefined {
  return SUPPLY_VARIANTS.find((v) => v.id === id);
}

export function getVariantsByCategory(category: SupplyCategory): SupplyVariant[] {
  return SUPPLY_VARIANTS.filter((v) => v.category === category);
}

// --- Pesquisa de preços de insumos ---

export type TrackedFamilyKey =
  | "carne_bovina"
  | "frango"
  | "porco"
  | "ovos"
  | "queijo"
  | "gasolina";

export type TrackedVariantKey =
  | "carne_bovina_miolo_paleta"
  | "carne_bovina_contrafile"
  | "carne_bovina_musculo"
  | "frango_file_peito"
  | "frango_coxa"
  | "frango_sobrecoxa"
  | "porco_pernil"
  | "porco_lombo"
  | "ovos_cartela_20"
  | "ovos_cartela_30"
  | "queijo_mussarela"
  | "queijo_prato"
  | "gasolina_comum"
  | "gasolina_aditivada";

export type TrackedUnit = "kg" | "L" | "cartela";

export interface TrackedVariantMeta {
  familyKey: TrackedFamilyKey;
  variantKey: TrackedVariantKey;
  familyLabel: string;
  variantLabel: string;
  unit: TrackedUnit;
  /**
   * Para ovos, por exemplo, 20 ou 30 unidades por cartela.
   */
  referenceQuantity?: number;
}

export interface TrackedPriceSample {
  id: string;
  familyKey: TrackedFamilyKey;
  variantKey: TrackedVariantKey;
  familyLabel: string;
  variantLabel: string;
  unit: TrackedUnit;
  referenceQuantity?: number;
  value: number; // preço por kg, L ou cartela
  date: string; // YYYY-MM-DD
  source?: string;
  createdAt: string;
}

export interface TrackedPriceSummary {
  lastPrice: number | null;
  lastDate: string | null;
  previousPrice: number | null;
  variationAbs: number | null;
  variationPercent: number | null;
}

/**
 * Metadados fixos de todas as variantes acompanhadas.
 */
export const TRACKED_VARIANTS_META: Record<TrackedVariantKey, TrackedVariantMeta> = {
  carne_bovina_miolo_paleta: {
    familyKey: "carne_bovina",
    variantKey: "carne_bovina_miolo_paleta",
    familyLabel: "Carne bovina",
    variantLabel: "Miolo da paleta",
    unit: "kg",
  },
  carne_bovina_contrafile: {
    familyKey: "carne_bovina",
    variantKey: "carne_bovina_contrafile",
    familyLabel: "Carne bovina",
    variantLabel: "Contrafilé",
    unit: "kg",
  },
  carne_bovina_musculo: {
    familyKey: "carne_bovina",
    variantKey: "carne_bovina_musculo",
    familyLabel: "Carne bovina",
    variantLabel: "Músculo",
    unit: "kg",
  },
  frango_file_peito: {
    familyKey: "frango",
    variantKey: "frango_file_peito",
    familyLabel: "Frango",
    variantLabel: "Filé de peito",
    unit: "kg",
  },
  frango_coxa: {
    familyKey: "frango",
    variantKey: "frango_coxa",
    familyLabel: "Frango",
    variantLabel: "Coxa",
    unit: "kg",
  },
  frango_sobrecoxa: {
    familyKey: "frango",
    variantKey: "frango_sobrecoxa",
    familyLabel: "Frango",
    variantLabel: "Sobrecoxa",
    unit: "kg",
  },
  porco_pernil: {
    familyKey: "porco",
    variantKey: "porco_pernil",
    familyLabel: "Carne suína",
    variantLabel: "Pernil",
    unit: "kg",
  },
  porco_lombo: {
    familyKey: "porco",
    variantKey: "porco_lombo",
    familyLabel: "Carne suína",
    variantLabel: "Lombo",
    unit: "kg",
  },
  ovos_cartela_20: {
    familyKey: "ovos",
    variantKey: "ovos_cartela_20",
    familyLabel: "Ovos",
    variantLabel: "Cartela 20 unidades",
    unit: "cartela",
    referenceQuantity: 20,
  },
  ovos_cartela_30: {
    familyKey: "ovos",
    variantKey: "ovos_cartela_30",
    familyLabel: "Ovos",
    variantLabel: "Cartela 30 unidades",
    unit: "cartela",
    referenceQuantity: 30,
  },
  queijo_mussarela: {
    familyKey: "queijo",
    variantKey: "queijo_mussarela",
    familyLabel: "Queijo",
    variantLabel: "Muçarela",
    unit: "kg",
  },
  queijo_prato: {
    familyKey: "queijo",
    variantKey: "queijo_prato",
    familyLabel: "Queijo",
    variantLabel: "Prato",
    unit: "kg",
  },
  gasolina_comum: {
    familyKey: "gasolina",
    variantKey: "gasolina_comum",
    familyLabel: "Gasolina",
    variantLabel: "Gasolina comum",
    unit: "L",
  },
  gasolina_aditivada: {
    familyKey: "gasolina",
    variantKey: "gasolina_aditivada",
    familyLabel: "Gasolina",
    variantLabel: "Gasolina aditivada",
    unit: "L",
  },
};
