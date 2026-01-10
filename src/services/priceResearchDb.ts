// src/services/priceResearchDb.ts
import { supabase } from "../supabaseClient";

/**
 * Registro simplificado usado no Painel de Pesquisa de Preços
 * e salvo no localStorage.
 */
export type LocalPriceEntry = {
  id: string;
  categoryId: string;
  subcategoryId: string;
  price: number;
  date: string; // yyyy-mm-dd
  store: string | null;
};

const LOCAL_STORAGE_KEY = "sirius-price-research-entries";

// ---------------------------------------------------------
// LocalStorage helpers
// ---------------------------------------------------------

export function getLocalPriceEntries(): LocalPriceEntry[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];

    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];

    return data
      .map((item: any): LocalPriceEntry | null => {
        if (!item) return null;

        const id = String(item.id ?? "");
        const categoryId = String(item.categoryId ?? "");
        const subcategoryId = String(item.subcategoryId ?? "");
        const priceNumber = Number(item.price ?? 0);

        if (!id || !categoryId || !subcategoryId) return null;

        const date =
          typeof item.date === "string"
            ? item.date
            : new Date().toISOString().slice(0, 10);

        return {
          id,
          categoryId,
          subcategoryId,
          price: Number.isFinite(priceNumber) ? priceNumber : 0,
          date,
          store: (item.store ?? null) as string | null,
        };
      })
      .filter((e): e is LocalPriceEntry => e !== null);
  } catch (err) {
    console.error("[priceResearchDb] Erro ao ler do localStorage:", err);
    return [];
  }
}

export function saveLocalPriceEntries(entries: LocalPriceEntry[]): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
  } catch (err) {
    console.error("[priceResearchDb] Erro ao salvar no localStorage:", err);
  }
}

// ---------------------------------------------------------
// Tipos para Supabase
// ---------------------------------------------------------

export type PriceEntrySupabaseInput = {
  categoryName: string;
  subcategoryName: string;
  price: number;
  date: string; // yyyy-mm-dd
  store?: string | null;
  // extras opcionais (ignorados nos inserts)
  categoryId?: string;
  subcategoryId?: string;
  expenseCategoryId?: string;
  expenseCategoryName?: string;
  source?: string;
};

// ---------------------------------------------------------
// Helpers internos de categoria / item
// Tabelas: price_research_categories, price_research_items
// ---------------------------------------------------------

async function ensureCategory(
  userId: string,
  name: string
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  try {
    const { data: existing, error: selectError } = await supabase
      .from("price_research_categories")
      .select("id")
      .eq("user_id", userId)
      .eq("name", trimmed)
      .maybeSingle();

    if (selectError && selectError.code !== "PGRST116") {
      console.error("[priceResearchDb] Erro ao buscar categoria:", selectError);
    }

    if (existing?.id) return existing.id;

    const { data: inserted, error: insertError } = await supabase
      .from("price_research_categories")
      .insert({ user_id: userId, name: trimmed })
      .select("id")
      .single();

    if (insertError) {
      console.error("[priceResearchDb] Erro ao criar categoria:", insertError);
      return null;
    }

    return inserted?.id ?? null;
  } catch (err) {
    console.error("[priceResearchDb] Erro inesperado em ensureCategory:", err);
    return null;
  }
}

async function ensureItem(
  userId: string,
  categoryId: string,
  name: string
): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  try {
    const { data: existing, error: selectError } = await supabase
      .from("price_research_items")
      .select("id")
      .eq("user_id", userId)
      .eq("category_id", categoryId)
      .eq("name", trimmed)
      .maybeSingle();

    if (selectError && selectError.code !== "PGRST116") {
      console.error("[priceResearchDb] Erro ao buscar item:", selectError);
    }

    if (existing?.id) return existing.id;

    const { data: inserted, error: insertError } = await supabase
      .from("price_research_items")
      .insert({
        user_id: userId,
        category_id: categoryId,
        name: trimmed,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[priceResearchDb] Erro ao criar item:", insertError);
      return null;
    }

    return inserted?.id ?? null;
  } catch (err) {
    console.error("[priceResearchDb] Erro inesperado em ensureItem:", err);
    return null;
  }
}

// ---------------------------------------------------------
// Escrita no Supabase
// ---------------------------------------------------------

/**
 * Salva UM registro de pesquisa de preços:
 *  - price_research_categories (garante categoria)
 *  - price_research_items     (garante item)
 *  - price_research_entries   (insere entrada)
 *
 * IMPORTANTE: aqui NÃO mexemos em localStorage.
 */
