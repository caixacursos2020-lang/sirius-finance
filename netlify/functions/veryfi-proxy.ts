const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const stripDataUrlPrefix = (value: string) => {
  const marker = "base64,";
  const idx = value.indexOf(marker);
  return idx >= 0 ? value.slice(idx + marker.length) : value;
};

type VeryfiRequestBody = {
  fileName?: string;
  fileDataBase64?: string;
};

export const handler = async (event: {
  httpMethod?: string;
  body?: string | null;
}) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, message: "Metodo nao permitido." }),
    };
  }

  if (!event.body) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, message: "Body ausente." }),
    };
  }

  let payload: VeryfiRequestBody;
  try {
    payload = JSON.parse(event.body) as VeryfiRequestBody;
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ ok: false, message: "JSON invalido." }),
    };
  }

  const fileName = payload.fileName || "receipt.jpg";
  const fileDataBase64 = payload.fileDataBase64;

  if (!fileDataBase64) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        message: "Imagem do cupom nao informada.",
      }),
    };
  }

  const clientId = process.env.VERYFI_CLIENT_ID;
  const clientSecret = process.env.VERYFI_CLIENT_SECRET;
  const username = process.env.VERYFI_USERNAME;
  const apiKey = process.env.VERYFI_API_KEY;

  if (!clientId || !clientSecret || !apiKey) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        message: "Variaveis de ambiente da Veryfi nao configuradas.",
      }),
    };
  }

  const cleanedBase64 = stripDataUrlPrefix(fileDataBase64);
  const buffer = Buffer.from(cleanedBase64, "base64");
  const encodedBase64 = buffer.toString("base64");

  const body = {
    file_name: fileName,
    file_data: encodedBase64,
    auto_delete: true,
  };

  try {
    const response = await fetch(
      "https://api.veryfi.com/api/v8/partner/documents/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Client-Id": clientId,
          "Client-Secret": clientSecret,
          Authorization: `apikey ${apiKey}`,
          ...(username ? { "X-User-Email": username } : {}),
        },
        body: JSON.stringify(body),
      },
    );

    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      return {
        statusCode: response.status,
        headers: corsHeaders,
        body: JSON.stringify({
          ok: false,
          message: "Falha ao processar imagem na Veryfi.",
          details: data,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ ok: true, data }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        ok: false,
        message: "Erro ao chamar a Veryfi.",
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
