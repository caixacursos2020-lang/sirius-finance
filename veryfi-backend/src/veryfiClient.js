const VeryfiClient = require("@veryfi/veryfi-sdk");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const {
  VERYFI_CLIENT_ID,
  VERYFI_CLIENT_SECRET,
  VERYFI_USERNAME,
  VERYFI_API_KEY,
} = process.env;

if (!VERYFI_CLIENT_ID || !VERYFI_CLIENT_SECRET || !VERYFI_USERNAME || !VERYFI_API_KEY) {
  console.warn(
    "[veryfi] Variáveis de ambiente ausentes. Preencha .env com VERYFI_CLIENT_ID, VERYFI_CLIENT_SECRET, VERYFI_USERNAME e VERYFI_API_KEY."
  );
}

const client = new VeryfiClient(
  VERYFI_CLIENT_ID || "",
  VERYFI_CLIENT_SECRET || "",
  VERYFI_USERNAME || "",
  VERYFI_API_KEY || ""
);

async function processReceiptWithVeryfi(filePath) {
  const absolutePath = path.resolve(filePath);
  const response = await client.process_document(absolutePath);
  return response;
}

module.exports = { processReceiptWithVeryfi };
