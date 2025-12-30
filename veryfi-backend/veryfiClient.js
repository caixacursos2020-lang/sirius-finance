const VeryfiClient = require("@veryfi/veryfi-sdk");
const path = require("path");
require("dotenv").config();

const clientId = process.env.VERYFI_CLIENT_ID;
const clientSecret = process.env.VERYFI_CLIENT_SECRET;
const username = process.env.VERYFI_USERNAME;
const apiKey = process.env.VERYFI_API_KEY;

if (!clientId || !clientSecret || !username || !apiKey) {
  console.warn("⚠️ VERYFI: faltando variáveis de ambiente. Verifique o arquivo .env");
}

// instancia do cliente Veryfi
const veryfi = new VeryfiClient(clientId, clientSecret, username, apiKey);

// helper: converte string/number BR/US -> number JS
function toNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string") {
    const normalized = value
      .trim()
      .replace(/[^0-9.,-]/g, "") // tira R$, espaços etc
      .replace(/\./g, "") // remove separador de milhar
      .replace(",", "."); // vírgula -> ponto

    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  }

  return 0;
}

function detectSuggestedCategory(doc) {
  const textBucket = [
    doc?.category,
    doc?.vendor?.category,
    doc?.vendor?.type,
    doc?.vendor?.name,
    doc?.vendor?.raw_name,
    doc?.vendor_name,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/farmacia|drug|pharm|drogaria/.test(textBucket)) return "farmacia";
  if (/mercado|market|supermarket|grocery/.test(textBucket)) return "mercado";
  return null;
}

// monta um resumo padronizado do documento do Veryfi
function buildReceiptSummary(doc) {
  const itens = Array.isArray(doc?.line_items)
    ? doc.line_items.map((item, index) => {
        const quantidadeRaw = item.quantity ?? item.qty ?? 1;

        const quantidade = Number.isFinite(Number(quantidadeRaw))
          ? Number(quantidadeRaw)
          : 1;

        const totalItem = toNumber(
          item.total ??
          item.line_total ??
          item.net_total ??
          (item.price && quantidade ? item.price * quantidade : 0)
        );

        const unitarioCalc =
          quantidade > 0
            ? totalItem / quantidade
            : toNumber(item.unit_price ?? item.price ?? 0);

        const valorUnitario = Number(unitarioCalc.toFixed(2));
        const total = Number(totalItem.toFixed(2));

        return {
          // formato interno que o frontend vai usar direto
          id: item.id ?? index + 1,
          descricao: item.description || item.text || "Item",
          quantidade,
          valorUnitario,
          total,

          // campos extras de compatibilidade se precisar no futuro
          unit_price: valorUnitario,
          line_total: total,
          raw: item,
        };
      })
    : [];

  const totalCupom = toNumber(
    doc.total ??
    doc.total_amount ??
    doc.subtotal ??
    doc.net_total ??
    0
  );

  const totalItens = itens.reduce((acc, it) => acc + (it.total || 0), 0);
  const suggestedCategory = detectSuggestedCategory(doc);

  return {
    loja:
      doc.vendor?.name ||
      doc.vendor?.raw_name ||
      doc.vendor_name ||
      doc.bill_to_name ||
      "",
    data_compra: doc.date || doc.created_date || null,
    total_cupom: Number(totalCupom.toFixed(2)),
    moeda: doc.currency_code || "BRL",
    itens,
    total_itens: Number(totalItens.toFixed(2)),
    suggestedCategory,
  };
}

// função principal chamada pelo servidor
async function processReceiptWithVeryfi(filePath) {
  const abs = path.resolve(filePath);
  console.log("📄 Enviando arquivo para a Veryfi:", abs);

  try {
    const doc = await veryfi.process_document(abs);
    console.log(
      "✅ Veryfi ok. Total:",
      doc.total,
      "| Itens:",
      Array.isArray(doc.line_items) ? doc.line_items.length : 0
    );

    const summary = buildReceiptSummary(doc);

    console.log("🔎 Resumo final enviado ao frontend:", JSON.stringify(summary, null, 2));

    return { raw: doc, summary };
  } catch (error) {
    const status = error?.response?.status;
    const data = error?.response?.data;

    console.error(
      "❌ Erro na Veryfi:",
      status,
      data ? JSON.stringify(data, null, 2) : error.message
    );

    const err = new Error(data?.message || error.message || "Erro ao chamar Veryfi");
    err.status = status || 500;
    err.veryfi = data || null;
    throw err;
  }
}

module.exports = {
  processReceiptWithVeryfi,
};
