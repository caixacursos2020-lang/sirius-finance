const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { processReceiptWithVeryfi } = require("./veryfiClient");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const app = express();
const PORT = process.env.PORT || 3333;

const uploadDir = path.resolve(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${unique}${ext}`);
  },
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());

app.post("/api/veryfi/receipt", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Envie o arquivo no campo 'file'." });
  }

  try {
    const veryfiResult = await processReceiptWithVeryfi(req.file.path);

    const resumo = {
      total: veryfiResult.total || veryfiResult.subtotal || null,
      data_compra:
        veryfiResult.date ||
        veryfiResult.created_date ||
        veryfiResult.ocr_date ||
        null,
      loja: veryfiResult.vendor?.name || veryfiResult.vendor?.address || null,
      itens: Array.isArray(veryfiResult.line_items)
        ? veryfiResult.line_items.map((item) => ({
            descricao: item.description || "",
            quantidade: item.quantity ?? 1,
            preco_unitario: item.unit_price ?? null,
            total_item: item.total ?? null,
            categoria: item.category || item.section || null,
          }))
        : [],
    };

    return res.json({ raw: veryfiResult, resumo });
  } catch (error) {
    console.error("[veryfi] erro ao processar:", error);
    return res.status(500).json({ error: "Falha ao processar o cupom", details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`API Veryfi ativa em http://localhost:${PORT}`);
});
