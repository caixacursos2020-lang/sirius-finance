export type ReceiptLineType =
  | "item"
  | "discount"
  | "total"
  | "paid"
  | "change"
  | "payment_method"
  | "header"
  | "footer"
  | "unknown";

export interface ParsedReceiptItem {
  description: string;
  value: number; // sempre em reais, com ponto como decimal (ex: 19.99)
  isDiscount?: boolean;
}

export interface ParsedReceipt {
  storeName?: string;
  date?: string;
  rawTotalFromReceipt?: number; // total lido da linha "Total"
  itemsTotal?: number; // soma dos itens validos
  items: ParsedReceiptItem[];
  warnings: string[]; // ex: diferenca entre total e soma dos itens
  rawText: string; // texto cru retornado pelo OCR (debug)
}

/**
 * Converte um texto de valor no padrao brasileiro para numero JS.
 * Ex: "R$ 23,14" -> 23.14
 */
export function parseBrazilianMoney(text: string): number | null {
  const clean = text
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "") // remove separador de milhar
    .replace(",", ".");
  const num = Number(clean);
  return Number.isFinite(num) ? num : null;
}

/**
 * Classifica uma linha de texto do cupom por tipo.
 */
export function classifyReceiptLine(line: string): ReceiptLineType {
  const text = line.toLowerCase();

  if (!text.trim()) return "unknown";

  // Cabecalho / loja / endereco
  if (
    text.includes("cnpj") ||
    text.includes("documento auxiliar") ||
    text.includes("consumidor") ||
    text.includes("inscric") ||
    text.includes("telefone") ||
    text.includes("fone")
  ) {
    return "header";
  }

  // Total do cupom
  if (
    text.includes("total a pagar") ||
    text.startsWith("total :") ||
    text.startsWith("total:") ||
    text.includes("valor total r$") ||
    /^total\s+r?\$?/i.test(line)
  ) {
    return "total";
  }

  // Valor pago
  if (
    text.includes("valor pago") ||
    text.includes("total pago") ||
    text.includes("valor pago r$")
  ) {
    return "paid";
  }

  // Troco
  if (text.includes("troco")) {
    return "change";
  }

  // Forma de pagamento
  if (
    text.includes("forma de pagamento") ||
    text.includes("cartao debito") ||
    text.includes("cartao credito") ||
    text.includes("dinheiro") ||
    text.includes("pix")
  ) {
    return "payment_method";
  }

  // Linhas de desconto
  if (text.includes("desconto")) {
    return "discount";
  }

  // Tentativa de detectar itens (descricao + valor)
  const hasNumber = /\d/.test(text);
  const hasPricePattern =
    /r?\$\s*\d+[.,]\d{2}/i.test(line) || /\d+[.,]\d{2}\s*$/.test(line);

  if (hasNumber && hasPricePattern) {
    return "item";
  }

  return "unknown";
}

/**
 * Funcao principal de parsing: recebe o texto cru do OCR
 * e devolve os itens validos + total + avisos.
 */
export function parseReceiptText(rawText: string): ParsedReceipt {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const items: ParsedReceiptItem[] = [];
  const warnings: string[] = [];

  let storeName: string | undefined;
  let receiptDate: string | undefined;
  let rawTotalFromReceipt: number | undefined;
  let lastItem: ParsedReceiptItem | null = null;

  lines.forEach((line, index) => {
    const type = classifyReceiptLine(line);

    // Tentar capturar nome da loja nas primeiras linhas
    if (index <= 3 && !storeName) {
      storeName = line;
    }

    // Tentar pegar data
    if (!receiptDate && /\d{2}\/\d{2}\/\d{4}/.test(line)) {
      const match = line.match(/\d{2}\/\d{2}\/\d{4}/);
      if (match) receiptDate = match[0];
    }

    switch (type) {
      case "total": {
        const value = parseBrazilianMoney(line);
        if (value != null) {
          rawTotalFromReceipt = value;
        }
        break;
      }

      case "item": {
        // Pega o uúltimo numero com padrao de preco como valor
        const priceMatch =
          line.match(/r?\$\s*([\d.,]+)/i)?.[1] ||
          line.match(/([\d.,]+)\s*$/)?.[1];

        const value = priceMatch ? parseBrazilianMoney(priceMatch) : null;
        if (value == null) break;

        // Descricao = linha sem o valor
        const description = priceMatch ? line.replace(priceMatch, "").trim() : line.trim();

        const item: ParsedReceiptItem = {
          description: description || line,
          value,
        };

        items.push(item);
        lastItem = item;
        break;
      }

      case "discount": {
        const value = parseBrazilianMoney(line);
        if (value != null && lastItem) {
          // Tratamos desconto como valor negativo ligado ao uúltimo item
          lastItem.value = Number((lastItem.value + value).toFixed(2));
          lastItem.isDiscount = true;
        }
        break;
      }

      // "Troco", "Total pago" e "Forma de pagamento" sao ignorados como itens
      case "paid":
      case "change":
      case "payment_method":
      case "header":
      case "footer":
      default:
        // ignorar
        break;
    }
  });

  // Soma dos itens
  const itemsTotal = Number(
    items.reduce((sum, item) => sum + item.value, 0).toFixed(2)
  );

  // Aviso se o total do cupom nao bater com a soma dos itens
  if (rawTotalFromReceipt != null && Math.abs(itemsTotal - rawTotalFromReceipt) > 0.05) {
    warnings.push(
      `A soma dos itens (R$ ${itemsTotal.toFixed(
        2
      )}) e diferente do total do cupom (R$ ${rawTotalFromReceipt.toFixed(
        2
      )}). Confira se alguma linha nao foi lida corretamente (ex: troco, desconto, forma de pagamento).`
    );
  }

  return {
    storeName,
    date: receiptDate,
    rawTotalFromReceipt,
    itemsTotal,
    items,
    warnings,
    rawText,
  };
}
