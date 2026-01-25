import type { Receipt, ReceiptItem } from "../types/finance";

type SefazReceiptItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type SefazReceipt = {
  storeName: string;
  date: string;
  total: number;
  items: SefazReceiptItem[];
  rawText?: string;
};

type SefazResponse = {
  ok: boolean;
  receipt?: SefazReceipt;
  error?: string;
};

const normalizeNumber = (value: number | null | undefined) => {
  if (typeof value !== "number") return undefined;
  return Number.isFinite(value) ? value : undefined;
};

export async function readReceiptFromQrUrl(qrUrl: string): Promise<Receipt> {
  if (!qrUrl || !qrUrl.trim()) {
    throw new Error("URL do QR code invalida.");
  }

  const response = await fetch("/api/sefaz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: qrUrl }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      text || "Falha ao consultar a Sefaz. Tente novamente em instantes.",
    );
  }

  const data = (await response.json()) as SefazResponse;

  if (!data.ok || !data.receipt) {
    throw new Error(
      data.error ||
        "Nao foi possivel obter os dados da NFC-e. Tente novamente.",
    );
  }

  const receiptData = data.receipt;
  const items: ReceiptItem[] = receiptData.items.map((item, index) => {
    const quantity = item.quantity && item.quantity > 0 ? item.quantity : 1;
    const total = normalizeNumber(item.total) ?? 0;
    const unitPrice =
      normalizeNumber(item.unitPrice) ??
      (quantity ? total / quantity : total);

    return {
      id: crypto.randomUUID(),
      description: item.description || `Item ${index + 1}`,
      quantity,
      unitPrice,
      total,
    };
  });

  const itemsTotal = Number(
    items.reduce((sum, item) => sum + item.total, 0).toFixed(2),
  );
  const totalFromReceipt =
    normalizeNumber(receiptData.total) ?? itemsTotal;

  const warnings: string[] = [];
  if (Math.abs(itemsTotal - totalFromReceipt) > 0.05) {
    warnings.push(
      "A soma dos itens difere do total informado pela NFC-e. Revise antes de salvar.",
    );
  }

  return {
    id: crypto.randomUUID(),
    storeName: receiptData.storeName || "Cupom",
    date:
      receiptData.date ||
      new Date().toISOString().slice(0, 10),
    total: totalFromReceipt,
    items,
    rawText:
      receiptData.rawText ||
      "Importado via QR Code da Sefaz",
    rawTotalFromReceipt: totalFromReceipt,
    itemsTotal,
    warnings,
  };
}