export async function savePriceEntryToSupabase(
  input: PriceEntrySupabaseInput
): Promise<void> {
  try {
    const { data: userResult, error: userError } = await supabase.auth.getUser();

    if (userError || !userResult?.user) {
      console.warn(
        "[priceResearchDb] Usuário não autenticado, não salvando no Supabase."
      );
      return;
    }

    const userId = userResult.user.id;

    const categoryName = (input.categoryName ?? "").toString().trim() || "Categoria";
    const subcategoryName = (input.subcategoryName ?? "").toString().trim() || "Item";
    const price = Number(input.price) || 0;
    const priceSafe = Number.isFinite(price) && price > 0 ? price : 0;
    const date =
      input.date && typeof input.date === "string"
        ? input.date
        : new Date().toISOString().slice(0, 10);
    const store = input.store ?? null;

    if (!priceSafe) {
      console.warn(
        "[priceResearchDb] Preço inválido, não salvando no Supabase.",
        input.price
      );
      return;
    }

    const categoryId = await ensureCategory(userId, categoryName);
    if (!categoryId) {
      console.warn(
        "[priceResearchDb] Não foi possível obter categoryId. Abortando insert."
      );
      return;
    }

    const itemId = await ensureItem(userId, categoryId, subcategoryName);
    if (!itemId) {
      console.warn(
        "[priceResearchDb] Não foi possível obter itemId. Abortando insert."
      );
      return;
    }

    // --------- Tabela price_research_entries ----------
    const { error: entryError } = await supabase
      .from("price_research_entries")
      .insert({
        user_id: userId,
        category_id: categoryId,
        item_id: itemId,
        price: priceSafe,
        date,
        store,
      });

    if (entryError && (entryError as any).code !== "23505") {
      console.error(
        "[priceResearchDb] Erro ao salvar em price_research_entries:",
        entryError
      );
    }
  } catch (err) {
    console.error("[priceResearchDb] Erro inesperado ao salvar no Supabase:", err);
  }
}

// ---------------------------------------------------------
// Dual write: localStorage + Supabase
// Usado por: Adicionar Saída, Importador de Cupons, etc.
// ---------------------------------------------------------

/**
 * rawInput é qualquer objeto que venha das telas
 * (AddExpensePage, ReceiptImportModal, etc).
 * Aqui a gente extrai o que precisa e:
 * - grava uma cópia simplificada no localStorage
 * - chama savePriceEntryToSupabase() para mandar pro Supabase
 */
export async function savePriceEntryDualWrite(rawInput: any): Promise<void> {
  try {
    const priceNumber = Number(rawInput?.price ?? 0);
    const price =
      Number.isFinite(priceNumber) && priceNumber > 0 ? priceNumber : 0;

    if (!price) {
      console.warn(
        "[priceResearchDb] DualWrite chamado com preço inválido:",
        rawInput?.price
      );
      return;
    }

    const date =
      typeof rawInput?.date === "string" && rawInput.date
        ? rawInput.date
        : new Date().toISOString().slice(0, 10);

    const categoryName =
      rawInput?.categoryName ??
      rawInput?.category ??
      rawInput?.expenseCategoryName ??
      rawInput?.categoryId ??
      "Categoria";

    const subcategoryName =
      rawInput?.subcategoryName ??
      rawInput?.subCategoryName ??
      rawInput?.priceItemName ??
      rawInput?.subcategory ??
      rawInput?.subcategoryId ??
      rawInput?.itemDescription ??
      rawInput?.description ??
      "Item";

    const store =
      typeof rawInput?.store === "string" && rawInput.store.trim().length > 0
        ? rawInput.store.trim()
        : null;

    const source: "manual" | "receipt" =
      rawInput?.source === "manual" || rawInput?.source === "receipt"
        ? rawInput.source
        : "receipt";

    // 1) Atualiza localStorage (Painel de Pesquisa)
    try {
      const existing = getLocalPriceEntries();

      const localCategoryId =
        String(
          rawInput?.categoryId ??
            rawInput?.category ??
            rawInput?.categoryName ??
            categoryName
        ) || "categoria";

      const localSubcategoryId =
        String(
          rawInput?.subcategoryId ??
            rawInput?.subCategoryId ??
            rawInput?.subcategoryName ??
            subcategoryName
        ) || "item";

      const localId =
        typeof rawInput?.id === "string" && rawInput.id
          ? rawInput.id
          : `dual-${Date.now()}`;

      const localEntry: LocalPriceEntry = {
        id: localId,
        categoryId: localCategoryId,
        subcategoryId: localSubcategoryId,
        price,
        date,
        store,
      };

      saveLocalPriceEntries([localEntry, ...existing]);
    } catch (err) {
      console.error(
        "[priceResearchDb] Erro ao salvar dualWrite no localStorage:",
        err
      );
    }

    // 2) Envia para o Supabase
    await savePriceEntryToSupabase({
      categoryName: String(categoryName),
      subcategoryName: String(subcategoryName),
      price,
      date,
      store,
      source,
    });
  } catch (err) {
    console.error("[priceResearchDb] Erro inesperado em dualWrite:", err);
  }
}
