import { useEffect, useMemo, useState } from "react";
import { useCategories } from "../../contexts/CategoriesContext";
import { useFinance } from "../../contexts/FinanceContext";
import { readReceiptFromImage } from "../../services/receiptOcr";
import { uploadReceiptToVeryfi } from "../../services/veryfiApi";
import { type Receipt, type ReceiptSummary } from "../../types/finance";
import { formatCurrency, formatDate } from "../../utils/formatters";

type ReceiptImportModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

type Step = 1 | 2;

export default function ReceiptImportModal({ isOpen, onClose }: ReceiptImportModalProps) {
  const { categories } = useCategories();
  const { createExpensesFromReceipt } = useFinance();

  const [step, setStep] = useState<Step>(1);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [itemCategories, setItemCategories] = useState<Record<string, string | undefined>>({});
  const [statusLog, setStatusLog] = useState<string | null>(null);
  const [defaultCategoryId, setDefaultCategoryId] = useState<string | undefined>(undefined);

  const categoryNameById = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((cat) => {
      map[cat.id] = cat.name;
    });
    return map;
  }, [categories]);

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

  const categoryIdByName = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((cat) => {
      map.set(cat.name.toLowerCase(), cat.id);
    });
    return map;
  }, [categories]);

  const resolveSuggestedCategoryId = (suggestedName?: string, suggestedId?: string) => {
    if (suggestedId) return suggestedId;
    if (!suggestedName) return undefined;
    const id = categoryIdByName.get(suggestedName.toLowerCase());
    return id;
  };

  const findCategoryIdByKeyword = (keyword: string) => {
    const lower = keyword.toLowerCase();
    const match = categories.find((cat) => cat.name.toLowerCase().includes(lower));
    return match?.id;
  };

  useEffect(() => {
    if (!categories.length) return;
    const mercadoId = findCategoryIdByKeyword("mercado");
    if (!defaultCategoryId) {
      setDefaultCategoryId(mercadoId ?? categories[0]?.id);
    }
  }, [categories, defaultCategoryId]);

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

  useEffect(() => {
    if (!isOpen) {
      setStep(1);
      setSelectedFile(null);
      setReceipt(null);
      setError(null);
      setStatusLog(null);
      setItemCategories({});
      setIsLoading(false);
      setDefaultCategoryId(undefined);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleReadReceipt = async () => {
    if (!selectedFile) {
      setError("Selecione uma imagem do cupom antes de continuar.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setStatusLog("Lendo cupom localmente...");

    try {
      const parsed = await readReceiptFromImage(selectedFile);
      setReceipt(parsed);
      setStatusLog("Cupom lido com sucesso via OCR local.");
      setItemCategories({});
      setStep(2);
    } catch (err) {
      console.error("Erro ao ler cupom", err);
      setError("Nao foi possivel ler o cupom. Tente uma foto mais nitida.");
      setStatusLog(null);
    } finally {
      setIsLoading(false);
    }
  };

  const buildReceiptFromVeryfi = (summary: ReceiptSummary): Receipt => {
    const items = (summary.items || []).map((item) => {
      const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
      const total = Number(item.total ?? 0);
      const unit =
        item.unit_price !== undefined && item.unit_price !== null
          ? item.unit_price
          : qty
            ? total / qty
            : total;
      return {
        id: typeof item.id === "number" ? item.id.toString() : item.id || crypto.randomUUID(),
        description: item.description || "Item",
        quantity: qty,
        unitPrice: unit,
        unit_price: item.unit_price,
        total,
      };
    });

    const itemsTotal = Number(items.reduce((acc, it) => acc + it.total, 0).toFixed(2));

    return {
      id: crypto.randomUUID(),
      storeName: summary.store || "Cupom",
      date: summary.purchase_date ? summary.purchase_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      total: summary.total_amount ?? itemsTotal,
      items,
      rawText: "Importado via Veryfi",
      rawTotalFromReceipt: summary.total_amount ?? itemsTotal,
      itemsTotal,
      suggestedCategory: summary.suggestedCategory ?? null,
      warnings:
        Math.abs(itemsTotal - (summary.total_amount ?? itemsTotal)) > 0.05
          ? ["A soma dos itens difere do total retornado pela Veryfi."]
          : [],
    };
  };

  const handleReadReceiptVeryfi = async () => {
    if (!selectedFile) {
      setError("Selecione uma imagem do cupom antes de continuar.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setStatusLog("Cupom enviado para leitura...");

    try {
      const summary = await uploadReceiptToVeryfi(selectedFile);
      const parsed = buildReceiptFromVeryfi(summary);
      setReceipt(parsed);
      setItemCategories({});
      setStep(2);
      setStatusLog("Cupom lido com sucesso pela Veryfi.");
    } catch (err) {
      console.error("Erro Veryfi", err);
      const message =
        err instanceof Error ? err.message : "Erro desconhecido ao enviar para Veryfi.";
      setError(message);
      setStatusLog(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseDemo = () => {
    const demo: Receipt = {
      id: crypto.randomUUID(),
      storeName: "Mercado Sirius",
      date: new Date().toISOString().slice(0, 10),
      total: 129.45,
      items: [
        { id: crypto.randomUUID(), description: "Arroz 5kg", quantity: 1, unitPrice: 29.9, total: 29.9 },
        { id: crypto.randomUUID(), description: "Leite integral 12x1L", quantity: 1, unitPrice: 52.8, total: 52.8 },
        { id: crypto.randomUUID(), description: "Detergente neutro", quantity: 1, unitPrice: 7.5, total: 7.5 },
        { id: crypto.randomUUID(), description: "Carne bovina", quantity: 1, unitPrice: 39.25, total: 39.25 },
      ],
      rawText: "DEMO - Cupom de exemplo para testes",
    };
    setReceipt(demo);
    setStep(2);
    setError(null);
  };

  const handleCategoryChange = (itemId: string, categoryId?: string) => {
    setItemCategories((prev) => ({ ...prev, [itemId]: categoryId }));
  };

  const resetAndClose = () => {
    setStep(1);
    setSelectedFile(null);
    setReceipt(null);
    setError(null);
    setItemCategories({});
    onClose();
  };

  const handleSaveAggregate = () => {
    if (!receipt) return;
    const receiptToSave: Receipt = {
      ...receipt,
      total: cupomTotal || itemsTotal,
      itemsTotal,
      rawTotalFromReceipt: receipt.rawTotalFromReceipt ?? cupomTotal,
    };
    createExpensesFromReceipt({
      receipt: receiptToSave,
      mode: "aggregate",
      defaultCategoryId,
      categoryNameById,
    });
    resetAndClose();
  };

  const handleSavePerItem = () => {
    if (!receipt) return;
    const enrichedReceipt: Receipt = {
      ...receipt,
      total: cupomTotal || itemsTotal,
      itemsTotal,
      rawTotalFromReceipt: receipt.rawTotalFromReceipt ?? cupomTotal,
      items: receipt.items.map((item) => ({
        ...item,
        suggestedCategoryId: itemCategories[String(item.id)] ?? item.suggestedCategoryId,
      })),
    };

    createExpensesFromReceipt({
      receipt: enrichedReceipt,
      mode: "perItem",
      defaultCategoryId,
      categoryNameById,
    });
    resetAndClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-4xl rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase text-emerald-400 tracking-wide">Importar cupom (beta)</p>
            <h3 className="text-xl font-semibold">Digitalize seu cupom fiscal</h3>
            <p className="text-sm text-slate-400">
              Faca upload de uma foto do cupom ou use o modo demonstracao para testar.
            </p>
          </div>
          <button
            className="text-sm text-slate-400 hover:text-slate-100"
            onClick={resetAndClose}
          >
            Fechar
          </button>
        </div>

        <div className="mt-6">
          {step === 1 && (
            <div className="grid gap-4 md:grid-cols-[1.2fr,0.8fr]">
              <div className="rounded-lg border border-dashed border-slate-700 bg-slate-950/50 p-6 text-center">
                <p className="text-sm text-slate-300 font-medium">Selecione a imagem do cupom</p>
                <p className="text-xs text-slate-500 mt-1">
                  Formatos aceitos: JPG, JPEG, PNG. Prefira fotos nitidas e sem cortes.
                </p>

                <div className="mt-4 flex flex-col items-center gap-3">
                  <input
                    type="file"
                    accept="image/*,.jpg,.jpeg,.png"
                    className="hidden"
                    id="receipt-file"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      setSelectedFile(file ?? null);
                    }}
                  />
                  <label
                    htmlFor="receipt-file"
                    className="cursor-pointer rounded-md border border-slate-700 px-4 py-2 text-sm hover:border-emerald-500 hover:text-emerald-300"
                  >
                    Selecionar imagem do cupom
                  </label>
                  {selectedFile && (
                    <p className="text-xs text-slate-300">
                      Arquivo escolhido: <span className="font-semibold">{selectedFile.name}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-950/50 p-6">
                <p className="text-sm text-slate-200 font-medium">Opcoes</p>
                <button
                  className="w-full rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:opacity-60"
                  onClick={handleReadReceipt}
                  disabled={isLoading}
                >
                  {isLoading ? "Lendo cupom..." : "Ler cupom"}
                </button>
                <button
                  className="w-full rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold hover:bg-sky-500 disabled:opacity-60"
                  onClick={handleReadReceiptVeryfi}
                  disabled={isLoading}
                >
                  {isLoading ? "Enviando..." : "Digitalizar via Veryfi"}
                </button>
                <button
                  className="w-full rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-emerald-500"
                  onClick={handleUseDemo}
                  disabled={isLoading}
                >
                  Usar exemplo (modo demonstracao)
                </button>
                {isLoading && (
                  <p className="text-xs text-emerald-300">
                    Lendo cupom, isso pode levar alguns segundos...
                  </p>
                )}
                {statusLog && <p className="text-xs text-slate-300">{statusLog}</p>}
                {error && <p className="text-xs text-rose-300">{error}</p>}
                <div className="text-xs text-slate-500 space-y-1">
                  <p>Tire uma foto legivel do cupom, com os numeros bem visiveis.</p>
                  <p>Evite cortes e sombras fortes para melhor leitura.</p>
                </div>
                <p className="text-xs text-slate-500">
                  Dica: mantenha a foto plana, com boa iluminacao e o texto centralizado.
                </p>
              </div>
            </div>
          )}

          {step === 2 && receipt && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                <div>
                  <p className="text-xs uppercase text-slate-500">Loja</p>
                  <p className="text-lg font-semibold text-slate-100">{receipt.storeName}</p>
                  <p className="text-xs text-slate-500 mt-1">Data: {formatDate(receipt.date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase text-slate-500">Total do cupom</p>
                  <p className="text-xl font-semibold text-emerald-300">{formatCurrency(cupomTotal)}</p>
                  <p className="text-xs text-slate-500">
                    {receipt.items.length} itens | soma itens: {formatCurrency(itemsTotal)}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-900 text-slate-400">
                    <tr>
                      <th className="px-3 py-2 text-left">Descricao</th>
                      <th className="px-3 py-2 text-right">Qtd</th>
                      <th className="px-3 py-2 text-right">Valor unitario</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2 text-left">Categoria sugerida</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                    {receipt.items.map((item) => {
                      const suggestedId = resolveSuggestedCategoryId(
                        item.suggestedCategoryName,
                        item.suggestedCategoryId
                      );
                      const itemKey = String(item.id);
                      const value = itemCategories[itemKey] ?? suggestedId ?? "";
                      const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
                      const unitPrice =
                        item.unitPrice ??
                        item.unit_price ??
                        (quantity ? item.total / quantity : item.total);
                      return (
                        <tr
                          key={item.id}
                          className={item.suspect ? "bg-amber-500/10" : ""}
                          title={item.suspect ? "Valor suspeito" : undefined}
                        >
                          <td className="px-3 py-2 text-slate-100">
                            {item.description}
                            {item.suspect && (
                              <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-200">
                                Suspeito
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-200">
                            {quantity}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-200">
                            {formatCurrency(unitPrice)}
                          </td>
                          <td className="px-3 py-2 text-right text-rose-200">
                            {formatCurrency(item.total)}
                          </td>
                          <td className="px-3 py-2">
                            <select
                              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                              value={value}
                              onChange={(event) =>
                                handleCategoryChange(itemKey, event.target.value || undefined)
                              }
                            >
                              <option value="">Escolher categoria</option>
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {!receipt.items.length && (
                  <div className="p-4 text-sm text-amber-300">
                    Nao encontramos itens automaticamente. Revise o texto do cupom.
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-200">
                <div>
                  <p>
                    Total dos itens: <span className="font-semibold">{formatCurrency(itemsTotal)}</span>
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
                    Math.abs(itemsTotal - receipt.rawTotalFromReceipt) >= 0.01 && (
                      <p className="text-amber-200">
                        Diferença: {formatCurrency(itemsTotal - receipt.rawTotalFromReceipt)}
                      </p>
                    )}
                  <p className="text-xs text-slate-400">
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
                <div className="text-right text-xs text-slate-400">
                  <div className="mb-1 font-semibold text-slate-300">Categoria padrao</div>
                  <select
                    className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
                    value={defaultCategoryId ?? ""}
                    onChange={(event) =>
                      setDefaultCategoryId(event.target.value || undefined)
                    }
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

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-emerald-500"
                  onClick={resetAndClose}
                >
                  Cancelar
                </button>
                <button
                  className="rounded-md border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-500"
                  onClick={handleSaveAggregate}
                >
                  Salvar como saida unica
                </button>
                <button
                  className="rounded-md border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-100 hover:border-emerald-500"
                  onClick={handleSavePerItem}
                >
                  Salvar item a item (experimental)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
