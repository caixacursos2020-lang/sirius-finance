import jsQR from "jsqr";

/**
 * Tenta decodificar QR code a partir de um File (foto do cupom).
 * Estratégia:
 *  1) Redimensiona a imagem para no máximo 1000px em qualquer lado (pra não ficar gigante).
 *  2) Tenta ler:
 *     - a imagem inteira
 *     - só o terço inferior
 *     - o quarto inferior direito (onde costuma ficar o QR da NFC-e)
 */
export async function decodeQrFromFile(file: File): Promise<string | null> {
  // Cria o bitmap da imagem
  const imageBitmap = await createImageBitmap(file);

  // Limite máximo de tamanho para o canvas (pra não estourar memória)
  const MAX_SIZE = 1000;
  const scale = Math.min(
    MAX_SIZE / imageBitmap.width,
    MAX_SIZE / imageBitmap.height,
    1
  );

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    console.error("Não foi possível obter contexto 2D do canvas para ler o QR.");
    return null;
  }

  const context = ctx;

  canvas.width = Math.floor(imageBitmap.width * scale);
  canvas.height = Math.floor(imageBitmap.height * scale);

  context.drawImage(
    imageBitmap,
    0,
    0,
    imageBitmap.width,
    imageBitmap.height,
    0,
    0,
    canvas.width,
    canvas.height
  );

  // Função auxiliar para tentar ler uma região da imagem
  function tryDecodeRegion(
    sx: number,
    sy: number,
    sw: number,
    sh: number
  ): string | null {
    const imageData = context.getImageData(sx, sy, sw, sh);
    const result = jsQR(imageData.data, imageData.width, imageData.height);
    if (result) {
      return result.data;
    }
    return null;
  }

  const w = canvas.width;
  const h = canvas.height;

  // Regiões que vamos tentar (em ordem):
  const regions: Array<[number, number, number, number]> = [
    // 1) Imagem inteira
    [0, 0, w, h],
    // 2) Terço inferior
    [0, Math.floor(h * 0.6), w, Math.floor(h * 0.4)],
    // 3) Quarto inferior direito
    [Math.floor(w * 0.5), Math.floor(h * 0.5), Math.floor(w * 0.5), Math.floor(h * 0.5)],
  ];

  for (const [sx, sy, sw, sh] of regions) {
    try {
      const decoded = tryDecodeRegion(sx, sy, sw, sh);
      if (decoded) {
        return decoded;
      }
    } catch (err) {
      console.warn("Erro tentando ler região do QR:", err);
      // continua tentando nas outras regiões
    }
  }

  return null;
}
