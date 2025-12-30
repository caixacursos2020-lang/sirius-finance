/* eslint-disable @typescript-eslint/no-explicit-any */
import { type ReceiptSummary } from "../types/finance";

export interface VeryfiItem {
  id: string | number;
  descricao?: string;
  quantidade?: number | string | null;
  valorUnitario?: number | string | null;
  total?: number | string | null;
  unit_price?: number | string | null;
  line_total?: number | string | null;
  [key: string]: unknown;
}

export interface VeryfiSummary {
  loja?: string;
  data_compra: string | null;
  total_cupom?: number | string | null;
  moeda?: string | null;
  itens?: VeryfiItem[];
  total_itens?: number | string | null;
  suggestedCategory?: string | null;
}

export interface VeryfiResponse {
  ok: boolean;
  raw: any;
  summary: VeryfiSummary;
  message?: string;
}

const normalizeNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const normalized = value.replace(".", "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const mapVeryfiSummaryToReceipt = (summary: VeryfiSummary): ReceiptSummary => {
  const items = (summary.itens || []).map((item, idx) => {
    const quantity =
      normalizeNumber(item.quantidade ?? (item as any).quantity) ?? 1;
    const safeQuantity = quantity > 0 ? quantity : 1;
    const total =
      normalizeNumber(item.total ?? item.line_total ?? (item as any).line_total) ??
      0;
    const unitRaw =
      normalizeNumber(item.valorUnitario ?? item.unit_price ?? (item as any).unit_price) ??
      (safeQuantity ? total / safeQuantity : total);

    return {
      id: item.id ?? idx,
      description: (item.descricao ?? (item as any).description ?? "Item").toString(),
      quantity: safeQuantity,
      unit_price: unitRaw,
      total: total || unitRaw * safeQuantity,
    };
  });

  const itemsTotal = items.reduce((acc, item) => acc + item.total, 0);
  const total_amount =
    normalizeNumber(summary.total_cupom ?? summary.total_itens) ?? itemsTotal;

  return {
    store: summary.loja ?? "Cupom",
    purchase_date: summary.data_compra ?? new Date().toISOString(),
    total_amount,
    currency: summary.moeda ?? undefined,
    items,
    suggestedCategory: (summary as any).suggestedCategory ?? (summary as any).suggested_category ?? null,
  };
};

export async function uploadReceiptToVeryfi(file: File): Promise<ReceiptSummary> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("http://localhost:3333/api/veryfi/receipt", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const message = `Erro ao enviar cupom: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  const data = (await response.json()) as VeryfiResponse;

  if (!data.ok || !data.summary) {
    throw new Error(data.message || "Resposta invalida do backend Veryfi");
  }

  return mapVeryfiSummaryToReceipt(data.summary);
}
