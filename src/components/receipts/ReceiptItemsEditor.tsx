import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, LayoutGrid, Table2 } from "lucide-react";
import type { Receipt } from "../../types/finance";

type PriceCategory = {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
};

type Props = {
  receipt: Receipt;
  categories: { id: string; name: string }[];
  itemCategories: Record<string, string | undefined>;
  handleCategoryChange: (itemId: string, categoryId?: string) => void;

  priceCategories: PriceCategory[];
  priceCatSelections: Record<string, string>;
  setPriceCatSelections: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  priceSubSelections: Record<string, string>;
  setPriceSubSelections: React.Dispatch<React.SetStateAction<Record<string, string>>>;

  resolveSuggestedCategoryId: (suggestedName?: string, suggestedId?: string) => string | undefined;
  updateReceiptItem: (
    itemId: string,
    updater: (item: Receipt["items"][number]) => Receipt["items"][number],
  ) => void;
};

export default function ReceiptItemsEditor({
  receipt,
  categories,
  itemCategories,
  handleCategoryChange,
  priceCategories,
  priceCatSelections,
  setPriceCatSelections,
  priceSubSelections,
  setPriceSubSelections,
  resolveSuggestedCategoryId,
  updateReceiptItem,
}: Props) {
  const [view, setView] = useState<"cards" | "table">("cards");
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  const hasManyItems = receipt.items.length >= 12;

  const defaultViewHint = useMemo(() => {
    // Helpful hint for first impressions: cards feel better, but table is faster for many rows.
    if (!hasManyItems) return "Cards";
    return "Cards";
  }, [hasManyItems]);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40">
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span>Itens do cupom</span>
          <span className="rounded-full border border-slate-800 bg-slate-950/60 px-2 py-0.5 text-[10px] text-slate-400">
            {receipt.items.length} itens
          </span>
          <span className="hidden md:inline text-[10px] text-slate-500">
            Dica: {defaultViewHint} deixa mais gostoso de revisar.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView("cards")}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
              view === "cards"
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-600"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Cards
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
              view === "table"
                ? "border-emerald-400 bg-emerald-500/10 text-emerald-200"
                : "border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-600"
            }`}
          >
            <Table2 className="h-4 w-4" />
            Tabela
          </button>
        </div>
      </div>

      {view === "cards" ? (
        <div className="max-h-[55vh] overflow-y-auto p-3 space-y-3">
          {receipt.items.map((item) => {
            const suggestedId = resolveSuggestedCategoryId(
              item.suggestedCategoryName,
              item.suggestedCategoryId,
            );
            const itemKey = String(item.id);
            const categoryValue = itemCategories[itemKey] ?? suggestedId ?? "";

            const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
            const total = Number(item.total) || 0;
            const unitPrice =
              item.unitPrice ??
              (item as any).unit_price ??
              (quantity ? total / quantity : total);

            const currentPriceCatId = priceCatSelections[itemKey] ?? "";
            const currentPriceCat = priceCategories.find((c) => c.id === currentPriceCatId);
            const isExpanded = expandedItemId === itemKey;

            return (
              <div
                key={item.id}
                className={`rounded-2xl border bg-slate-950/35 p-3 shadow-sm ${
                  item.suspect ? "border-amber-700/60" : "border-slate-800"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Descrição
                      </p>
                      {item.suspect && (
                        <span className="inline-flex rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-200 border border-amber-700/40">
                          Valor suspeito
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => {
                        const next = e.target.value;
                        updateReceiptItem(itemKey, (it) => ({ ...it, description: next }));
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                      placeholder="Descrição do item"
                    />
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Total
                    </p>
                    <div className="relative mt-1 inline-block">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={Number(total.toFixed(2))}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const nextTotal = raw === "" ? 0 : Number(raw);
                          const safeTotal = Number.isFinite(nextTotal) ? nextTotal : total;
                          updateReceiptItem(itemKey, (it) => {
                            const q = it.quantity && it.quantity > 0 ? it.quantity : 1;
                            const nextUnit = q ? Number((safeTotal / q).toFixed(2)) : it.unitPrice;
                            return { ...it, total: safeTotal, unitPrice: nextUnit };
                          });
                        }}
                        className="w-32 rounded-xl border border-slate-800 bg-slate-950/70 pl-7 pr-3 py-2 text-right text-sm font-semibold text-rose-200 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Qtd
                    </p>
                    <input
                      type="number"
                      step="0.001"
                      inputMode="decimal"
                      value={quantity}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const nextQty = raw === "" ? 0 : Number(raw);
                        const safeQty = Number.isFinite(nextQty) ? nextQty : quantity;
                        updateReceiptItem(itemKey, (it) => {
                          const currentTotal = Number(it.total) || 0;
                          const baseQty = safeQty > 0 ? safeQty : 1;
                          const baseUnit =
                            typeof it.unitPrice === "number" && Number.isFinite(it.unitPrice)
                              ? it.unitPrice
                              : baseQty
                                ? currentTotal / baseQty
                                : currentTotal;
                          const nextTotal = Number((baseUnit * baseQty).toFixed(2));
                          return { ...it, quantity: safeQty, unitPrice: baseUnit, total: nextTotal };
                        });
                      }}
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-right text-sm text-slate-100 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Valor unitário
                    </p>
                    <div className="relative mt-1">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
                        R$
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={Number(Number(unitPrice || 0).toFixed(2))}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const nextUnit = raw === "" ? 0 : Number(raw);
                          const safeUnit = Number.isFinite(nextUnit) ? nextUnit : unitPrice;
                          updateReceiptItem(itemKey, (it) => {
                            const q = it.quantity && it.quantity > 0 ? it.quantity : 1;
                            const nextTotal = Number((safeUnit * q).toFixed(2));
                            return { ...it, unitPrice: safeUnit, total: nextTotal };
                          });
                        }}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/70 pl-7 pr-3 py-2 text-right text-sm text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Categoria (saída)
                    </p>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                      value={categoryValue}
                      onChange={(event) =>
                        handleCategoryChange(itemKey, event.target.value || undefined)
                      }
                    >
                      <option value="">Escolher</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setExpandedItemId((prev) => (prev === itemKey ? null : itemKey))}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-slate-600"
                  >
                    Pesquisa de preços
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  <p className="text-[10px] text-slate-500">opcional</p>
                </div>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                        <div className="grid gap-2 md:grid-cols-2">
                          <select
                            className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                            value={currentPriceCatId}
                            onChange={(event) => {
                              const next = event.target.value;
                              setPriceCatSelections((prev) => ({ ...prev, [itemKey]: next }));
                              setPriceSubSelections((prev) => ({ ...prev, [itemKey]: "" }));
                            }}
                          >
                            <option value="">Categoria da pesquisa</option>
                            {priceCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>

                          <select
                            className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500 disabled:opacity-60"
                            value={priceSubSelections[itemKey] ?? ""}
                            onChange={(event) => {
                              const next = event.target.value;
                              setPriceSubSelections((prev) => ({ ...prev, [itemKey]: next }));
                            }}
                            disabled={!currentPriceCatId}
                          >
                            <option value="">Item da pesquisa</option>
                            {currentPriceCat?.subcategories.map((sub) => (
                              <option key={sub.id} value={sub.id}>
                                {sub.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <p className="mt-2 text-[10px] text-slate-500">
                          Preencher isso ajuda a montar seu histórico de preços para comparação.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {!receipt.items.length && (
            <div className="p-4 text-sm text-amber-300">
              Não encontramos itens automaticamente. Revise o texto do cupom.
            </div>
          )}
        </div>
      ) : (
        // Fallback "modo tabela": mantemos o jeito antigo para quem prefere preencher rápido.
        <div className="max-h-[50vh] overflow-y-auto overflow-x-auto">
          <table className="min-w-full text-xs md:text-sm">
            <thead className="sticky top-0 z-10 bg-slate-900 text-slate-400">
              <tr>
                <th className="w-[35%] px-3 py-2 text-left">Descrição</th>
                <th className="w-[6rem] px-3 py-2 text-right">Qtd</th>
                <th className="w-[8rem] px-3 py-2 text-right">Valor unitário</th>
                <th className="w-[8rem] px-3 py-2 text-right">Total</th>
                <th className="w-[13rem] px-3 py-2 text-left">Categoria (saída)</th>
                <th className="min-w-[16rem] px-3 py-2 text-left">Pesquisa de preços</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/40">
              {receipt.items.map((item) => {
                const suggestedId = resolveSuggestedCategoryId(
                  item.suggestedCategoryName,
                  item.suggestedCategoryId,
                );
                const itemKey = String(item.id);
                const value = itemCategories[itemKey] ?? suggestedId ?? "";
                const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
                const total = Number(item.total) || 0;
                const unitPrice =
                  item.unitPrice ??
                  (item as any).unit_price ??
                  (quantity ? total / quantity : total);

                const currentPriceCatId = priceCatSelections[itemKey] ?? "";
                const currentPriceCat = priceCategories.find((c) => c.id === currentPriceCatId);

                return (
                  <tr
                    key={item.id}
                    className={item.suspect ? "bg-amber-500/10" : ""}
                    title={item.suspect ? "Valor suspeito" : undefined}
                  >
                    <td className="px-3 py-2 align-top text-slate-100">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => {
                          const next = e.target.value;
                          updateReceiptItem(itemKey, (it) => ({ ...it, description: next }));
                        }}
                        className="w-full rounded-md border border-slate-800 bg-slate-950/60 px-2 py-1 text-xs md:text-sm text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </td>
                    <td className="px-3 py-2 align-top text-right text-slate-200">
                      <input
                        type="number"
                        step="0.001"
                        inputMode="decimal"
                        value={quantity}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const nextQty = raw === "" ? 0 : Number(raw);
                          const safeQty = Number.isFinite(nextQty) ? nextQty : quantity;
                          updateReceiptItem(itemKey, (it) => {
                            const currentTotal = Number(it.total) || 0;
                            const baseQty = safeQty > 0 ? safeQty : 1;
                            const baseUnit =
                              typeof it.unitPrice === "number" && Number.isFinite(it.unitPrice)
                                ? it.unitPrice
                                : baseQty
                                  ? currentTotal / baseQty
                                  : currentTotal;
                            const nextTotal = Number((baseUnit * baseQty).toFixed(2));
                            return { ...it, quantity: safeQty, unitPrice: baseUnit, total: nextTotal };
                          });
                        }}
                        className="w-24 rounded-md border border-slate-800 bg-slate-950/60 px-2 py-1 text-right text-xs md:text-sm text-slate-100 outline-none focus:border-emerald-500"
                      />
                    </td>
                    <td className="px-3 py-2 align-top text-right text-slate-200">
                      <div className="relative inline-block">
                        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
                          R$
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={Number(Number(unitPrice || 0).toFixed(2))}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const nextUnit = raw === "" ? 0 : Number(raw);
                            const safeUnit = Number.isFinite(nextUnit) ? nextUnit : unitPrice;
                            updateReceiptItem(itemKey, (it) => {
                              const q = it.quantity && it.quantity > 0 ? it.quantity : 1;
                              const nextTotal = Number((safeUnit * q).toFixed(2));
                              return { ...it, unitPrice: safeUnit, total: nextTotal };
                            });
                          }}
                          className="w-28 rounded-md border border-slate-800 bg-slate-950/60 pl-6 pr-2 py-1 text-right text-xs md:text-sm text-slate-100 outline-none focus:border-emerald-500"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top text-right text-rose-200">
                      <div className="relative inline-block">
                        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500">
                          R$
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          value={Number(total.toFixed(2))}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const nextTotal = raw === "" ? 0 : Number(raw);
                            const safeTotal = Number.isFinite(nextTotal) ? nextTotal : total;
                            updateReceiptItem(itemKey, (it) => {
                              const q = it.quantity && it.quantity > 0 ? it.quantity : 1;
                              const nextUnit = q ? Number((safeTotal / q).toFixed(2)) : it.unitPrice;
                              return { ...it, total: safeTotal, unitPrice: nextUnit };
                            });
                          }}
                          className="w-28 rounded-md border border-slate-800 bg-slate-950/60 pl-6 pr-2 py-1 text-right text-xs md:text-sm text-rose-200 outline-none focus:border-emerald-500"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
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
                    <td className="px-3 py-2 align-top">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex flex-col gap-1 sm:flex-row">
                          <select
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                            value={currentPriceCatId}
                            onChange={(event) => {
                              const next = event.target.value;
                              setPriceCatSelections((prev) => ({ ...prev, [itemKey]: next }));
                              setPriceSubSelections((prev) => ({ ...prev, [itemKey]: "" }));
                            }}
                          >
                            <option value="">Categoria da pesquisa</option>
                            {priceCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>

                          <select
                            className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100"
                            value={priceSubSelections[itemKey] ?? ""}
                            onChange={(event) => {
                              const next = event.target.value;
                              setPriceSubSelections((prev) => ({ ...prev, [itemKey]: next }));
                            }}
                            disabled={!currentPriceCatId}
                          >
                            <option value="">Item da pesquisa</option>
                            {currentPriceCat?.subcategories.map((sub) => (
                              <option key={sub.id} value={sub.id}>
                                {sub.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

