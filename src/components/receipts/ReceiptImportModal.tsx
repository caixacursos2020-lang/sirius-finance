import { useEffect, useMemo, useState } from "react";
import { useCategories } from "../../contexts/CategoriesContext";
import { useFinance } from "../../contexts/FinanceContext";
import { savePriceEntryDualWrite } from "../../services/priceResearchDb";
import { type Receipt } from "../../types/finance";
import { formatCurrency, formatDate } from "../../utils/formatters";
// QR Sefaz removido do fluxo automatico
import ReceiptCamera from "./ReceiptCamera";
import ReceiptItemsEditor from "./ReceiptItemsEditor";
import { scanReceiptWithAI } from "../../services/aiScanner";
import {
  Braces,
  Camera,
  FileJson,
  ImageUp,
  Loader2,
  Banknote,
  CreditCard,
  Smartphone,
  Wallet,
  Store,
  Sparkles,
  Upload,
} from "lucide-react";

type ReceiptImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type Step = 1 | 2;

// Tipos e helpers da pesquisa de preços
type PriceCategory = {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
};

const PRICE_CATEGORIES_STORAGE_KEY = "sirius-price-research-categories";

function loadPriceCategoriesFromStorage(): PriceCategory[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(PRICE_CATEGORIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((c: any, idx: number) => ({
      id: c.id ?? `pcat-${idx}`,
      name: c.name ?? c.nome ?? "Categoria",
      subcategories: Array.isArray(c.subcategories)
        ? c.subcategories.map((s: any, sIdx: number) => ({
            id: s.id ?? `psub-${idx}-${sIdx}`,
            name: s.name ?? s.nome ?? "Item",
          }))
        : [],
    }));
  } catch {
    return [];
  }
}

function savePriceCategoriesToStorage(categories: PriceCategory[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      PRICE_CATEGORIES_STORAGE_KEY,
      JSON.stringify(categories),
    );
  } catch {
    // ignore
  }
}

