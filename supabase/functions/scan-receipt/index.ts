import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const apiKey =
  Deno.env.get("GEMINI_API_KEY") ||
  Deno.env.get("GOOGLE_API_KEY") ||
  "";

const preferredModel = Deno.env.get("GEMINI_MODEL");
const modelCandidates = [
  preferredModel,
  // Gemini 1.5 foi descontinuado. Preferir 2.5+.
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
].filter(Boolean) as string[];

const prompt = `
You are a receipt data extractor for Brazilian receipts.

Return ONLY valid JSON (no markdown) with exactly this structure:
{
  "storeName": "Store name",
  "date": "YYYY-MM-DD",
  "total": 0,
  "items": [
    {
      "description": "Item name",
      "quantity": 1,
      "unitPrice": 0,
      "total": 0
    }
  ]
}

Rules:
- If a field is unreadable, use null.
- Do not invent items that are not clear.
- Return only JSON.
`;

const apiBase = "https://generativelanguage.googleapis.com/v1";

const listAvailableModels = async () => {
  const response = await fetch(`${apiBase}/models?key=${apiKey}`);
  if (!response.ok) return [] as string[];
  const data = await response.json();
  const models = Array.isArray(data?.models) ? data.models : [];
  return models
    .filter((m: any) =>
      Array.isArray(m?.supportedGenerationMethods)
        ? m.supportedGenerationMethods.includes("generateContent")
        : false,
    )
    .map((m: any) => String(m.name || "").replace(/^models\//, ""))
    .filter(Boolean);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY not configured." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  let body: { imageBase64?: string; mimeType?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const imageBase64Raw = body?.imageBase64;
  if (!imageBase64Raw || typeof imageBase64Raw !== "string") {
    return new Response(
      JSON.stringify({ error: "Missing imageBase64." }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const mimeType =
    typeof body?.mimeType === "string" && body.mimeType
      ? body.mimeType
      : "image/jpeg";

  const cleanBase64 = imageBase64Raw
    .replace(/^data:[^;]+;base64,?/, "")
    .replace(/\s+/g, "");

  try {
    const available = await listAvailableModels();
    const candidates = modelCandidates.filter((m) =>
      available.length ? available.includes(m) : true,
    );

    if (!candidates.length && available.length) {
      candidates.push(available[0]);
    }

    if (!candidates.length) {
      return new Response(
        JSON.stringify({ error: "No available Gemini models found." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    let lastError = "Gemini request failed.";

    for (const model of candidates) {
      const response = await fetch(
        `${apiBase}/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: cleanBase64,
                    },
                  },
                ],
              },
            ],
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        lastError = data?.error?.message || lastError;
        continue;
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text) {
        lastError = "Empty AI response.";
        continue;
      }

      const cleanJson = text.replace(/```/g, "").replace(/json/gi, "").trim();

      let parsed: unknown;
      try {
        parsed = JSON.parse(cleanJson);
      } catch {
        lastError = "Invalid JSON from AI.";
        continue;
      }

      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        error: "Gemini request failed",
        detail: `${lastError} (models tried: ${candidates.join(", ")})`,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Failed to process image.", detail: message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
