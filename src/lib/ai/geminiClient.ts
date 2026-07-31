// Cliente de Gemini 3.1 Flash-Lite Image ("Nano Banana 2 Lite", Google
// Generative Language API) para StrandIA. Cubre todo el pipeline de imagen
// de subida de prendas: reconstrucción (garmentReconstructionActions.ts) y
// remoción de fondo simple (backgroundRemovalActions.ts) — Remove.bg se dio
// de baja, ya no hay una ruta que no pase por Gemini.
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
// renombra, el fallback de última línea en burstQueue.ts/UploadForm.tsx
// (guardar la foto original con background_removed=false) ya cubre el flujo
// sin romper nada — revisar disponibilidad si suben las tasas de
// "generation_failed" en los logs.
const GEMINI_MODEL = "gemini-3.1-flash-lite-image";
/** Se exporta para que la auditoría (ai_image_calls) registre el modelo real. */
export const GEMINI_IMAGE_MODEL = GEMINI_MODEL;
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

type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  candidatesTokensDetails?: Array<{ modality?: string; tokenCount?: number }>;
};

type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: GeminiPart[] } }>;
  usageMetadata?: GeminiUsageMetadata;
  error?: { message?: string };
};

// Precios oficiales del paid tier standard, USD por 1M de tokens
// (https://ai.google.dev/gemini-api/docs/pricing). Verificados contra el
// usageMetadata real: una imagen de 1K son 1.120 tokens = $0.0336, que es el
// 98% del costo de una llamada. Si Google cambia la tarifa, cambiar acá — las
// filas ya escritas en ai_image_calls conservan el costo del momento.
const PRICE_INPUT_PER_M = 0.25;
const PRICE_OUTPUT_TEXT_PER_M = 1.5;
const PRICE_OUTPUT_IMAGE_PER_M = 30.0;

export type GeminiImageUsage = {
  promptTokens: number;
  imageTokens: number;
  textTokens: number;
  costUsd: number;
};

export type GeneratedImage = { base64: string; mimeType: string };

/**
 * Resultado de una llamada de edición de imagen. `usage` viene incluso cuando
 * la llamada NO produjo imagen: si Gemini respondió 200 sin parte de imagen,
 * igual factura el input y el thinking — ese es justamente el gasto que hoy se
 * pierde de vista. Es null solo cuando no hubo respuesta de la API (timeout,
 * error de red, HTTP != 200).
 */
export type GeminiImageResult =
  | { ok: true; image: GeneratedImage; usage: GeminiImageUsage | null }
  | { ok: false; reason: string; usage: GeminiImageUsage | null };

function parseUsage(u: GeminiUsageMetadata | undefined): GeminiImageUsage | null {
  if (!u) return null;
  const promptTokens = u.promptTokenCount ?? 0;
  const imageTokens = (u.candidatesTokensDetails ?? [])
    .filter((d) => d.modality === "IMAGE")
    .reduce((s, d) => s + (d.tokenCount ?? 0), 0);
  // Lo que no es imagen en la salida es texto/thinking, que se cobra distinto.
  const textTokens = Math.max(0, (u.candidatesTokenCount ?? 0) - imageTokens);
  const costUsd =
    (promptTokens / 1e6) * PRICE_INPUT_PER_M +
    (imageTokens / 1e6) * PRICE_OUTPUT_IMAGE_PER_M +
    (textTokens / 1e6) * PRICE_OUTPUT_TEXT_PER_M;
  return { promptTokens, imageTokens, textTokens, costUsd };
}

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
 * devuelve la imagen generada. Nunca lanza — cualquier falla (error de API,
 * timeout, respuesta sin imagen, imagen inválida) vuelve como
 * `{ ok: false, reason }` para que el caller decida el fallback (ver
 * burstQueue.ts) y pueda auditar el gasto (ver ai_image_calls).
 */
export async function callGeminiImageEdit(args: {
  imageBase64: string;
  imageMimeType: string;
  prompt: string;
}): Promise<GeminiImageResult> {
  let apiKey: string;
  try {
    apiKey = getGeminiApiKey();
  } catch {
    return { ok: false, reason: "missing_api_key", usage: null };
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
      return { ok: false, reason: `http_${response.status}`, usage: null };
    }

    const data = (await response.json()) as GeminiResponse;
    const usage = parseUsage(data.usageMetadata);
    const parts = data.candidates?.[0]?.content?.parts ?? [];

    for (const part of parts) {
      const inline = part.inlineData ?? part.inline_data;
      const base64 = inline?.data;
      const mimeType = (inline as { mimeType?: string; mime_type?: string } | undefined)
        ?.mimeType ?? (inline as { mime_type?: string } | undefined)?.mime_type;
      if (!base64 || !mimeType) continue;

      const bytes = Buffer.from(base64, "base64");
      if (!looksLikeValidImage(bytes)) continue;

      return { ok: true, image: { base64, mimeType }, usage };
    }

    // 200 pero sin imagen usable. OJO: esto SÍ se factura (input + thinking),
    // por eso el usage viaja igual.
    console.error("[geminiClient] respuesta 200 sin imagen usable");
    return { ok: false, reason: "no_image_in_response", usage };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    console.error("[geminiClient] error llamando a Gemini:", err);
    return { ok: false, reason: aborted ? "timeout" : "network_error", usage: null };
  } finally {
    clearTimeout(timeout);
  }
}