export default function ReceiptImportModal({
  isOpen,
  onClose,
}: ReceiptImportModalProps) {
  const { categories } = useCategories();
  const {
    createExpensesFromReceipt,
    getActivePaymentMethods,
    paymentMethods,
  } = useFinance();

  const [step, setStep] = useState<Step>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [itemCategories, setItemCategories] = useState<
    Record<string, string | undefined>
  >({});
  const [statusLog, setStatusLog] = useState<string | null>(null);
  const [statusLogType, setStatusLogType] = useState<"info" | "error">("info");
  const [defaultCategoryId, setDefaultCategoryId] = useState<
    string | undefined
  >(undefined);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    string | null
  >(null);

  // JSON manual (via GPT/Gemini)
  const [manualJsonText, setManualJsonText] = useState("");
  const [manualJsonError, setManualJsonError] = useState<string | null>(null);

  // --- Pesquisa de preços (categorias / itens) ---
  const [priceCategories, setPriceCategories] = useState<PriceCategory[]>([]);
  const [priceCatSelections, setPriceCatSelections] = useState<
    Record<string, string>
  >({});
  const [priceSubSelections, setPriceSubSelections] = useState<
    Record<string, string>
  >({});

  // Atalho rápido para criar categorias/itens da pesquisa
  const [newPriceCategoryName, setNewPriceCategoryName] = useState("");
  const [newPriceSubcategoryName, setNewPriceSubcategoryName] = useState("");
  const [selectedPriceCategoryForSub, setSelectedPriceCategoryForSub] =
    useState<string>("");

  // --- Mapas auxiliares ---
  const categoryNameById = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((cat) => {
      map[cat.id] = cat.name;
    });
    return map;
  }, [categories]);

  const categoryIdByName = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((cat) => {
      map.set(cat.name.toLowerCase(), cat.id);
    });
    return map;
  }, [categories]);

  const resolveSuggestedCategoryId = (
    suggestedName?: string,
    suggestedId?: string,
  ) => {
    if (suggestedId) return suggestedId;
    if (!suggestedName) return undefined;
    const id = categoryIdByName.get(suggestedName.toLowerCase());
    return id;
  };

  const findCategoryIdByKeyword = (keyword: string) => {
    const lower = keyword.toLowerCase();
    const match = categories.find((cat) =>
      cat.name.toLowerCase().includes(lower),
    );
    return match?.id;
  };

  // Formas de pagamento ativas para seleção
  const activePaymentMethods = useMemo(() => {
    const baseList = (() => {
      try {
        if (getActivePaymentMethods) return getActivePaymentMethods();
        return paymentMethods || [];
      } catch {
        return paymentMethods || [];
      }
    })();
    const dedup = new Map<string, (typeof baseList)[number]>();
    baseList.forEach((pm) => {
      if (!dedup.has(pm.id)) dedup.set(pm.id, pm);
    });
    return Array.from(dedup.values());
  }, [getActivePaymentMethods, paymentMethods]);

  // Totais
  const itemsTotal = useMemo(() => {
    if (!receipt) return 0;
    if (typeof receipt.itemsTotal === "number") return receipt.itemsTotal;
    return receipt.items.reduce((acc, item) => acc + item.total, 0);
  }, [receipt]);

  const cupomTotal = useMemo(() => {
    if (!receipt) return 0;
    return receipt.rawTotalFromReceipt ?? receipt.total ?? itemsTotal;
  }, [itemsTotal, receipt]);

  const warningMessage = receipt?.warnings?.[0];
  const warningList = receipt?.warnings ?? [];

  // Carregar categorias de pesquisa de preços (do localStorage)
  useEffect(() => {
    setPriceCategories(loadPriceCategoriesFromStorage());

    if (!categories.length) return;
    const mercadoId = findCategoryIdByKeyword("mercado");
    if (!defaultCategoryId) {
      setDefaultCategoryId(mercadoId ?? categories[0]?.id);
    }
  }, [categories, defaultCategoryId]);

  // Ajustar categoria padrão conforme sugestão do cupom
  useEffect(() => {
    if (!receipt || !categories.length) return;
    const suggestion = receipt.suggestedCategory?.toLowerCase();
    if (!suggestion) return;

    if (suggestion.includes("farm")) {
      const farmaciaId = findCategoryIdByKeyword("farm");
      if (farmaciaId) {
        setDefaultCategoryId(farmaciaId);
        return;
      }
    }

    if (suggestion.includes("merc")) {
      const mercadoId = findCategoryIdByKeyword("merc");
      if (mercadoId) {
        setDefaultCategoryId(mercadoId);
      }
    }
  }, [receipt, categories]);

  // Resetar modal ao fechar
  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedFile(null);
      setPreviewUrl(null);
      setReceipt(null);
      setError(null);
      setStatusLog(null);
      setStatusLogType("info");
      setItemCategories({});
      setIsLoading(false);
      setIsAiLoading(false);
      setShowCamera(false);
      setDefaultCategoryId(undefined);
      setPriceCatSelections({});
      setPriceSubSelections({});
      setNewPriceCategoryName("");
      setNewPriceSubcategoryName("");
      setSelectedPriceCategoryForSub("");
      setManualJsonText("");
      setManualJsonError(null);
      setSelectedPaymentMethodId(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  // Seleciona automaticamente a primeira forma de pagamento ativa
  useEffect(() => {
    if (!selectedPaymentMethodId && activePaymentMethods.length > 0) {
      setSelectedPaymentMethodId(activePaymentMethods[0].id);
    }
  }, [activePaymentMethods, selectedPaymentMethodId]);

  const paymentIcon = (type: string) => {
    switch (type) {
      case "dinheiro":
        return <Banknote className="h-4 w-4" />;
      case "pix":
        return <Smartphone className="h-4 w-4" />;
      case "debito":
      case "credito":
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
    }
  };

  if (!isOpen) return null;

  // --- Helpers de JSON (via IA) ---

  const importReceiptFromJsonString = (rawJson: string) => {
    const trimmed = rawJson.trim();
    if (!trimmed) {
      setManualJsonError("Cole o JSON do cupom antes de importar.");
      return;
    }

    try {
      setManualJsonError(null);
      setStatusLogType("info");
      setStatusLog("Importando cupom a partir do JSON...");

      const parsed: any = JSON.parse(trimmed);

      if (!parsed || typeof parsed !== "object") {
        throw new Error("JSON inválido: não é um objeto.");
      }

      const rawItems =
        parsed.items ??
        parsed.itens ??
        parsed.compra?.itens ??
        parsed.compra?.items ??
        null;

      if (!Array.isArray(rawItems)) {
        throw new Error("JSON inválido: precisa ter um campo 'items' (lista).");
      }

      const storeCandidate =
        parsed.storeName ??
        parsed.store ??
        parsed.loja ??
        parsed.loja?.nome ??
        parsed.loja?.name ??
        parsed.compra?.loja ??
        parsed.compra?.store ??
        null;
      const storeName =
        typeof storeCandidate === "string"
          ? storeCandidate
          : storeCandidate?.nome ?? storeCandidate?.name ?? "Loja não informada";

      const dateCandidate =
        parsed.date ??
        parsed.data ??
        parsed.compra?.data ??
        parsed.compra?.date ??
        new Date().toISOString();

      const normalized: any = {
        ...parsed,
        id: parsed.id ?? `manual-${Date.now()}`,
        storeName,
        date: dateCandidate,
        items: rawItems.map((item: any, index: number) => {
          const rawQty =
            item.quantity ?? item.qtd ?? item.quantidade ?? item.qtde ?? 1;
          const qtyNumber = Number(
            typeof rawQty === "string"
              ? rawQty.replace(",", ".")
              : rawQty ?? 1,
          );
          const quantity =
            Number.isFinite(qtyNumber) && qtyNumber > 0 ? qtyNumber : 1;

          const rawTotal =
            item.total ??
            item.valorTotal ??
            item.precoTotal ??
            item.vTot ??
            item.vTotal ??
            0;
          const totalNumber = Number(
            typeof rawTotal === "string"
              ? rawTotal.replace(",", ".")
              : rawTotal ?? 0,
          );
          const total = Number.isFinite(totalNumber) ? totalNumber : 0;

          const rawUnit =
            item.unitPrice ??
            item.preco_unit ??
            item.precoUnit ??
            item.precoUnitario ??
            item.unit_price ??
            item.valorUnitario ??
            item.vUn ??
            item.vUnitario;
          let unitNumber = Number(
            typeof rawUnit === "string"
              ? rawUnit.replace(",", ".")
              : rawUnit ?? 0,
          );
          if (!Number.isFinite(unitNumber) || unitNumber <= 0) {
            unitNumber = quantity > 0 ? total / quantity : total;
          }

          return {
            id: item.id ?? index + 1,
            description:
              item.description ??
              item.nome ??
              item.descricao ??
              `Item ${index + 1}`,
            quantity,
            unitPrice: unitNumber,
            total,
            suggestedCategoryId: item.suggestedCategoryId,
            suggestedCategoryName: item.suggestedCategoryName,
            suspect: Boolean(item.suspect),
          };
        }),
      };

      if (Array.isArray(normalized.items)) {
        const calcItemsTotal = normalized.items.reduce(
          (acc: number, it: any) => acc + (Number(it.total) || 0),
          0,
        );
        if (typeof normalized.itemsTotal !== "number") {
          normalized.itemsTotal = calcItemsTotal;
        }
        if (
          typeof normalized.total !== "number" &&
          typeof normalized.rawTotalFromReceipt !== "number"
        ) {
          normalized.total = calcItemsTotal;
          normalized.rawTotalFromReceipt = calcItemsTotal;
        }
      }

      setReceipt(normalized as Receipt);
      setItemCategories({});
      setStep(2);
      setStatusLogType("info");
      setStatusLog("Cupom carregado a partir do JSON (IA).");
    } catch (err: any) {
      console.error("Erro ao importar JSON do cupom:", err);
      setManualJsonError(
        err?.message ??
          "Não consegui entender o JSON colado. Confira o texto e tente novamente.",
      );
      setStatusLogType("error");
      setStatusLog("Falha ao importar JSON do cupom.");
    }
  };

  // --- Ações de leitura do cupom ---

  const handleFileSelection = (file: File | null) => {
    setSelectedFile(file);
    setError(null);
    setStatusLog(null);
    setStatusLogType("info");
    setIsLoading(false);
    setIsAiLoading(false);
  };

  const handleReadReceiptGemini = async () => {
    if (!selectedFile) {
      setError("Selecione uma imagem do cupom antes de continuar.");
      return;
    }

    setIsLoading(true);
    setIsAiLoading(true);
    setError(null);
    setManualJsonError(null);
    setStatusLogType("info");
    setStatusLog("Enviando cupom para leitura automática (Gemini)...");

    try {
      const aiJson = await scanReceiptWithAI(selectedFile);

      if (!aiJson || typeof aiJson !== "object") {
        throw new Error("Resposta vazia ou inválida da IA.");
      }

      const aiData = aiJson as any;
      const itemsArray = Array.isArray(aiData.items)
        ? aiData.items
        : Array.isArray(aiData.itens)
          ? aiData.itens
          : Array.isArray(aiData.compra?.itens)
            ? aiData.compra.itens
            : Array.isArray(aiData.compra?.items)
              ? aiData.compra.items
              : [];

      const parseNumber = (value: any) => {
        if (typeof value === "number") return value;
        if (typeof value === "string") {
          const parsed = Number(value.replace(",", "."));
          return Number.isFinite(parsed) ? parsed : null;
        }
        return null;
      };

      const normalizedItems: Receipt["items"] = itemsArray.map(
        (item: any, index: number): Receipt["items"][number] => {
          const quantityRaw = parseNumber(
            item.quantity ??
              item.qtd ??
              item.quantidade ??
              item.qtde ??
              item.unidade ??
              item.un,
          );
          const totalRaw = parseNumber(
            item.total ??
              item.precoTotal ??
              item.valorTotal ??
              item.vTot ??
              item.vTotal,
          );
          const unitRaw = parseNumber(
            item.unitPrice ??
              item.preco_unit ??
              item.precoUnit ??
              item.precoUnitario ??
              item.unit_price ??
              item.valorUnitario ??
              item.vUn ??
              item.vUnitario,
          );

          const quantity = quantityRaw && quantityRaw > 0 ? quantityRaw : 1;
          const total =
            totalRaw !== null && Number.isFinite(totalRaw) ? totalRaw : 0;
          const unitPrice =
            unitRaw !== null && unitRaw > 0
              ? unitRaw
              : quantity
                ? total / quantity
                : total;

          return {
            id: item.id ?? index + 1,
            description:
              item.description ??
              item.nome ??
              item.descricao ??
              item.name ??
              item.produto ??
              `Item ${index + 1}`,
            quantity,
            unitPrice,
            total: Number.isFinite(total) ? total : 0,
            suggestedCategoryId: item.suggestedCategoryId,
            suggestedCategoryName: item.suggestedCategoryName,
            suspect: Boolean(item.suspect),
          };
        },
      );

      const itemsTotal = normalizedItems.reduce(
        (acc: number, it) => acc + (Number(it.total) || 0),
        0,
      );

      const totalFromAi =
        aiData.total ??
        aiData.compra?.total ??
        aiData.compra?.valor_total ??
        aiData.compra?.valor ??
        aiData.total_compra;
      const parsedTotal = parseNumber(totalFromAi);

      const normalizedTotal =
        parsedTotal !== null && Number.isFinite(parsedTotal)
          ? parsedTotal
          : itemsTotal;

      const storeCandidate =
        aiData.storeName ??
        aiData.store ??
        aiData.loja ??
        aiData.loja?.nome ??
        aiData.loja?.name ??
        aiData.compra?.loja ??
        aiData.compra?.store ??
        null;
      const storeName =
        typeof storeCandidate === "string"
          ? storeCandidate
          : storeCandidate?.nome ?? storeCandidate?.name ?? "Loja não informada";

      const dateCandidate =
        aiData.date ??
        aiData.data ??
        aiData.compra?.data ??
        aiData.compra?.date ??
        new Date().toISOString();

      const normalizedReceipt: Receipt = {
        id: `gemini-${Date.now()}`,
        storeName,
        date: dateCandidate,
        total: normalizedTotal,
        items: normalizedItems,
        itemsTotal,
        rawTotalFromReceipt: normalizedTotal,
        rawText: "Importado via IA (Gemini)",
        suggestedCategory: null,
        warnings: [],
      };

      setReceipt(normalizedReceipt);
      setItemCategories({});
      setStep(2);

      setStatusLogType("info");
      setStatusLog("Cupom lido com sucesso. Revise os itens e salve.");
    } catch (err) {
      console.error("Erro ao ler cupom com IA (Gemini):", err);
      setStatusLogType("error");
      setStatusLog(
        "Não foi possível ler o cupom com a IA. Tente outra foto ou tente novamente.",
      );
      setError("Falha ao ler o cupom com a IA (Gemini).");
    } finally {
      setIsLoading(false);
      setIsAiLoading(false);
    }
  };

  // Leitura via QR (Sefaz) removida do fluxo atual.

  const updateReceiptItem = (
    itemId: string,
    updater: (item: Receipt["items"][number]) => Receipt["items"][number],
  ) => {
    setReceipt((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) => (String(it.id) === itemId ? updater(it) : it)),
      };
    });
  };

  const handleCategoryChange = (itemId: string, categoryId?: string) => {
    setItemCategories((prev) => ({ ...prev, [itemId]: categoryId }));
  };

  const resetAndClose = () => {
    setStep(1);
    setSelectedFile(null);
    setReceipt(null);
    setError(null);
    setStatusLogType("info");
    setStatusLog(null);
    setItemCategories({});
    setShowCamera(false);
    setPriceCatSelections({});
    setPriceSubSelections({});
    setNewPriceCategoryName("");
    setNewPriceSubcategoryName("");
    setSelectedPriceCategoryForSub("");
    setManualJsonText("");
    setManualJsonError(null);
    setIsLoading(false);
    setIsAiLoading(false);
    onClose();
  };

  const handleSavePerItem = async () => {
    if (!receipt) return;
    if (!selectedPaymentMethodId) {
      setError("Selecione a forma de pagamento antes de salvar.");
      setStatusLogType("error");
      setStatusLog("Escolha a forma de pagamento para continuar.");
      return;
    }
    const enrichedReceipt: Receipt = {
      ...receipt,
      total: cupomTotal || itemsTotal,
      itemsTotal,
      rawTotalFromReceipt: receipt.rawTotalFromReceipt ?? cupomTotal,
      items: receipt.items.map((item) => ({
        ...item,
        suggestedCategoryId:
          itemCategories[String(item.id)] ?? item.suggestedCategoryId,
      })),
    };

    try {
      await Promise.all(
        enrichedReceipt.items.map(async (item) => {
          const itemKey = String(item.id);
          const priceCatId = priceCatSelections[itemKey];
          const priceSubId = priceSubSelections[itemKey];
          if (!priceCatId || !priceSubId) return;

          const priceCat = priceCategories.find((c) => c.id === priceCatId);
          const priceSub = priceCat?.subcategories.find(
            (s) => s.id === priceSubId,
          );

          const categoryId =
            itemCategories[itemKey] ??
            item.suggestedCategoryId ??
            defaultCategoryId;
          const categoryName = categoryId
            ? categoryNameById[categoryId] ?? categoryId
            : undefined;
          const quantity =
            item.quantity && item.quantity > 0 ? item.quantity : 1;
          const unitPrice =
            item.unitPrice ??
            (item as any).unit_price ??
            (quantity ? item.total / quantity : item.total);

          await savePriceEntryDualWrite({
            categoryId: priceCatId,
            categoryName: priceCat?.name ?? priceCatId,
            subcategoryId: priceSubId,
            subcategoryName: priceSub?.name ?? item.description,
            price: unitPrice,
            date: enrichedReceipt.date,
            store: enrichedReceipt.storeName,
            expenseCategoryId: categoryId,
            expenseCategoryName: categoryName,
            itemDescription: item.description,
            priceItemName: priceSub?.name ?? item.description,
            source: "receipt",
          });
        }),
      );
    } catch (err) {
      console.error(
        "Erro ao salvar pesquisa de preços dos itens do cupom",
        err,
      );
    }

    createExpensesFromReceipt({
      receipt: enrichedReceipt,
      mode: "aggregate",
      defaultCategoryId,
      categoryNameById,
      paymentMethodId: selectedPaymentMethodId,
    });
    resetAndClose();
  };

  // --- Handlers de atalho de categorias de pesquisa ---

  const handleQuickAddPriceCategory = () => {
    const name = newPriceCategoryName.trim();
    if (!name) return;
    const now = Date.now();
    setPriceCategories((prev) => {
      const newCat: PriceCategory = {
        id: `cat-${now}`,
        name,
        subcategories: [],
      };
      const updated = [...prev, newCat];
      savePriceCategoriesToStorage(updated);
      return updated;
    });
    setNewPriceCategoryName("");
  };

  const handleQuickAddPriceSubcategory = () => {
    const catId = selectedPriceCategoryForSub;
    const name = newPriceSubcategoryName.trim();
    if (!catId || !name) return;
    setPriceCategories((prev) => {
      const updated = prev.map((cat) => {
        if (cat.id !== catId) return cat;
        const newSub = { id: `sub-${Date.now()}`, name };
        return { ...cat, subcategories: [...cat.subcategories, newSub] };
      });
      savePriceCategoriesToStorage(updated);
      return updated;
    });
    setNewPriceSubcategoryName("");
  };

  // --- UI ---

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-emerald-400">
              Importar cupom (beta)
            </p>
            <h3 className="text-xl font-semibold text-slate-50">
              Digitalize seu cupom fiscal
            </h3>
            <p className="text-sm text-slate-400">
              Envie uma foto do cupom, use IA (Gemini) ou JSON gerado por IA
              para lançar a compra e alimentar sua pesquisa de preços.
            </p>
          </div>
          <button
            className="text-sm text-slate-400 hover:text-slate-100"
            onClick={resetAndClose}
          >
            Fechar
          </button>
        </div>

        {/* Indicador de passos */}
        <div className="mt-4 flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                step === 1
                  ? "bg-emerald-500 text-slate-900"
                  : "bg-slate-800 text-slate-200"
              }`}
            >
              1
            </span>
            <span>Selecionar imagem / JSON</span>
          </div>
          <span className="text-slate-600">—</span>
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                step === 2
                  ? "bg-emerald-500 text-slate-900"
                  : "bg-slate-800 text-slate-200"
              }`}
            >
              2
            </span>
            <span>Conferir itens & salvar</span>
          </div>
        </div>

        <div className="mt-6">
          {step === 1 && (
            <div className="grid gap-4 lg:grid-cols-[1.25fr,0.9fr]">
              {/* Foto do cupom */}
              <div className="rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-950/70 to-slate-950/40 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.35)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-emerald-300/90">
                      Passo 1
                    </p>
                    <h4 className="mt-1 text-base font-semibold text-slate-100">
                      Foto do cupom
                    </h4>
                    <p className="mt-1 text-xs text-slate-400">
                      Quanto mais nítida e plana a foto, melhor a leitura.
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60">
                    <ImageUp className="h-5 w-5 text-emerald-300/80" />
                  </div>
                </div>

                <div className="mt-4 grid gap-3">
                  <input
                    type="file"
                    accept="image/*,.jpg,.jpeg,.png"
                    className="hidden"
                    id="receipt-gallery"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      handleFileSelection(file);
                    }}
                  />

                  <label
                    htmlFor="receipt-gallery"
                    className="group relative flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700 bg-slate-950/40 px-4 py-5 text-sm font-semibold text-slate-100 transition hover:border-emerald-500/70 hover:bg-emerald-500/5"
                  >
                    <Upload className="h-4 w-4 text-slate-300 group-hover:text-emerald-300" />
                    <span>Selecionar imagem</span>
                    <span className="text-xs font-normal text-slate-500">
                      (JPG/PNG)
                    </span>
                    {previewUrl && (
                      <span className="absolute right-3 top-3 rounded-full border border-white/10 bg-slate-950/60 px-2 py-1 text-[10px] text-slate-300">
                        Trocar
                      </span>
                    )}
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowCamera(true)}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/50 px-4 py-3 text-sm font-semibold text-slate-100 transition hover:border-emerald-500/60 hover:bg-emerald-500/5"
                  >
                    <Camera className="h-4 w-4 text-slate-300" />
                    Usar câmera
                  </button>

                  {showCamera && (
                    <div className="w-full">
                      <ReceiptCamera
                        onClose={() => setShowCamera(false)}
                        onCapture={(file) => {
                          setShowCamera(false);
                          handleFileSelection(file);
                        }}
                      />
                    </div>
                  )}

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/30 p-3">
                    {previewUrl ? (
                      <div className="flex items-center gap-3">
                        <img
                          src={previewUrl}
                          alt="Prévia do cupom"
                          className="h-16 w-16 rounded-xl object-cover border border-slate-800"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-100">
                            {selectedFile?.name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            Pronto para leitura automática.
                          </p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-slate-950/50">
                          <Sparkles className="h-5 w-5 text-emerald-300/80" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 text-slate-400">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/40">
                          <ImageUp className="h-5 w-5" />
                        </div>
                        <p className="text-sm">Nenhuma imagem selecionada ainda.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Leitura automática + JSON manual */}
              <div className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.28)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-emerald-300/90">
                      Recomendado
                    </p>
                    <h4 className="mt-1 text-base font-semibold text-slate-100">
                      Leitura automática (Gemini)
                    </h4>
                    <p className="mt-1 text-xs text-slate-400">
                      A IA extrai loja, data, total e itens. Depois você revisa e salva.
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60">
                    <Sparkles className="h-5 w-5 text-emerald-300/80" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReadReceiptGemini}
                  disabled={isLoading || isAiLoading || !selectedFile}
                  className="mt-4 w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 px-4 py-3 text-sm font-bold text-slate-900 shadow-[0_18px_35px_rgba(16,185,129,0.18)] transition hover:from-emerald-400 hover:to-teal-300 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isAiLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Lendo cupom...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Ler com IA
                    </span>
                  )}
                </button>

                <div className="mt-3 grid gap-2 rounded-2xl border border-slate-800 bg-slate-950/30 p-3 text-[11px] text-slate-400">
                  <p className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                    Evite sombras e cortes (cupom inteiro no quadro).
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                    Use boa luz (mesa, próximo a janela).
                  </p>
                  <p className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
                    Se vier “estranho”, você pode corrigir na etapa 2.
                  </p>
                </div>

                {statusLog && (
                  <div
                    className={`mt-3 rounded-2xl border px-3 py-2 text-xs ${
                      statusLogType === "error"
                        ? "border-rose-900/60 bg-rose-950/30 text-rose-200"
                        : "border-emerald-900/50 bg-emerald-950/20 text-emerald-200"
                    }`}
                  >
                    {statusLog}
                  </div>
                )}
                {error && (
                  <div className="mt-3 rounded-2xl border border-rose-900/60 bg-rose-950/30 px-3 py-2 text-xs text-rose-200">
                    {error}
                  </div>
                )}

                <details className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/30 open:bg-slate-950/35">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/60">
                        <Braces className="h-4 w-4 text-slate-300" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-100">
                          Importar via JSON (manual)
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Para quando você já gerou um JSON fora do app.
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">Abrir</span>
                  </summary>

                  <div className="border-t border-slate-800 px-4 pb-4 pt-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                      <FileJson className="h-4 w-4 text-emerald-300/80" />
                      Cole o JSON do cupom
                    </div>

                    <textarea
                      className="mt-3 h-32 w-full rounded-2xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-[12px] text-slate-100 font-mono outline-none focus:border-emerald-500"
                      placeholder='Ex.: {"storeName":"...","date":"YYYY-MM-DD","total":0,"items":[...]}'
                      value={manualJsonText}
                      onChange={(e) => {
                        setManualJsonText(e.target.value);
                        setManualJsonError(null);
                      }}
                    />

                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => importReceiptFromJsonString(manualJsonText)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-slate-900 hover:bg-emerald-500"
                      >
                        <Sparkles className="h-4 w-4" />
                        Importar JSON
                      </button>

                      <div>
                        <input
                          type="file"
                          id="receipt-json-file"
                          accept="application/json,.json,.txt"
                          className="hidden"
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              const text = String(reader.result ?? "");
                              setManualJsonText(text);
                              importReceiptFromJsonString(text);
                            };
                            reader.readAsText(file);
                            event.target.value = "";
                          }}
                        />
                        <label
                          htmlFor="receipt-json-file"
                          className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950/40 px-4 py-2 text-xs font-semibold text-slate-100 hover:border-emerald-500/60"
                        >
                          <FileJson className="h-4 w-4 text-slate-300" />
                          Importar arquivo
                        </label>
                      </div>
                    </div>

                    {manualJsonError && (
                      <p className="mt-2 text-[11px] text-rose-300">
                        {manualJsonError}
                      </p>
                    )}

                    <p className="mt-2 text-[11px] text-slate-500">
                      Dica: se o JSON vier com campos diferentes, eu tento normalizar automaticamente.
                    </p>
                  </div>
                </details>
              </div>
            </div>
          )}

          {step === 2 && receipt && (
            <div className="space-y-4">
                            {/* Info do cupom + editar loja */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex-1 min-w-[240px]">
                  <p className="text-xs uppercase text-slate-500">Loja / Local</p>
                  <div className="relative mt-1">
                    <Store className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      className="w-full rounded-md border border-slate-700 bg-slate-900 pl-8 pr-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                      value={receipt.storeName ?? ''}
                      onChange={(e) =>
                        setReceipt((prev) =>
                          prev ? { ...prev, storeName: e.target.value } : prev,
                        )
                      }
                      placeholder="Ex.: Mercado, Padaria, Posto..."
                    />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Data: {formatDate(receipt.date)}
                  </p>
                </div>
                <div className="text-right min-w-[180px]">
                  <p className="text-xs uppercase text-slate-500">
                    Total do cupom
                  </p>
                  <p className="text-xl font-semibold text-emerald-300">
                    {formatCurrency(cupomTotal)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {receipt.items.length} itens • soma dos itens:{" "}
                    {formatCurrency(itemsTotal)}
                  </p>
                </div>
              </div>
              {/* Categoria padrão */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200">
                <div>
                  <p className="mb-1 text-xs font-semibold text-slate-300">
                    Categoria padrão (saída)
                  </p>
                  <p className="max-w-md text-xs text-slate-500">
                    Essa categoria será aplicada automaticamente a todos os
                    itens, mas você pode ajustar item por item na tabela abaixo.
                  </p>
                </div>
                <div>
                  <select
                    className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                    value={defaultCategoryId ?? ""}
                    onChange={(event) => {
                      const next = event.target.value || undefined;
                      setDefaultCategoryId(next);
                      if (!receipt || !next) return;
                      const all = receipt.items.reduce<
                        Record<string, string>
                      >((acc, item) => {
                        acc[String(item.id)] = next;
                        return acc;
                      }, {});
                      setItemCategories(all);
                    }}
                  >
                    <option value="">Selecionar categoria</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Forma de pagamento */}
              <div className="flex flex-col gap-3 rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200">
                <div>
                  <p className="mb-1 text-xs font-semibold text-slate-300">
                    Forma de pagamento
                  </p>
                  <p className="max-w-md text-xs text-slate-500">
                    Escolha como esta compra foi paga. A mesma forma será aplicada na saída criada a partir deste cupom.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {activePaymentMethods.map((pm) => {
                    const isSelected = pm.id === selectedPaymentMethodId;
                    return (
                      <button
                        key={pm.id}
                        type="button"
                        onClick={() => setSelectedPaymentMethodId(pm.id)}
                        className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all ${
                          isSelected
                            ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                            : "border-slate-800 bg-slate-950 hover:border-slate-600"
                        }`}
                        style={{ borderColor: isSelected ? pm.color || "#22c55e" : undefined }}
                      >
                        <span
                          className="flex h-9 w-9 items-center justify-center rounded-full text-white shadow-sm"
                          style={{ backgroundColor: pm.color || "#475569" }}
                        >
                          {paymentIcon(pm.type)}
                        </span>
                        <span className="flex flex-col items-start leading-tight">
                          <span
                            className={`text-sm font-semibold ${
                              isSelected ? "text-white" : "text-slate-100"
                            }`}
                          >
                            {pm.name}
                          </span>
                          <span className="text-[10px] uppercase tracking-wide text-slate-400">
                            {pm.type}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                  {!activePaymentMethods.length && (
                    <p className="text-xs text-amber-300">
                      Nenhuma forma de pagamento ativa encontrada.
                    </p>
                  )}
                </div>
              </div>
              {/* ITENS DO CUPOM */}
              <ReceiptItemsEditor
                receipt={receipt}
                categories={categories}
                itemCategories={itemCategories}
                handleCategoryChange={handleCategoryChange}
                priceCategories={priceCategories}
                priceCatSelections={priceCatSelections}
                setPriceCatSelections={setPriceCatSelections}
                priceSubSelections={priceSubSelections}
                setPriceSubSelections={setPriceSubSelections}
                resolveSuggestedCategoryId={resolveSuggestedCategoryId}
                updateReceiptItem={updateReceiptItem}
              />

              {/* Atalho rápido – categorias da pesquisa de preços */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-200 space-y-3">
                <p className="font-semibold text-slate-100">
                  Atalho rápido – categorias da pesquisa de preços
                </p>
                <p className="text-[11px] text-slate-400">
                  Crie novas categorias e itens da pesquisa de preços sem
                  precisar sair desta tela. Isso alimenta diretamente o painel
                  de Rastreamento de Preços.
                </p>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-400">
                      Criar nova categoria de pesquisa
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newPriceCategoryName}
                        onChange={(e) =>
                          setNewPriceCategoryName(e.target.value)
                        }
                        placeholder="Ex.: Carnes bovinas especiais"
                        className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleQuickAddPriceCategory}
                        className="rounded-md border border-slate-700 px-3 py-1 text-[11px] text-slate-100 hover:border-emerald-500"
                      >
                        + Categoria
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[11px] text-slate-400">
                      Criar novo item dentro de uma categoria
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <select
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                        value={selectedPriceCategoryForSub}
                        onChange={(e) =>
                          setSelectedPriceCategoryForSub(e.target.value)
                        }
                      >
                        <option value="">Selecione a categoria</option>
                        {priceCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={newPriceSubcategoryName}
                        onChange={(e) =>
                          setNewPriceSubcategoryName(e.target.value)
                        }
                        placeholder="Ex.: Miolo da paleta (marca X)"
                        className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={handleQuickAddPriceSubcategory}
                        className="rounded-md border border-slate-700 px-3 py-1 text-[11px] text-slate-100 hover:border-emerald-500"
                      >
                        + Item
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumo / validação */}
              <div className="flex flex-wrap items-start justify-between gap-4 rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-200">
                <div>
                  <p>
                    Total dos itens:{" "}
                    <span className="font-semibold">
                      {formatCurrency(itemsTotal)}
                    </span>
                  </p>
                  {receipt.rawTotalFromReceipt !== undefined && (
                    <p>
                      Total do cupom:{" "}
                      <span className="font-semibold">
                        {formatCurrency(receipt.rawTotalFromReceipt)}
                      </span>
                    </p>
                  )}
                  {receipt.rawTotalFromReceipt !== undefined &&
                    Math.abs(itemsTotal - receipt.rawTotalFromReceipt) >=
                      0.01 && (
                      <p className="text-amber-200">
                        Diferença:{" "}
                        {formatCurrency(
                          itemsTotal - receipt.rawTotalFromReceipt,
                        )}
                      </p>
                    )}
                  <p className="mt-1 text-xs text-slate-400">
                    {warningMessage
                      ? warningMessage
                      : Math.abs(itemsTotal - cupomTotal) < 0.01
                        ? "Total do cupom confere com a soma dos itens."
                        : "A soma dos itens difere do total do cupom. Ajuste antes de salvar se necessario."}
                  </p>
                  {warningList.length > 1 && (
                    <ul className="mt-1 list-disc pl-5 text-xs text-amber-200">
                      {warningList.slice(1).map((w, idx) => (
                        <li key={idx}>{w}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="max-w-xs space-y-2 text-xs text-slate-400">
                  <p>
                    • O botão <span className="font-semibold">Salvar</span> cria
                    apenas uma saída agregada, usando o total do cupom.
                  </p>
                  <p>
                    • As categorias dos itens servem para organizar a saída e
                    também para associar com a pesquisa de preços.
                  </p>
                </div>
              </div>

              {/* Botões finais */}
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-emerald-500"
                  onClick={resetAndClose}
                >
                  Cancelar
                </button>

                <button
                  className="rounded-md border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-500"
                  onClick={handleSavePerItem}
                >
                  Salvar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
