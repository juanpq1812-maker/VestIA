// Cliente de Gemini 3.1 Flash-Lite Image ("Nano Banana 2 Lite", Google
// Generative Language API) para StrandIA. Se usa SOLO para reconstruir
// prendas recortadas de una foto de outfit completo
// (source='outfit_extraction') — ver
// src/app/wardrobe/upload/garmentReconstructionActions.ts.
//
// IMPORTANTE: este archivo NO se debe importar desde Client Components. La
// API key (`GEMINI_API_KEY`) es secreta y vive solo del lado del servidor —
// mismo patrón que ANTHROPIC_API_KEY en aiClient.ts. Es una key nueva,
// distinta de la `GOOGLE_GEMINI_API_KEY` que el proyecto dejó de usar (ver
// nota en .env.local.example): esta es solo para generación/edición de
// imagen, no para texto.

// Modelo preview de Google — mismo endpoint/formato generateContent que
// gemini-2.5-flash-image (contents/parts de entrada, inlineData/mimeType de
// salida), solo cambia el nombre del modelo. Si Google lo deprecia o lo
// renombra, el fallback a crop + Remove.bg en burstQueue.ts ya cubre el
// flujo sin romper nada — revisar disponibilidad si suben las tasas de
// "generation_failed" en los logs.
const GEMINI_MODEL = "gemini-3.1-flash-lite-image";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const TIMEOUT_MS = 30_000;

// Rango razonable para descartar respuestas vacías/corruptas sin depender de
// una librería de imágenes (el proyecto no tiene ninguna instalada).
const MIN_IMAGE_BYTES = 3 * 1024;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

function getGeminiApiKey(): string {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key.trim().length === 0) {
    throw new Error(
      "Falta GEMINI_API_KEY. Pega tu API key en `.env.local` (mira `.env.local.example`) y reinicia el servidor."
    );
  }
  return key;
}

type GeminiPart = {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
};

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  error?: { message?: string };
};

export type GeneratedImage = { base64: string; mimeType: string };

/** Chequea los magic bytes iniciales para confirmar que es un PNG o JPEG real. */
function looksLikeValidImage(bytes: Uint8Array): boolean {
  if (bytes.length < MIN_IMAGE_BYTES || bytes.length > MAX_IMAGE_BYTES) return false;
  const isPng =
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return isPng || isJpeg;
}

/**
 * Manda una imagen + prompt de edición a Gemini 3.1 Flash-Lite Image y
 * devuelve la imagen generada. Nunca lanza fuera del try/catch — cualquier
 * falla (error de API, timeout, respuesta sin imagen, imagen inválida)
 * devuelve `null` para que el caller decida el fallback (ver burstQueue.ts).
 */
export async function callGeminiImageEdit(args: {
  imageBase64: string;
  imageMimeType: string;
  prompt: string;
}): Promise<GeneratedImage | null> {
  let apiKey: string;
  try {
    apiKey = getGeminiApiKey();
  } catch {
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${apiKey}`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: args.prompt },
              {
                inline_data: {
                  mime_type: args.imageMimeType,
                  data: args.imageBase64,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const rawErrorText = await response.text().catch(() => "");
      console.error(`[geminiClient] HTTP ${response.status}`, rawErrorText.slice(0, 300));
      return null;
    }

    const data = (await response.json()) as GeminiResponse;
    const parts = data.candidates?.[0]?.content?.parts ?? [];

    for (const part of parts) {
      const inline = part.inlineData ?? part.inline_data;
      const base64 = inline?.data;
      const mimeType = (inline as { mimeType?: string; mime_type?: string } | undefined)
        ?.mimeType ?? (inline as { mime_type?: string } | undefined)?.mime_type;
      if (!base64 || !mimeType) continue;

      const bytes = Buffer.from(base64, "base64");
      if (!looksLikeValidImage(bytes)) continue;

      return { base64, mimeType };
    }

    return null;
  } catch (err) {
    console.error("[geminiClient] error llamando a Gemini:", err);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
