import Tesseract from "tesseract.js";
import { parseReceiptText, type ParsedReceipt } from "../utils/receiptParser";
import { type Receipt, type ReceiptItem } from "../types/finance";

type ParsedReceiptLineItem = {
  id?: string | number;
  descricao: string;
  valor: number;
  rawLinha: string;
  suspeito?: boolean;
  categoriaSugerida?: string;
};

const toISODate = (input?: string | null) => {
  if (!input) return new Date().toISOString().slice(0, 10);
  const [day, month, year] = input.split("/");
  if (!day || !month || !year) return new Date().toISOString().slice(0, 10);
  const paddedYear = year.length === 2 ? `20${year}` : year;
  return `${paddedYear}-${month}-${day}`;
};

const buildReceipt = (parsed: ParsedReceipt, rawText: string): Receipt => {
  const items: ReceiptItem[] = parsed.itens.map((item) => {
    const quantity = 1;
    const total = item.valor;
    const unitPrice = quantity ? total / quantity : total;
    const rawId = (item as ParsedReceiptLineItem).id;
    const id =
      rawId != null
        ? typeof rawId === "number"
          ? rawId.toString()
          : String(rawId)
        : crypto.randomUUID();
    return {
      id,
      description: item.descricao,
      quantity,
      unitPrice,
      total,
      isDiscount: item.valor < 0,
      suggestedCategoryId: undefined,
      suggestedCategoryName: item.categoriaSugerida,
      suspect: item.suspeito,
      rawLine: item.rawLinha,
    };
  });

  const itemsTotal = Number(
    items.reduce((sum, item) => sum + item.total, 0).toFixed(2)
  );
  const total = parsed.totalCupom ?? itemsTotal;

  const warnings: string[] = [];
  if (parsed.totalCupom !== null && Math.abs(parsed.diferenca) > 0.05) {
    warnings.push(
      `A soma dos itens (R$ ${itemsTotal.toFixed(
        2
      )}) difere do total do cupom (R$ ${parsed.totalCupom.toFixed(2)}). Revise linhas suspeitas.`
    );
  }

  const suspeitos = parsed.itens.filter((item) => item.suspeito);
  if (suspeitos.length) {
    warnings.push(
      `Valores suspeitos: ${suspeitos
        .map((i) => `"${i.descricao}" (${i.valor.toFixed(2)})`)
        .join(", ")}`
    );
  }

  return {
    id: crypto.randomUUID(),
    storeName: parsed.loja || "Cupom",
    cnpj: undefined,
    date: toISODate(parsed.data),
    total,
    items,
    rawText,
    rawTotalFromReceipt: parsed.totalCupom ?? undefined,
    itemsTotal,
    warnings,
  };
};

export async function ocrReceiptFromFile(file: File): Promise<ParsedReceipt> {
  const { data } = await Tesseract.recognize(file, "por", {
    tessedit_pageseg_mode: 6,
  });

  const rawText = data.text || "";
  return parseReceiptText(rawText);
}

export async function readReceiptFromImage(file: File): Promise<Receipt> {
  const { data } = await Tesseract.recognize(file, "por", {
    tessedit_pageseg_mode: 6,
  });
  const rawText = data.text || "";
  const parsed = parseReceiptText(rawText);

  console.group("OCR CUPOM FISCAL");
  console.log("Texto cru do OCR:", rawText);
  console.log("Resultado parseado:", parsed);
  console.groupEnd();

  return buildReceipt(parsed, rawText);
}
