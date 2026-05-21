// Cliente de IA para StrandIA, usando la API oficial de Anthropic.
//
// IMPORTANTE: este archivo NO se debe importar desde Client Components. La API
// key (`ANTHROPIC_API_KEY`) es secreta y vive solo del lado del servidor. Si
// Next.js detecta que un Client Component lee esta variable, fallara el build
// — y aunque no fallara, expondria la key al navegador.
//
// Modelo: leemos `AI_MODEL` del entorno (variable opcional). El default es
// `claude-haiku-4-5-20251001`. Para cambiar a otro modelo basta con setear
// `AI_MODEL=...` en `.env.local` y reiniciar.

/** Modelo por defecto: Claude Haiku (Anthropic). */
export const DEFAULT_AI_MODEL = "claude-haiku-4-5-20251001";

export function getAiModelName(): string {
  const fromEnv = process.env.AI_MODEL?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_AI_MODEL;
}

function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key.trim().length === 0) {
    throw new Error(
      "Falta ANTHROPIC_API_KEY. Pega tu API key en `.env.local` (mira `.env.local.example`) y reinicia el servidor."
    );
  }
  return key;
}

type AnthropicContentBlock = { type: string; text: string };

type AnthropicApiResponse = {
  content: AnthropicContentBlock[];
  stop_reason: string;
  error?: { message: string };
};

type AnthropicImageSource = {
  type: "base64";
  media_type: string;
  data: string;
};

/**
 * Llama a la API de Anthropic con un system prompt y un mensaje de usuario.
 * Lanza un error con `.status` si la respuesta HTTP no es 2xx.
 */
export async function callAnthropicApi(args: {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<string> {
  const apiKey = getAnthropicApiKey();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    cache: "no-store",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getAiModelName(),
      max_tokens: args.maxTokens ?? 1024,
      system: args.systemPrompt,
      messages: [{ role: "user", content: args.userPrompt }],
      ...(args.temperature !== undefined ? { temperature: args.temperature } : {}),
    }),
  });

  if (!response.ok) {
    const rawErrorText = await response.text().catch(() => "");
    let errBody: AnthropicApiResponse = {} as AnthropicApiResponse;
    try {
      errBody = JSON.parse(rawErrorText);
    } catch {
      // body no es JSON válido — lo logueamos igual
    }
    console.error(
      `[callAnthropicApi] HTTP ${response.status} desde Anthropic API`,
      { status: response.status, body: rawErrorText }
    );
    const httpError = new Error(
      errBody?.error?.message ?? `HTTP ${response.status}`
    );
    (httpError as Error & { status: number }).status = response.status;
    throw httpError;
  }

  const data = (await response.json()) as AnthropicApiResponse;
  return data.content?.[0]?.text ?? "";
}

/**
 * Llama a la API de Anthropic con una imagen (vision) y un texto de usuario.
 * Solo se debe usar desde Server Components o Server Actions.
 */
export async function callAnthropicVisionApi(args: {
  systemPrompt: string;
  userText: string;
  imageBase64: string;
  imageMimeType: string;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = getAnthropicApiKey();

  const imageSource: AnthropicImageSource = {
    type: "base64",
    media_type: args.imageMimeType,
    data: args.imageBase64,
  };

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    cache: "no-store",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getAiModelName(),
      max_tokens: args.maxTokens ?? 512,
      system: args.systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: imageSource },
            { type: "text", text: args.userText },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const rawErrorText = await response.text().catch(() => "");
    let errBody: AnthropicApiResponse = {} as AnthropicApiResponse;
    try {
      errBody = JSON.parse(rawErrorText);
    } catch {
      // body no es JSON válido
    }
    console.error(
      `[callAnthropicVisionApi] HTTP ${response.status} desde Anthropic API`,
      { status: response.status, body: rawErrorText }
    );
    const httpError = new Error(
      errBody?.error?.message ?? `HTTP ${response.status}`
    );
    (httpError as Error & { status: number }).status = response.status;
    throw httpError;
  }

  const data = (await response.json()) as AnthropicApiResponse;
  return data.content?.[0]?.text ?? "";
}
