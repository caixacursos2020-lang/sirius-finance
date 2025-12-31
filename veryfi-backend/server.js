require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { processReceiptWithVeryfi } = require("./veryfiClient");

const app = express();
const PORT = process.env.PORT || 8787;

app.use(
  cors({
    origin: ["http://localhost:5173"],
    methods: ["GET", "POST", "OPTIONS"],
  })
);
app.use(express.json());

const uploadFolder = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadFolder),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || "";
    cb(null, unique + ext);
  },
});

const upload = multer({ storage });

app.get("/", (_req, res) => {
  res.json({ ok: true, message: "Veryfi backend rodando." });
});

// Rota principal esperada pelo frontend
app.post("/veryfi", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      ok: false,
      message: "Nenhum arquivo foi enviado.",
    });
  }

  console.log("[veryfi-backend] Arquivo recebido:", req.file.originalname, "->", req.file.path);

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
      "[veryfi-backend] Erro na rota /veryfi:",
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

// Rota antiga mantida por compatibilidade, redireciona para /veryfi
app.post("/api/veryfi/receipt", upload.single("file"), async (req, res) => {
  req.url = "/veryfi";
  req.originalUrl = "/veryfi";
  return app._router.handle(req, res);
});

app.listen(PORT, () => {
  console.log(`[veryfi-backend] ouvindo na porta ${PORT}`);
});
