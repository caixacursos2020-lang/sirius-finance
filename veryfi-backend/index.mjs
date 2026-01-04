import express from "express";
import cors from "cors";
import multer from "multer";
import dotenv from "dotenv";
import VeryfiClient from "@veryfi/veryfi-sdk";

// Lê o .env que está dentro de veryfi-backend
dotenv.config();

const clientId = process.env.VERYFI_CLIENT_ID;
const clientSecret = process.env.VERYFI_CLIENT_SECRET;
const username = process.env.VERYFI_USERNAME;
const apiKey = process.env.VERYFI_API_KEY;

if (!clientId || !clientSecret || !username || !apiKey) {
  console.error(
    "[Veryfi] Variáveis de ambiente não encontradas. Confira o .env dentro de veryfi-backend."
  );
  process.exit(1);
}

// Instancia o cliente exatamente como a doc oficial manda
const veryfiClient = new VeryfiClient(
  clientId,
  clientSecret,
  username,
  apiKey
);

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

app.post("/veryfi", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Arquivo 'file' não enviado" });
    }

    // Converte o arquivo para base64 (somente o conteúdo)
    const base64 = req.file.buffer.toString("base64");

    // Usa a função correta da SDK: process_document_from_base64
    const result = await veryfiClient.process_document_from_base64(
      base64,
      req.file.originalname || "cupom.jpg",
      [],   // categories (não estamos usando)
      true, // auto_delete no Veryfi
      {}    // kwargs extra
    );

    // Padroniza no formato esperado pelo frontend (ok + summary)
    const summary = {
      loja: result.vendor?.name || result.vendor?.display_name || "Cupom",
      data_compra: result.date || result.created || null,
      total_cupom: result.total ?? result.subtotal ?? null,
      moeda: result.currency_code ?? null,
      itens: (result.line_items || []).map((item, idx) => ({
        id: item.id ?? idx,
        descricao: item.description || "Item",
        quantidade: item.quantity ?? item.qty ?? 1,
        valorUnitario: item.unit_price ?? item.price ?? null,
        total: item.total ?? item.line_total ?? null,
        unit_price: item.unit_price ?? item.price ?? null,
        line_total: item.total ?? item.line_total ?? null,
      })),
      total_itens: result.subtotal ?? null,
      suggestedCategory: result.category ?? null,
    };

    return res.json({
      ok: true,
      summary,
      raw: result,
    });
  } catch (err) {
    console.error("[Veryfi] Erro:", err?.response?.data || err.message || err);
    const statusCode = err?.response?.status || 500;
    const data = err?.response?.data || null;

    return res.status(statusCode).json({
      ok: false,
      error: "Veryfi failed",
      message: err.message || "Erro ao chamar Veryfi",
      details: data,
    });
  }
});

const PORT = 3333;
app.listen(PORT, () => {
  console.log(`Veryfi backend rodando em http://localhost:${PORT}/veryfi`);
});
