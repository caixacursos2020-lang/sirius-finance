// netlify/functions/scan-receipt.mts
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { Handler } from "@netlify/functions";

const apiKey = process.env.GOOGLE_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

const systemInstruction = `
Voce e um extrator de dados de cupons fiscais brasileiros (OCR + estruturacao).
Pense passo a passo internamente, mas RETORNE APENAS JSON valido.

Formato EXATO da resposta (sem markdown, sem crases):
{
  "storeName": "string | null",
  "date": "YYYY-MM-DD | null",
  "total": number | null,
  "items": [
    { "description": "string", "quantity": number | null, "unitPrice": number | null, "total": number | null }
  ]
}

Regras importantes:
- Nao invente itens. Se estiver ilegivel, use "ITEM ILEGIVEL" na description (nunca deixe vazio).
- Tente preservar o texto do item como aparece no cupom, mas:
  - Se tiver alta confianca, expanda abreviacoes comuns (ex: FILE -> FILE/FILETE/FILÉ, FR -> FRANGO).
  - Use acentos quando tiver certeza (PT-BR).
- Descontos: se houver uma linha "DESCONTO" logo abaixo de um item, aplique o desconto no item anterior (reduzindo o total do item).
  Se nao for possivel associar com seguranca, voce pode retornar como item separado "DESCONTO (geral)".
- "total" deve ser o total final pago (apos descontos), quando existir no cupom.
- Se faltar algum valor, use null (nao use string em campo numerico).
`;

const userPrompt = `
Extraia os dados do cupom fiscal da imagem.
Retorne somente o JSON no formato exigido.
`;

function coerceNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const cleaned = value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^R\$\s*/i, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function isDiscountItem(item: {
  description: string;
  quantity: number | null;
  unitPrice: number | null;
  total: number | null;
}): boolean {
  const desc = item.description.trim().toUpperCase();
  if (!desc) return false;
  if (!desc.startsWith("DESCONTO")) return false;
  if (item.total === null) return false;
  return item.total < 0;
}

function normalizeReceipt(parsed: any) {
  const out: {
    storeName: string | null;
    date: string | null;
    total: number | null;
    items: Array<{
      description: string;
      quantity: number | null;
      unitPrice: number | null;
      total: number | null;
    }>;
  } = {
    storeName: typeof parsed?.storeName === "string" ? parsed.storeName : null,
    date: typeof parsed?.date === "string" ? parsed.date : null,
    total: coerceNumber(parsed?.total),
    items: [],
  };

  const rawItems = Array.isArray(parsed?.items) ? parsed.items : [];
  out.items = rawItems.map((it: any) => {
    const descriptionRaw = typeof it?.description === "string" ? it.description : "";
    const description = descriptionRaw.trim() || "ITEM ILEGIVEL";
    const quantity = coerceNumber(it?.quantity);
    const unitPrice = coerceNumber(it?.unitPrice);
    let total = coerceNumber(it?.total);
    if (total === null && unitPrice !== null && quantity !== null && quantity > 0) {
      total = Number((unitPrice * quantity).toFixed(2));
    }
    return { description, quantity, unitPrice, total };
  });

  // Junta linhas de DESCONTO (que aparecem logo abaixo do item) ao item anterior.
  const merged: typeof out.items = [];
  for (const item of out.items) {
    if (isDiscountItem(item) && merged.length > 0) {
      const prev = merged[merged.length - 1];
      const discountTotal = item.total ?? 0;
      const prevTotal = prev.total;

      // So associa se o desconto "cabe" no total do item anterior (evita pegar desconto geral do rodape).
      if (prevTotal !== null && prevTotal > 0 && Math.abs(discountTotal) <= prevTotal + 0.01) {
        const nextTotal = Number((prevTotal + discountTotal).toFixed(2));
        prev.total = nextTotal;

        // Ajusta unitPrice quando der.
        if (prev.quantity !== null && prev.quantity > 0) {
          prev.unitPrice = Number((nextTotal / prev.quantity).toFixed(2));
        }
        continue; // remove a linha de desconto da lista
      }

      // Nao deu para associar com seguranca -> deixa mais explicito.
      merged.push({ ...item, description: "DESCONTO (geral)" });
      continue;
    }
    merged.push(item);
  }

  out.items = merged;

  // Se nao veio total, tenta calcular pela soma.
  if (out.total === null && out.items.length) {
    const sum = out.items.reduce((acc, it) => acc + (it.total ?? 0), 0);
    out.total = Number(sum.toFixed(2));
  }

  return out;
}

function isPoorExtraction(parsed: any): boolean {
  const items = parsed?.items;
  if (!Array.isArray(items) || items.length === 0) return true;

  const normalized = items.map((it: any) => String(it?.description ?? "").trim());
  const emptyOrBad = normalized.filter((d: string) => !d || d.length < 3 || d === "ITEM ILEGIVEL").length;

  // Se mais de 30% vier vazio/ilegivel, considera ruim e tenta outro modelo.
  return emptyOrBad / Math.max(1, normalized.length) > 0.3;
}

// Gemini 1.5 foi descontinuado (shut down). Use 2.5+.
// Mantemos fallback para aumentar chance de funcionar com diferentes contas/tiers.
const MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
];

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API Key não configurada no servidor" }),
      headers: { "Content-Type": "application/json" },
    };
  }

  let imageBase64Raw: string | undefined;
  let mimeType = "image/jpeg";
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    imageBase64Raw = body?.imageBase64;
    if (typeof body?.mimeType === "string" && body.mimeType) mimeType = body.mimeType;
  } catch {
    imageBase64Raw = undefined;
  }

  if (!imageBase64Raw) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Nenhuma imagem enviada (imageBase64)." }),
      headers: { "Content-Type": "application/json" },
    };
  }

  const cleanBase64 = imageBase64Raw.replace(/^data:[^;]+;base64,?/, "").replace(/\s+/g, "");

  let lastError = "Falha ao processar o cupom";

  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction,
        generationConfig: {
          temperature: 0.2,
          topP: 0.9,
          // Garante espaco para lista grande de itens.
          maxOutputTokens: 2048,
        },
      });
      const result = await model.generateContent([
        userPrompt,
        {
          inlineData: {
            data: cleanBase64,
            mimeType,
          },
        },
      ]);

      let text = result.response.text();
      text = text.replace(/```json/gi, "").replace(/```/g, "").trim();

      try {
        const parsedRaw = JSON.parse(text);
        const normalized = normalizeReceipt(parsedRaw);
        if (isPoorExtraction(normalized)) {
          lastError = "A IA retornou poucos itens legiveis; tentando outro modelo...";
          continue;
        }

        return {
          statusCode: 200,
          body: JSON.stringify(normalized),
          headers: { "Content-Type": "application/json", "X-Gemini-Model": modelName },
        };
      } catch {
        lastError = "Resposta da IA não era JSON válido.";
        continue;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
        lastError = `Modelo ${modelName} indisponível: ${msg}`;
        continue;
      }
      lastError = msg;
      break;
    }
  }

  return {
    statusCode: 500,
    body: JSON.stringify({ error: lastError }),
    headers: { "Content-Type": "application/json" },
  };
};

export default handler;
