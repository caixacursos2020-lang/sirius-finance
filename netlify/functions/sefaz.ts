import { load, type CheerioAPI } from "cheerio";

type ReceiptItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type ReceiptPayload = {
  storeName: string;
  date: string;
  total: number;
  items: ReceiptItem[];
  rawText?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const cleanText = (value: string) =>
  value.replace(/\s+/g, " ").trim();

const parseNumber = (value: string) => {
  const cleaned = value.replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) return undefined;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    const normalized = cleaned.replace(/\./g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  const normalized = cleaned.replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const parseDateFromText = (value: string) => {
  const match = value.match(/(\d{2})[\/.-](\d{2})[\/.-](\d{2,4})/);
  if (!match) return undefined;
  const [, day, month, yearRaw] = match;
  const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
  return `${year}-${month}-${day}`;
};

const findValueByLabels = (
  $: CheerioAPI,
  labels: string[],
) => {
  const labelSet = labels.map(normalizeText);
  const nodes = $("td, span, strong, label, div").toArray();
  for (const node of nodes) {
    const text = normalizeText($(node).text());
    if (!text) continue;
    const matched = labelSet.some((label) => text.startsWith(label));
    if (!matched) continue;

    const nextText = cleanText($(node).next().text());
    if (nextText) return nextText;

    const parentNextText = cleanText($(node).parent().next().text());
    if (parentNextText) return parentNextText;

    const parentText = cleanText($(node).parent().text());
    if (parentText && parentText !== cleanText($(node).text())) {
      const cleaned = parentText.replace(cleanText($(node).text()), "").trim();
      if (cleaned) return cleaned;
    }
  }
  return undefined;
};

const findNumberByLabels = (
  $: CheerioAPI,
  labels: string[],
) => {
  const value = findValueByLabels($, labels);
  if (value) {
    const parsed = parseNumber(value);
    if (parsed !== undefined) return parsed;
  }

  const bodyText = normalizeText($("body").text());
  for (const label of labels.map(normalizeText)) {
    const idx = bodyText.indexOf(label);
    if (idx < 0) continue;
    const slice = bodyText.slice(idx, idx + 120);
    const match = slice.match(/(\d+[.,]\d{2})/);
    if (match) {
      const parsed = parseNumber(match[1]);
      if (parsed !== undefined) return parsed;
    }
  }
  return undefined;
};

const findDateByLabels = (
  $: CheerioAPI,
  labels: string[],
) => {
  const value = findValueByLabels($, labels);
  if (value) {
    const parsed = parseDateFromText(value);
    if (parsed) return parsed;
  }
  const bodyText = $("body").text();
  return parseDateFromText(bodyText);
};

const extractItemsFromTable = ($: CheerioAPI) => {
  const items: ReceiptItem[] = [];

  $("table").each((_, table) => {
    const rows = $(table).find("tr");
    if (rows.length < 2) return;

    const headerCells = rows
      .first()
      .find("th, td")
      .toArray()
      .map((cell) => normalizeText($(cell).text()));

    const findHeaderIndex = (keywords: string[]) =>
      headerCells.findIndex((text) =>
        keywords.some((keyword) => text.includes(keyword)),
      );

    const descIdx = findHeaderIndex(["descr", "produto", "item"]);
    const qtyIdx = findHeaderIndex(["qtd", "quant"]);
    const unitIdx = findHeaderIndex(["unit", "vl unit"]);
    const totalIdx = findHeaderIndex(["total", "vl total"]);

    if (descIdx < 0 || totalIdx < 0) return;

    rows.slice(1).each((_, row) => {
      const cells = $(row).find("td");
      if (cells.length === 0) return;
      const descText = cleanText(
        (cells.eq(descIdx).text() || cells.eq(0).text()).toString(),
      );
      if (!descText) return;

      const qtyText = cells.eq(qtyIdx).text();
      const unitText = cells.eq(unitIdx).text();
      const totalText = cells.eq(totalIdx).text();

      const quantity = parseNumber(qtyText) ?? 1;
      const total = parseNumber(totalText) ?? 0;
      const unitPrice =
        parseNumber(unitText) ?? (quantity ? total / quantity : total);

      items.push({
        description: descText,
        quantity,
        unitPrice,
        total,
      });
    });
  });

  return items;
};

const extractItemsFromBlocks = ($: CheerioAPI) => {
  const items: ReceiptItem[] = [];
  const blocks = $(".txtTit, .txtTit2").toArray();
  blocks.forEach((block) => {
    const description = cleanText($(block).text());
    if (!description) return;

    const container = $(block).closest("tr, li, div");
    const qtyText = container.find(".Rqtd, .qtd, .qtde").first().text();
    const unitText = container
      .find(".RvlUnit, .vlUnit, .valorUnit")
      .first()
      .text();
    const totalText = container
      .find(".RvlTotal, .vlItem, .valorTotal")
      .first()
      .text();

    const quantity = parseNumber(qtyText) ?? 1;
    const total = parseNumber(totalText) ?? 0;
    const unitPrice =
      parseNumber(unitText) ?? (quantity ? total / quantity : total);

    items.push({
      description,
      quantity,
      unitPrice,
      total,
    });
  });

  return items;
};

const extractItems = ($: CheerioAPI) => {
  const fromTable = extractItemsFromTable($);
  if (fromTable.length) return fromTable;
  return extractItemsFromBlocks($);
};

const findStoreName = ($: CheerioAPI) => {
  const candidates = [
    cleanText($("h1").first().text()),
    cleanText($("h2").first().text()),
    cleanText($(".txtCenter, .txtcentral, .txtcenter").first().text()),
    findValueByLabels($, [
      "nome/razao social",
      "nome",
      "razao social",
      "emitente",
    ]) || "",
  ];

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate);
    if (!candidate) continue;
    if (
      normalized.includes("consulta") ||
      normalized.includes("nfce") ||
      normalized.includes("sefaz") ||
      normalized.includes("danfe")
    ) {
      continue;
    }
    if (candidate.length >= 3) return candidate;
  }
  return "Cupom";
};

const buildReceipt = ($: CheerioAPI, url: string): ReceiptPayload | null => {
  const items = extractItems($);
  if (!items.length) return null;

  const storeName = findStoreName($);
  const date =
    findDateByLabels($, ["data de emissao", "data emissao", "data"]) ||
    new Date().toISOString().slice(0, 10);

  const total =
    findNumberByLabels($, [
      "valor total",
      "total",
      "valor a pagar",
      "valor pago",
    ]) ?? items.reduce((sum, item) => sum + item.total, 0);

  return {
    storeName,
    date,
    total: Number(total.toFixed(2)),
    items,
    rawText: `Importado via QR Sefaz: ${url}`,
  };
};

export const handler = async (event: {
  httpMethod?: string;
  body?: string | null;
}) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: "Metodo nao permitido." }),
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: "Body ausente." }),
    };
  }

  let payload: { url?: string };
  try {
    payload = JSON.parse(event.body) as { url?: string };
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, error: "JSON invalido." }),
    };
  }

  const url = payload.url?.trim();
  if (!url) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: "URL do QR code nao informada.",
      }),
    };
  }

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          error: "Falha ao acessar a pagina da Sefaz.",
        }),
      };
    }

    const html = await response.text();
    const $ = load(html);

    const receipt = buildReceipt($, url);
    if (!receipt) {
      return {
        statusCode: 422,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          error:
            "Nao foi possivel extrair itens dessa nota (Sefaz bloqueou ou mudou layout).",
        }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ ok: true, receipt }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        error: "Erro ao consultar a Sefaz.",
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
