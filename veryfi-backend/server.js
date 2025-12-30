require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { processReceiptWithVeryfi } = require("./veryfiClient");

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());

const uploadFolder = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || "";
    cb(null, unique + ext);
  },
});

const upload = multer({ storage });

app.get("/", (req, res) => {
  res.json({ ok: true, message: "Veryfi backend rodando." });
});

app.post("/api/veryfi/receipt", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      ok: false,
      message: "Nenhum arquivo foi enviado.",
    });
  }

  console.log("📂 Arquivo recebido do frontend:", req.file.originalname, "->", req.file.path);

  try {
    const result = await processReceiptWithVeryfi(req.file.path);

    return res.json({
      ok: true,
      raw: result.raw,
      summary: result.summary,
    });
  } catch (error) {
    const status = error.status || error.response?.status || 500;
    const veryfiData = error.veryfi || error.response?.data || null;

    console.error(
      "❌ Erro na rota /api/veryfi/receipt:",
      error.message,
      veryfiData ? JSON.stringify(veryfiData, null, 2) : ""
    );

    return res.status(status).json({
      ok: false,
      message:
        veryfiData?.message ||
        error.message ||
        "Erro interno ao processar o cupom.",
      veryfi: veryfiData,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Veryfi backend ouvindo na porta ${PORT}`);
});
