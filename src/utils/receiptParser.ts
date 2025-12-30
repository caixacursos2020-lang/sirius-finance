import { v4 as uuid } from "uuid";

export type ParsedReceiptItem = {
  id: string;
  descricao: string;
  valor: number; // em reais
  rawLinha: string;
  suspeito?: boolean;
  categoriaSugerida?: string;
};

export type ParsedReceipt = {
  loja: string;
  data: string | null;
  totalCupom: number | null;
  itens: ParsedReceiptItem[];
  somaItens: number;
  diferenca: number;
};

const dateRegex = /(\d{2}\/\d{2}\/\d{2,4})/;
const totalRegex =
  /(VALOR A PAGAR|VALOR A PAGAR R\$|VALOR A PAGAR R\$?|TOTAL A PAGAR|TOTAL\s*R\$|TOTAL)\s*R?\$?\s*([\d.,]+)/i;
const headerRegex = /(CODIGO|CÓDIGO).*(DESCRICAO|DESCRIÇÃO)/i;
const footerRegex = /(QTDE\.?|QTD\.?)\s*TOTAL\s*DE\s*ITENS/i;
const priceAtEndRegex = /(\d+[.,]\d{2})\s*$/;

const categoriaPorPalavra: Record<string, string> = {
  CARNE: "Mercado",
  FILE: "Mercado",
  FRANGO: "Mercado",
  LEITE: "Mercado",
  ARROZ: "Mercado",
  FEIJAO: "Mercado",
  BIS: "Mercado",
  ROUPA: "Presentes",
  ROUP: "Presentes",
  GASOLINA: "Gasolina",
  ETANOL: "Gasolina",
  DIESEL: "Gasolina",
  PET: "Pet",
  RACAO: "Pet",
  RACA: "Pet",
};

function normalizarDescricao(input: string) {
  return input.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

export function parseBRL(valueStr: string): number {
  const clean = valueStr.replace(/[^\d,.-]/g, "").trim();
  if (!clean) return 0;

  const match = clean.match(/(\d+[.,]\d{2})/);
  if (match) {
    const normalized = match[1].replace(/\./g, "").replace(",", ".");
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  const digits = clean.replace(/\D/g, "");
  if (!digits) return 0;
  if (digits.length <= 2) return Number(digits) / 100;

  const normalized = `${digits.slice(0, -2)}.${digits.slice(-2)}`;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function sugerirCategoria(descricao: string): string | undefined {
  const upper = normalizarDescricao(descricao);
  for (const [palavra, categoria] of Object.entries(categoriaPorPalavra)) {
    if (upper.includes(palavra)) return categoria;
  }
  return undefined;
}

export function parseReceiptText(rawText: string): ParsedReceipt {
  const linhas = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let loja = "";
  let data: string | null = null;
  let totalCupom: number | null = null;

  for (const linha of linhas) {
    const upper = normalizarDescricao(linha);
    if (!loja && !upper.includes("CNPJ") && upper.replace(/\W/g, "").length >= 10) {
      loja = linha;
    }

    const dMatch = linha.match(dateRegex);
    if (!data && dMatch) {
      data = dMatch[1];
    }

    const tMatch = linha.match(totalRegex);
    if (tMatch) {
      totalCupom = parseBRL(tMatch[2]);
    }
  }

  let start = 0;
  let end = linhas.length;

  const headerIndex = linhas.findIndex((l) => headerRegex.test(l));
  if (headerIndex >= 0) start = headerIndex + 1;

  const footerIndex = linhas.findIndex((l) => footerRegex.test(l));
  if (footerIndex >= 0) end = footerIndex;

  const linhasItens = linhas.slice(start, end);

  const itens: ParsedReceiptItem[] = [];
  let descricaoAcumulada = "";

  for (const linha of linhasItens) {
    const match = linha.match(priceAtEndRegex);

    if (!match) {
      descricaoAcumulada = (descricaoAcumulada + " " + linha).trim();
      continue;
    }

    const rawValor = match[1];
    const valor = parseBRL(rawValor);

    let descParte = linha.slice(0, match.index).trim();
    descParte = descParte.replace(/\b\d+[.,]?\d*\s*(UN|UNID|KG|G|L)\b.*$/i, "").trim();

    const descricaoFinal = (descricaoAcumulada + " " + descParte).trim();
    descricaoAcumulada = "";

    if (!descricaoFinal) continue;

    const categoriaSugerida = sugerirCategoria(descricaoFinal);

    itens.push({
      id: uuid(),
      descricao: descricaoFinal,
      valor,
      rawLinha: linha,
      categoriaSugerida,
    });
  }

  let somaItens = 0;
  for (const item of itens) {
    somaItens += item.valor;
  }

  let diferenca = 0;
  if (totalCupom != null) {
    diferenca = Number((somaItens - totalCupom).toFixed(2));
  }

  for (const item of itens) {
    if ((totalCupom != null && item.valor > totalCupom * 1.2) || item.valor > 500) {
      item.suspeito = true;
    }
  }

  return {
    loja: loja || "Loja não identificada",
    data,
    totalCupom,
    itens,
    somaItens: Number(somaItens.toFixed(2)),
    diferenca,
  };
}
