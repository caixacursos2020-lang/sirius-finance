// src/services/aiScanner.ts
const convertFileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Não foi possível converter o arquivo para base64."));
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo do cupom."));
    reader.readAsDataURL(file);
  });

export const scanReceiptWithAI = async (file: File) => {
  const base64Image = await convertFileToBase64(file);
  const endpoint = "/.netlify/functions/scan-receipt";

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imageBase64: base64Image,
      mimeType: file.type || "image/jpeg",
    }),
  });

  const text = await response.text();

  if (!response.ok) {
    try {
      const data = JSON.parse(text);
      const msg = data?.error || data?.detail || text || `Erro ${response.status}`;
      throw new Error(msg);
    } catch {
      throw new Error(text || `Erro ${response.status}`);
    }
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Resposta da IA não é JSON válido.");
  }
};

export default scanReceiptWithAI;
