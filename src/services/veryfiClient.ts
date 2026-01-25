import { type ReceiptSummary } from "../types/finance";

type VeryfiLineItem = {
  id?: string | number;
  description?: string;
  quantity?: number | string | null;
  unit_price?: number | string | null;
  total?: number | string | null;
  line_total?: number | string | null;
  [key: string]: unknown;
};

type VeryfiDocument = {
  vendor?: { name?: string; address?: string };
  store?: string;
  merchant_name?: string;
  date?: string | null;
  created_date?: string | null;
  ocr_date?: string | null;
  total?: number | string | null;
  subtotal?: number | string | null;
  total_amount?: number | string | null;
  currency_code?: string | null;
  currency?: string | null;
  line_items?: VeryfiLineItem[] | null;
  items?: VeryfiLineItem[] | null;
  suggested_category?: string | null;
  suggestedCategory?: string | null;
  [key: string]: unknown;
};

type VeryfiProxyResponse = {
  ok?: boolean;
  message?: string;
  summary?: ReceiptSummary;
  data?: VeryfiDocument;
  document?: VeryfiDocument;
  veryfi?: VeryfiDocument;
  [key: string]: unknown;
};

const stripDataUrlPrefix = (value: string) => {
  const marker = "base64,";
  const idx = value.indexOf(marker);
  return idx >= 0 ? value.slice(idx + marker.length) : value;
};

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      resolve(stripDataUrlPrefix(result));
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo do cupom."));
    reader.readAsDataURL(file);
  });

const normalizeNumber = (value: unknown): number | undefined => {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const normalized = value.replace(".", "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const mapVeryfiDocumentToSummary = (document: VeryfiDocument): ReceiptSummary => {
  const itemsRaw = Array.isArray(document.line_items)
    ? document.line_items
    : Array.isArray(document.items)
      ? document.items
      : [];

  const items = itemsRaw.map((item, idx) => {
    const quantity = normalizeNumber(item.quantity ?? (item as any).qty) ?? 1;
    const safeQuantity = quantity > 0 ? quantity : 1;
    const total =
      normalizeNumber(item.total ?? item.line_total ?? (item as any).line_total) ?? 0;
    const unit =
      normalizeNumber(item.unit_price ?? (item as any).unit_price) ??
      (safeQuantity ? total / safeQuantity : total);

    return {
      id: item.id ?? idx,
      description: (item.description ?? "Item").toString(),
      quantity: safeQuantity,
      unit_price: unit,
      total: total || unit * safeQuantity,
    };
  });

  const itemsTotal = items.reduce((acc, item) => acc + item.total, 0);
  const total_amount =
    normalizeNumber(document.total ?? document.total_amount ?? document.subtotal) ??
    itemsTotal;

  return {
    store:
      document.vendor?.name ||
      document.vendor?.address ||
      document.store ||
      document.merchant_name ||
      "Cupom",
    purchase_date:
      document.date || document.created_date || document.ocr_date || new Date().toISOString(),
    total_amount,
    currency: document.currency_code ?? document.currency ?? undefined,
    items,
    suggestedCategory: document.suggested_category ?? document.suggestedCategory ?? null,
  };
};

const isReceiptSummary = (value: unknown): value is ReceiptSummary => {
  if (!value || typeof value !== "object") return false;
  const summary = value as ReceiptSummary;
  return (
    typeof summary.store === "string" &&
    typeof summary.purchase_date === "string" &&
    Array.isArray(summary.items)
  );
};

export async function scanReceiptWithVeryfi(file: File): Promise<ReceiptSummary> {
  const fileDataBase64 = await fileToBase64(file);

  const response = await fetch("/.netlify/functions/veryfi-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file.name || "receipt.jpg",
      fileDataBase64,
    }),
  });

  let payload: VeryfiProxyResponse | null = null;
  try {
    payload = (await response.json()) as VeryfiProxyResponse;
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload?.message ||
      `Erro ao enviar cupom: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  if (payload?.ok === false) {
    throw new Error(payload.message || "Falha ao processar o cupom na Veryfi.");
  }

  if (payload?.summary && isReceiptSummary(payload.summary)) {
    return payload.summary;
  }

  const document =
    payload?.data ||
    payload?.document ||
    payload?.veryfi ||
    (payload as VeryfiDocument | null);

  if (!document) {
    throw new Error("Resposta inválida do proxy Veryfi.");
  }

  return mapVeryfiDocumentToSummary(document);
}
